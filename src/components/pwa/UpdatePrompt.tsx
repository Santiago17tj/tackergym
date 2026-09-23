import { RefreshCw, X } from 'lucide-react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registra el Service Worker y avisa cuando hay una versión nueva.
 * La actualización nunca se aplica sola para no recargar la app
 * en mitad de un entrenamiento.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      setInterval(async () => {
        if (registration.installing || !navigator.onLine) return
        const res = await fetch(swUrl, { cache: 'no-store' }).catch(() => null)
        if (res?.status === 200) await registration.update()
      }, UPDATE_CHECK_INTERVAL_MS)
    },
  })

  // El aviso de "lista sin conexión" es informativo: se oculta solo.
  useEffect(() => {
    if (!offlineReady) return
    const id = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(id)
  }, [offlineReady, setOfflineReady])

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[calc(var(--safe-top)+var(--header-h)+0.5rem)] z-50 mx-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-card p-3 shadow-2xl shadow-black/50"
    >
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm">
          {needRefresh ? 'Hay una nueva versión disponible.' : 'Lista para usarse sin conexión.'}
        </p>
        {needRefresh && (
          <Button size="sm" onClick={() => updateServiceWorker(true)}>
            <RefreshCw /> Actualizar
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" onClick={close} aria-label="Cerrar">
          <X />
        </Button>
      </div>
    </div>
  )
}
