import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 border-y px-6 py-10 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="font-display text-2xl font-bold uppercase">{title}</h2>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}
