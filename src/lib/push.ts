/**
 * Avisos "hoy toca entrenar" con la app cerrada (Web Push). El servidor solo
 * conoce la suscripción del navegador, los días, la hora y la zona horaria.
 */

export type PushStatus =
  | 'unsupported' // el navegador no admite Web Push
  | 'needs-install' // iPhone/iPad: solo funciona con la app añadida a la pantalla de inicio
  | 'denied' // permiso de notificaciones bloqueado
  | 'off'
  | 'on'

export type PushPlan = { days: number[]; time: string }

export type PushErrorCode = 'not-configured' | 'denied' | 'network' | 'unsupported'

export class PushError extends Error {
  readonly code: PushErrorCode
  constructor(code: PushErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function getPushStatus(): Promise<PushStatus> {
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return (await currentSubscription()) ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new PushError('network', 'Sin conexión. Inténtalo con internet.')
  }
  if (response.status === 503 || response.status === 404) {
    throw new PushError('not-configured', 'El servidor de avisos aún no está configurado.')
  }
  if (!response.ok) throw new PushError('network', 'El servidor de avisos no respondió. Inténtalo más tarde.')
  return response
}

function timeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

async function sendPlan(subscription: PushSubscription, plan: PushPlan): Promise<void> {
  await api('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: subscription.toJSON(), days: plan.days, time: plan.time, timeZone: timeZone() }),
  })
}

/** Pide permiso, se suscribe y registra días/hora en el servidor. Llamar desde un toque. */
export async function enablePush(plan: PushPlan): Promise<void> {
  if (!supported()) throw new PushError('unsupported', 'Este navegador no admite avisos.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushError('denied', 'Has bloqueado las notificaciones para esta app.')

  const { publicKey } = (await (await api('/api/push/key')).json()) as { publicKey: string }
  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    })
  }
  await sendPlan(subscription, plan)
}

/** Actualiza días/hora si ya hay suscripción. Silencioso si no la hay o no hay red. */
export async function syncPushPlan(plan: PushPlan): Promise<void> {
  if (!supported()) return
  const subscription = await currentSubscription().catch(() => null)
  if (subscription) await sendPlan(subscription, plan).catch(() => {})
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await api('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }).catch(() => {})
}
