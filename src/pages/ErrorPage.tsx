import { AlertTriangle, RotateCcw } from 'lucide-react'
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 pt-safe pb-safe text-center">
      <AlertTriangle className="size-12 text-destructive" />
      <h1 className="text-xl font-bold">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        {isStorageError
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
