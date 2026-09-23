import { describe, expect, it, vi } from 'vitest'
import { createPushHandlers, subscriptionId, type PushDeps } from './handlers.js'
import { isDue, localParts } from './schedule.js'
import { MemoryPushStore } from './store.js'
import type { SubscriptionRecord } from './types.js'
import { isAllowedEndpoint, parsePlan, parseSubscription } from './validate.js'

const SUB = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' },
}

function makeRecord(overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return { id: 'x', subscription: SUB, days: [0, 2, 4], time: '18:00', timeZone: 'America/Bogota', createdAt: 0, updatedAt: 0, ...overrides }
}

describe('horario de avisos', () => {
  it('calcula día y hora locales en la zona del teléfono', () => {
    // 23:10 UTC del miércoles 23 sept 2026 = 18:10 en Bogotá (UTC-5) y 01:10 del jueves en Madrid
    const now = new Date(Date.UTC(2026, 8, 23, 23, 10))
    expect(localParts(now, 'America/Bogota')).toEqual({ dateKey: '2026-09-23', weekday: 2, minutes: 18 * 60 + 10 })
    expect(localParts(now, 'Europe/Madrid')).toMatchObject({ dateKey: '2026-09-24', weekday: 3, minutes: 70 })
  })

  it('avisa en la ventana tras la hora elegida, solo días de entreno y una vez al día', () => {
    const at = (h: number, m: number) => new Date(Date.UTC(2026, 8, 23, h + 5, m)) // hora de Bogotá, miércoles
    const record = makeRecord()
    expect(isDue(record, at(17, 59))).toBe(false)
    expect(isDue(record, at(18, 0))).toBe(true)
    expect(isDue(record, at(18, 14))).toBe(true)
    expect(isDue(record, at(18, 15))).toBe(false)
    expect(isDue({ ...record, lastSentDate: '2026-09-23' }, at(18, 5))).toBe(false)
    expect(isDue({ ...record, days: [1] }, at(18, 5))).toBe(false)
  })
})

describe('validación', () => {
  it('solo acepta servicios de push conocidos por https', () => {
    expect(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/x')).toBe(true)
    expect(isAllowedEndpoint('https://web.push.apple.com/abc')).toBe(true)
    expect(isAllowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(isAllowedEndpoint('http://fcm.googleapis.com/x')).toBe(false)
    expect(isAllowedEndpoint('https://evil.example.com/fcm.googleapis.com')).toBe(false)
    expect(isAllowedEndpoint('https://fcm.googleapis.com.evil.com/x')).toBe(false)
    expect(isAllowedEndpoint('https://169.254.169.254/latest')).toBe(false)
  })

  it('valida suscripción y plan', () => {
    expect(parseSubscription(SUB)).toEqual(SUB)
    expect(() => parseSubscription({ ...SUB, keys: { p256dh: '<script>', auth: 'a' } })).toThrow()
    expect(parsePlan({ days: [4, 0, 0], time: '07:30', timeZone: 'Europe/Madrid' })).toEqual({
      days: [0, 4],
      time: '07:30',
      timeZone: 'Europe/Madrid',
    })
    expect(() => parsePlan({ days: [7], time: '07:30', timeZone: 'UTC' })).toThrow()
    expect(() => parsePlan({ days: [0], time: '25:00', timeZone: 'UTC' })).toThrow()
    expect(() => parsePlan({ days: [0], time: '07:00', timeZone: 'Mars/Olympus' })).toThrow()
  })
})

describe('endpoints de push', () => {
  function setup(overrides: Partial<PushDeps> = {}) {
    const store = new MemoryPushStore()
    const send = vi.fn<PushDeps['send']>(async () => ({ ok: true }))
    const deps: PushDeps = {
      store,
      generateVapidKeys: vi.fn(() => ({ publicKey: 'PUB', privateKey: 'PRIV' })),
      send,
      authorizeTick: async (req) => req.headers.get('authorization') === 'Bearer secreto',
      ensureSchedule: vi.fn(async () => {}),
      now: () => new Date(Date.UTC(2026, 8, 23, 23, 5)), // miércoles 18:05 en Bogotá
      ...overrides,
    }
    return { store, send, deps, api: createPushHandlers(deps) }
  }
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request('https://app/api', { method: 'POST', body: JSON.stringify(body), headers })

  it('sin Upstash conectado responde 503 con explicación', async () => {
    const { api } = setup({ store: null })
    const res = await api.key()
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('not-configured')
  })

  it('genera las claves VAPID una sola vez', async () => {
    const { api, deps } = setup()
    expect(await (await api.key()).json()).toEqual({ publicKey: 'PUB' })
    await api.key()
    expect(deps.generateVapidKeys).toHaveBeenCalledTimes(1)
  })

  it('alta, aviso a su hora, un solo aviso por día y baja', async () => {
    const { api, store, send, deps } = setup()
    const plan = { subscription: SUB, days: [2], time: '18:00', timeZone: 'America/Bogota' }
    expect((await api.subscribe(post(plan))).status).toBe(200)
    expect(deps.ensureSchedule).toHaveBeenCalled()
    expect(store.subs.get(subscriptionId(SUB.endpoint))?.days).toEqual([2])

    expect((await api.tick(post({}))).status).toBe(401) // sin autorización
    const res = await api.tick(post({}, { authorization: 'Bearer secreto' }))
    expect(await res.json()).toMatchObject({ due: 1, sent: 1 })
    expect(send).toHaveBeenCalledWith(SUB, JSON.stringify({ type: 'training-reminder' }), { publicKey: 'PUB', privateKey: 'PRIV' })
    // El payload no lleva datos personales
    expect(send.mock.calls[0][1]).not.toMatch(/Sofía|Torso/)

    await api.tick(post({}, { authorization: 'Bearer secreto' }))
    expect(send).toHaveBeenCalledTimes(1)

    const del = new Request('https://app/api', { method: 'DELETE', body: JSON.stringify({ endpoint: SUB.endpoint }) })
    expect((await api.unsubscribe(del)).status).toBe(200)
    expect(store.subs.size).toBe(0)
  })

  it('actualizar el plan conserva el último aviso enviado', async () => {
    const { api, store } = setup()
    await api.subscribe(post({ subscription: SUB, days: [2], time: '18:00', timeZone: 'America/Bogota' }))
    await api.tick(post({}, { authorization: 'Bearer secreto' }))
    await api.subscribe(post({ subscription: SUB, days: [2, 4], time: '18:00', timeZone: 'America/Bogota' }))
    expect(store.subs.get(subscriptionId(SUB.endpoint))?.lastSentDate).toBe('2026-09-23')
  })

  it('borra suscripciones anuladas por el navegador (410)', async () => {
    const { api, store } = setup({ send: async () => ({ ok: false, gone: true, status: 410 }) })
    await api.subscribe(post({ subscription: SUB, days: [2], time: '18:00', timeZone: 'America/Bogota' }))
    expect(await (await api.tick(post({}, { authorization: 'Bearer secreto' }))).json()).toMatchObject({ removed: 1 })
    expect(store.subs.size).toBe(0)
  })

  it('rechaza endpoints fuera de los servicios de push y cuerpos enormes', async () => {
    const { api } = setup()
    const bad = await api.subscribe(post({ subscription: { ...SUB, endpoint: 'https://evil.example.com/x' }, days: [2], time: '18:00', timeZone: 'UTC' }))
    expect(bad.status).toBe(400)
    const huge = await api.subscribe(post({ junk: 'x'.repeat(10_000) }))
    expect(huge.status).toBe(400)
  })
})
