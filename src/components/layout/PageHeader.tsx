import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

/** Cabecera "sticky" de cada pantalla, debajo del notch. */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 -mt-(--safe-top) border-b bg-background/90 pt-safe backdrop-blur-lg">
      <div className="mx-auto flex min-h-(--header-h) max-w-lg items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}
