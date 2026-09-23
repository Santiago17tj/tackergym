import type { PushSubscriptionJSON } from './types.js'

export class BadRequest extends Error {}

/**
 * Servicios de push de los navegadores. El servidor solo enviará peticiones a
 * estos dominios: evita que alguien lo use para hacer peticiones arbitrarias.
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge, Samsung Internet (Android)
  /^(.+\.)?push\.services\.mozilla\.com$/, // Firefox
  /^(.+\.)?push\.apple\.com$/, // Safari (iOS 16.4+ con la app instalada, macOS)
  /^(.+\.)?notify\.windows\.com$/, // Edge (Windows)
]

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/

export function isAllowedEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  return url.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(url.hostname))
}

export function parseSubscription(value: unknown): PushSubscriptionJSON {
  const sub = value as Partial<PushSubscriptionJSON> | null
  if (!sub || typeof sub.endpoint !== 'string' || sub.endpoint.length > 1000 || !isAllowedEndpoint(sub.endpoint)) {
    throw new BadRequest('Suscripción no válida')
  }
  const keys = sub.keys
  if (
    !keys ||
    typeof keys.p256dh !== 'string' ||
    typeof keys.auth !== 'string' ||
    !BASE64URL.test(keys.p256dh) ||
    !BASE64URL.test(keys.auth) ||
    keys.p256dh.length > 200 ||
    keys.auth.length > 100
  ) {
    throw new BadRequest('Claves de suscripción no válidas')
  }
  return { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
}

export function parsePlan(body: Record<string, unknown>): { days: number[]; time: string; timeZone: string } {
  const { days, time, timeZone } = body
  if (!Array.isArray(days) || days.length > 7 || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    throw new BadRequest('Días no válidos')
  }
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new BadRequest('Hora no válida')
  if (typeof timeZone !== 'string' || timeZone.length > 64) throw new BadRequest('Zona horaria no válida')
  try {
    new Intl.DateTimeFormat('en', { timeZone })
  } catch {
    throw new BadRequest('Zona horaria no válida')
  }
  return { days: [...new Set(days as number[])].sort(), time, timeZone }
}
