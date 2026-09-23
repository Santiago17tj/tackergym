import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

type PageHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  /** Muestra "atrás". Si no hay historial dentro de la app, va a esta ruta. */
  backTo?: string
  /** Contenido extra bajo la cabecera (p. ej. barra de progreso). */
  children?: ReactNode
}

/** Cabecera "sticky" de cada pantalla, debajo del notch. */
export function PageHeader({ title, subtitle, action, backTo, children }: PageHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    // location.key === 'default' → se entró directamente (enlace o recarga): no hay "atrás" propio.
    if (location.key !== 'default') navigate(-1)
    else navigate(backTo ?? '/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 -mt-(--safe-top) border-b bg-background/90 pt-safe backdrop-blur-lg">
      <div className="mx-auto flex min-h-(--header-h) max-w-lg items-center justify-between gap-2 px-4">
        {backTo && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Atrás"
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full active:bg-accent"
          >
            <ChevronLeft className="size-7" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[2rem] leading-none font-bold">{title}</h1>
          {subtitle && <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}
