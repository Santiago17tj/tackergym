import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Ocupa casi toda la pantalla (listas largas, buscador). */
  tall?: boolean
  className?: string
}

/** Hoja inferior (bottom sheet) sobre <dialog> nativo: al alcance del pulgar. */
export function Sheet({ open, onClose, title, children, tall, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={cn(
        'mx-auto mt-auto mb-0 w-full max-w-lg overflow-hidden rounded-t-2xl border border-b-0 bg-card p-0 text-card-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm',
        tall ? 'h-[92dvh] max-h-[92dvh]' : 'max-h-[85dvh]',
        className,
      )}
    >
      {open && (
        <div className={cn('flex max-h-[inherit] flex-col', tall && 'h-full')}>
          <div className="flex items-center justify-between gap-2 border-b py-2 pr-2 pl-4">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar">
              <X />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-safe">{children}</div>
        </div>
      )}
    </dialog>
  )
}

type SheetActionProps = {
  icon: ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

export function SheetAction({ icon, label, onClick, destructive, disabled }: SheetActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-14 w-full items-center gap-3 px-4 text-left text-base font-medium active:bg-accent disabled:opacity-40 [&_svg]:size-5',
        destructive && 'text-destructive',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
