import { useEffect, useState } from 'react'

/**
 * Hora actual que se refresca cada `intervalMs` (null = pausado). También se
 * actualiza al volver a la app, porque iOS congela los timers en segundo plano.
 */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (intervalMs === null) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])

  return now
}
