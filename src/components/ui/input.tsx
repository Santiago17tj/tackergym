import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Input numérico para pesos/reps: abre el teclado decimal del móvil
 * (inputMode="decimal") sin los problemas de type="number" (comas, spinners).
 */
function NumericInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type' | 'inputMode'>) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      autoComplete="off"
      enterKeyHint="next"
      className={cn('tabular text-center text-lg font-semibold', className)}
      {...props}
    />
  )
}

export { Input, NumericInput }
