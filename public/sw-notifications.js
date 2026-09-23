// Al tocar un aviso (p. ej. "Descanso terminado") se vuelve a la app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) if ('focus' in client) return client.focus()
      return self.clients.openWindow('/')
    }),
  )
})
