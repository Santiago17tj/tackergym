import { CheckCircle2, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast, useToasts } from './store'

export function Toaster() {
  const toasts = useToasts()
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+var(--header-h)+0.5rem)] z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md flex-col gap-2"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className={cn(
            'toast-in pointer-events-auto flex items-center gap-3 rounded-md border px-3 py-2 text-left shadow-2xl shadow-black/60',
            t.tone === 'record' ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
          )}
        >
          {t.tone === 'record' ? (
            <Trophy className="size-5 shrink-0" />
          ) : (
            <CheckCircle2 className="size-5 shrink-0 text-success" />
          )}
          <span className="min-w-0">
            <span className="block text-sm font-bold">{t.title}</span>
            {t.description && (
              <span className={cn('block text-xs', t.tone === 'record' ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {t.description}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
