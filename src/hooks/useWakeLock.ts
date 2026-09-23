import { useEffect } from 'react'

/**
 * Mantiene la pantalla encendida mientras `enabled` (entrenamiento activo),
 * para que el cronómetro y su pitido funcionen sin desbloquear el teléfono.
 * El navegador libera el bloqueo al salir de la app; se vuelve a pedir al regresar.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) await sentinel.release()
      } catch {
        // Denegado (batería baja, iframe…): no es crítico.
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      sentinel?.release().catch(() => {})
    }
  }, [enabled])
}
