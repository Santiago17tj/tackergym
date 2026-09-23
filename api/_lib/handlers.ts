import { createHash } from 'node:crypto'
import { BadRequest, parsePlan, parseSubscription } from './validate.js'
import { isDue, localParts } from './schedule.js'
import type { PushStore, PushSubscriptionJSON, SubscriptionRecord, VapidKeys } from './types.js'

export type SendResult = { ok: true } | { ok: false; gone: boolean; status?: number }

export type PushDeps = {
  store: PushStore | null
  generateVapidKeys: () => VapidKeys
  send: (subscription: PushSubscriptionJSON, payload: string, vapid: VapidKeys) => Promise<SendResult>
  /** Verifica que la llamada al reloj viene de QStash o del cron autorizado. */
  authorizeTick: (request: Request, body: string) => Promise<boolean>
  /** Crea/actualiza el reloj de QStash (si está configurado). Mejor esfuerzo. */
  ensureSchedule: () => Promise<void>
  now: () => Date
}

const MAX_BODY_BYTES = 4096

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

const notConfigured = () =>
  json({ error: 'not-configured', message: 'Falta conectar Upstash Redis al proyecto en Vercel.' }, 503)

async function readBody(request: Request): Promise<string> {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) throw new BadRequest('Petición demasiado grande')
  return text
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = JSON.parse(await readBody(request))
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  } catch (e) {
    if (e instanceof BadRequest) throw e
  }
  throw new BadRequest('JSON no válido')
}

export const subscriptionId = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex').slice(0, 32)

async function vapidKeys(deps: PushDeps, store: PushStore): Promise<VapidKeys> {
  return (await store.getVapid()) ?? (await store.setVapidIfAbsent(deps.generateVapidKeys()))
}

function handleError(error: unknown): Response {
  if (error instanceof BadRequest) return json({ error: 'bad-request', message: error.message }, 400)
  console.error(error)
  return json({ error: 'server-error' }, 500)
}

export function createPushHandlers(deps: PushDeps) {
  return {
    /** GET /api/push/key → clave pública VAPID (se genera la primera vez). */
    async key(): Promise<Response> {
      if (!deps.store) return notConfigured()
      try {
        return json({ publicKey: (await vapidKeys(deps, deps.store)).publicKey })
      } catch (error) {
        return handleError(error)
      }
    },

    /** POST /api/push/subscribe → alta o actualización de días/hora. */
    async subscribe(request: Request): Promise<Response> {
      if (!deps.store) return notConfigured()
      try {
        const body = await readJson(request)
        const subscription = parseSubscription(body.subscription)
        const plan = parsePlan(body)
        const id = subscriptionId(subscription.endpoint)
        const existing = await deps.store.getSubscription(id)
        const now = deps.now().getTime()
        const record: SubscriptionRecord = {
          id,
          subscription,
          ...plan,
          lastSentDate: existing?.lastSentDate,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        await deps.store.saveSubscription(record)
        await deps.ensureSchedule().catch((e) => console.error('QStash', e))
        return json({ ok: true })
      } catch (error) {
        return handleError(error)
      }
    },

    /** DELETE /api/push/subscribe → baja. */
    async unsubscribe(request: Request): Promise<Response> {
      if (!deps.store) return notConfigured()
      try {
        const body = await readJson(request)
        if (typeof body.endpoint !== 'string') throw new BadRequest('Falta el endpoint')
        await deps.store.deleteSubscription(subscriptionId(body.endpoint))
        return json({ ok: true })
      } catch (error) {
        return handleError(error)
      }
    },

    /** POST /api/push/tick → envía los avisos que toquen ahora. Lo llama el reloj cada 5 min. */
    async tick(request: Request): Promise<Response> {
      if (!deps.store) return notConfigured()
      try {
        const body = await readBody(request)
        if (!(await deps.authorizeTick(request, body))) return json({ error: 'unauthorized' }, 401)
        const now = deps.now()
        const vapid = await vapidKeys(deps, deps.store)
        const due = (await deps.store.listSubscriptions()).filter((r) => isDue(r, now))
        let sent = 0
        let removed = 0
        for (const record of due) {
          // Aviso mínimo: el propio teléfono lo personaliza con sus datos locales.
          const result = await deps.send(record.subscription, JSON.stringify({ type: 'training-reminder' }), vapid)
          if (result.ok) {
            sent++
            const { dateKey } = localParts(now, record.timeZone)
            await deps.store.saveSubscription({ ...record, lastSentDate: dateKey })
          } else if (result.gone) {
            removed++
            await deps.store.deleteSubscription(record.id)
          }
        }
        return json({ ok: true, due: due.length, sent, removed })
      } catch (error) {
        return handleError(error)
      }
    },
  }
}
