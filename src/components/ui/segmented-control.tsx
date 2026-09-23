import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: string }

type SegmentedControlProps<T extends string> = {
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}

/** Selector tipo iOS: botones grandes, uno activo. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-secondary p-1', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-11 rounded-md text-base font-semibold transition-colors',
              active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground active:bg-accent',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
