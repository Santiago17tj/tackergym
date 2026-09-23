import { Client, Receiver } from '@upstash/qstash'
import webpush from 'web-push'
import type { PushDeps } from './handlers.js'
import { RedisPushStore } from './store.js'

const SCHEDULE_ID = 'sobrecarga-push-tick'

/** Dependencias reales (Upstash + web-push) a partir de las variables de entorno de Vercel. */
export function productionDeps(): PushDeps {
  return {
    store: RedisPushStore.fromEnv(),
    generateVapidKeys: () => webpush.generateVAPIDKeys(),
    now: () => new Date(),

    async send(subscription, payload, vapid) {
      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 60 * 60, // si el móvil está apagado, el aviso caduca en 1 h
          urgency: 'normal',
          vapidDetails: {
            subject: process.env.VAPID_SUBJECT ?? 'mailto:avisos@sobrecarga.app',
            publicKey: vapid.publicKey,
            privateKey: vapid.privateKey,
          },
        })
        return { ok: true }
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // 404/410: el navegador anuló la suscripción (app desinstalada, permisos retirados…)
        return { ok: false, gone: status === 404 || status === 410, status }
      }
    },

    async authorizeTick(request, body) {
      const current = process.env.QSTASH_CURRENT_SIGNING_KEY
      const next = process.env.QSTASH_NEXT_SIGNING_KEY
      const signature = request.headers.get('upstash-signature')
      if (current && next && signature) {
        try {
          return await new Receiver({ currentSigningKey: current, nextSigningKey: next }).verify({ signature, body })
        } catch {
          return false
        }
      }
      const secret = process.env.CRON_SECRET
      return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
    },

    async ensureSchedule() {
      const token = process.env.QSTASH_TOKEN
      const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
      if (!token || !host) return
      // Mismo scheduleId siempre: crea el reloj la primera vez y después solo lo actualiza.
      await new Client({ token }).schedules.create({
        scheduleId: SCHEDULE_ID,
        destination: `https://${host}/api/push/tick`,
        cron: '*/5 * * * *',
        method: 'POST',
      })
    },
  }
}
