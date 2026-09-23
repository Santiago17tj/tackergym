import { Check } from 'lucide-react'
import type { AddressForm } from '@/db'
import { ADDRESS_OPTIONS } from '@/lib/address'
import { cn } from '@/lib/utils'

/** Elección del trato: femenino, masculino o neutro. */
export function AddressPicker({ value, onChange }: { value: AddressForm; onChange: (value: AddressForm) => void }) {
  return (
    <div role="radiogroup" aria-label="Cómo prefieres que te hablemos" className="flex flex-col gap-2">
      {ADDRESS_OPTIONS.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-14 items-center justify-between gap-3 rounded-lg border px-4 py-2 text-left transition-colors',
              selected ? 'border-primary bg-primary/10' : 'active:bg-accent',
            )}
          >
            <span>
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-sm text-muted-foreground">{option.example}</span>
            </span>
            {selected && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
