import { cn } from '@/lib/utils'

type StatTileProps = {
  label: string
  value: string
  detail?: string
  className?: string
}

/** Cifra con etiqueta (etiqueta arriba en el orden visual, valor como protagonista). */
export function StatTile({ label, value, detail, className }: StatTileProps) {
  return (
    <div className={cn('flex flex-col rounded-md bg-secondary px-3 py-2', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular truncate font-display text-2xl leading-tight font-bold">{value}</dd>
      {detail && <dd className="truncate text-xs text-muted-foreground">{detail}</dd>}
    </div>
  )
}
