import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Etiqueta compacta neutra (grupo muscular, metadatos). */
export function Chip({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-sm border px-2 text-xs font-medium whitespace-nowrap text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
