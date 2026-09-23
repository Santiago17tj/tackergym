import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Diálogo de confirmación sobre <dialog> nativo: accesible, con foco atrapado
 * y cierre con "atrás"/Escape sin dependencias extra.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        // Toque fuera del panel = cancelar
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border bg-card p-0 text-card-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-bold">{title}</h2>
          {children && <div className="text-sm text-muted-foreground">{children}</div>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
