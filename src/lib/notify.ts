/**
 * Avisos del sistema (notificaciones emergentes) para cuando la app está en
 * segundo plano: fin del descanso. Se muestran a través del service worker,
 * que es lo que admiten Android y las PWA instaladas en iOS 16.4+.
 */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Muestra un aviso del sistema si hay permiso y la app no está a la vista. */
export async function notifyIfHidden(title: string, body: string, tag: string): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  if (document.visibilityState === 'visible') return false
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      body,
      tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      requireInteraction: false,
    })
    return true
  } catch {
    return false
  }
}
