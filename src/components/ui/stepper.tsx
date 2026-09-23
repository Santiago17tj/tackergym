import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type StepperProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

/** Control −/+ con botones grandes: más rápido que teclear en el gimnasio. */
export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, className }: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-11 items-center overflow-hidden rounded-lg bg-secondary">
        <button
          type="button"
          aria-label={`Menos ${label.toLowerCase()}`}
          onClick={() => set(value - step)}
          disabled={value <= min}
          className="flex h-full w-11 shrink-0 items-center justify-center active:bg-accent disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="tabular flex-1 text-center text-base font-bold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Más ${label.toLowerCase()}`}
          onClick={() => set(value + step)}
          disabled={value >= max}
          className="flex h-full w-11 shrink-0 items-center justify-center active:bg-accent disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
