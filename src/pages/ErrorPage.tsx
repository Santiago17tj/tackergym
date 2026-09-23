import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

/** Pantalla de error (p. ej. IndexedDB bloqueado en modo privado). */
export function ErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error)
  const isStorageError = error instanceof Error && /IndexedDB|Database|Dexie|Quota/i.test(`${error.name} ${error.message}`)
  const isStaleChunk =
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(error.message)

  // Nueva versión desplegada y esta pestaña tenía la anterior: recarga automáticamente,
  // como mucho una vez cada 10 s para no entrar en bucle si el fallo persiste.
  useEffect(() => {
    if (!isStaleChunk) return
    try {
      const last = Number(sessionStorage.getItem('chunk-reload-at') ?? 0)
      if (Date.now() - last < 10_000) return
      sessionStorage.setItem('chunk-reload-at', String(Date.now()))
    } catch {
      return
    }
    window.location.reload()
  }, [isStaleChunk])

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 pt-safe pb-safe text-center">
      <AlertTriangle className="size-12 text-destructive" />
      <h1 className="text-xl font-bold">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        {isStaleChunk
          ? 'Hay una versión nueva de la app. Recarga para continuar; tus datos están a salvo.'
          : isStorageError
          ? 'No se pudo acceder al almacenamiento local. Si estás en modo privado/incógnito, abre la app en una ventana normal.'
          : 'Se produjo un error inesperado. Tus datos guardados no se han perdido.'}
      </p>
      <pre className="max-w-full overflow-x-auto rounded-md bg-secondary p-2 text-left text-xs">{message}</pre>
      <Button onClick={() => window.location.reload()}>
        <RotateCcw /> Recargar
      </Button>
    </div>
  )
}
