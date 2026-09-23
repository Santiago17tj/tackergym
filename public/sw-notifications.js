/* global self, indexedDB */
// Código propio del service worker (lo importa el SW generado por Workbox).

// Al tocar un aviso se vuelve a la app (o se abre si estaba cerrada).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) if ('focus' in client) return client.focus()
      return self.clients.openWindow('/')
    }),
  )
})

// ---------------------------------------------------------------------------
// Aviso "hoy toca entrenar" (Web Push). El servidor manda un aviso vacío; el
// texto se construye aquí con los datos locales, que nunca salen del teléfono.
// ---------------------------------------------------------------------------

function readAll(db, storeName) {
  return new Promise((resolve) => {
    try {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

function openLocalData() {
  return new Promise((resolve) => {
    // Sin versión: abre la existente sin provocar migraciones.
    const request = indexedDB.open('sobrecarga')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onupgradeneeded = () => {
      // No existía la base de datos: se cancela para no crearla vacía.
      request.transaction.abort()
      resolve(null)
    }
  })
}

async function buildTrainingReminder() {
  const fallback = { title: 'Hoy toca entrenar', body: 'Abre la app y empieza tu rutina.' }
  const db = await openLocalData()
  if (!db) return fallback
  try {
    const [settingsRows, routines, sessions] = await Promise.all([
      readAll(db, 'settings'),
      readAll(db, 'routines'),
      readAll(db, 'workoutSessions'),
    ])
    const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]))
    const name = typeof settings.displayName === 'string' ? settings.displayName.trim() : ''
    const startOfToday = new Date().setHours(0, 0, 0, 0)

    if (sessions.some((s) => s.status === 'active')) {
      return { title: name ? `${name}, tienes un entreno a medias` : 'Tienes un entreno a medias', body: 'Vuelve para terminarlo.' }
    }
    if (sessions.some((s) => s.status === 'completed' && s.startedAt >= startOfToday)) {
      return { title: name ? `Hoy ya entrenaste, ${name}` : 'Hoy ya entrenaste', body: 'Descansa y recupera. Mañana más.' }
    }

    // Rutina sugerida: la que hace más tiempo que no se hace (la misma lógica que la app).
    const lastDone = new Map()
    for (const s of sessions) {
      if (s.status === 'completed' && s.routineId && s.startedAt > (lastDone.get(s.routineId) || 0)) {
        lastDone.set(s.routineId, s.startedAt)
      }
    }
    const next = [...routines]
      .sort((a, b) => a.order - b.order)
      .reduce((best, r) => ((lastDone.get(r.id) ?? -1) < (best ? (lastDone.get(best.id) ?? -1) : Infinity) ? r : best), null)

    return {
      title: name ? `${name}, hoy toca entrenar` : 'Hoy toca entrenar',
      body: next ? `Siguiente rutina: ${next.name}` : fallback.body,
    }
  } finally {
    db.close()
  }
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  if (data.type && data.type !== 'training-reminder') return
  event.waitUntil(
    buildTrainingReminder()
      .catch(() => ({ title: 'Hoy toca entrenar', body: 'Abre la app y empieza tu rutina.' }))
      .then(({ title, body }) =>
        self.registration.showNotification(title, {
          body,
          tag: 'training-reminder',
          renotify: true,
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png',
        }),
      ),
  )
})

// Si el navegador renueva la suscripción, se vuelve a registrar con los mismos días y hora.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const options = event.oldSubscription && event.oldSubscription.options
      if (!options) return
      const subscription = await self.registration.pushManager.subscribe(options)
      const db = await openLocalData()
      if (!db) return
      const rows = await readAll(db, 'settings')
      db.close()
      const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]))
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          days: settings.trainingDays || [0, 2, 4],
          time: settings.reminderTime || '18:00',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      })
    })(),
  )
})
