import { Check, History, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NumericInput } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { setSetCompleted, updateSet, type WeightUnit, type WorkoutSet } from '@/db'
import type { LastPerformance } from '@/db/history'
import { unlockAudio, vibrate } from '@/lib/alerts'
import { formatNumber, formatSet, parseDecimal, toDisplayWeight, toStoredWeight } from '@/lib/units'

type SetEditorProps = {
  exerciseName: string
  set: WorkoutSet | null
  previous: LastPerformance['sets'][number] | undefined
  unit: WeightUnit
  repsTarget: string | null
  onClose: () => void
  onCompleted: (set: WorkoutSet) => void
}

/** Salto de los botones −/+ del peso: 2,5 kg o 5 lb (discos habituales). */
const WEIGHT_STEP = { kg: 2.5, lb: 5 } as const

/**
 * Panel para apuntar una serie con una mano: botones −/+ grandes y, si hace
 * falta, el número se puede escribir tocándolo.
 */
export function SetEditor({ exerciseName, set, previous, unit, repsTarget, onClose, onCompleted }: SetEditorProps) {
  return (
    <Sheet open={set !== null} onClose={onClose} title={set ? `Serie ${set.setNumber} · ${exerciseName}` : ''}>
      {set && (
        <EditorBody
          key={set.id}
          set={set}
          previous={previous}
          unit={unit}
          repsTarget={repsTarget}
          onClose={onClose}
          onCompleted={onCompleted}
        />
      )}
    </Sheet>
  )
}

function EditorBody({
  set,
  previous,
  unit,
  repsTarget,
  onClose,
  onCompleted,
}: Omit<SetEditorProps, 'exerciseName' | 'set'> & { set: WorkoutSet }) {
  const initialWeight = set.weightKg === null ? '' : String(toDisplayWeight(set.weightKg, unit))
  const [weightText, setWeightText] = useState(initialWeight)
  const [repsText, setRepsText] = useState(set.reps === null ? '' : String(set.reps))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const done = set.completedAt !== null

  const weight = parseDecimal(weightText) ?? 0
  const reps = parseDecimal(repsText)
  const step = WEIGHT_STEP[unit]

  const bumpWeight = (delta: number) => setWeightText(String(Math.max(0, Math.round((weight + delta) * 100) / 100)))
  const bumpReps = (delta: number) => setRepsText(String(Math.max(0, Math.round((reps ?? 0) + delta))))

  function applyPrevious() {
    if (!previous) return
    setWeightText(previous.weightKg ? String(toDisplayWeight(previous.weightKg, unit)) : '')
    setRepsText(previous.reps === null ? '' : String(previous.reps))
  }

  async function save(markDone: boolean) {
    unlockAudio()
    if (markDone && (reps === null || reps <= 0)) {
      setError('Indica cuántas repeticiones hiciste.')
      return
    }
    setSaving(true)
    try {
      await updateSet(set.id, {
        weightKg: weightText.trim() === '' ? null : toStoredWeight(weight, unit),
        reps: repsText.trim() === '' ? null : reps,
      })
      if (markDone && !done) {
        const updated = await setSetCompleted(set.id, true)
        vibrate(15)
        onCompleted(updated)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const previousText = previous ? formatSet(previous.weightKg, previous.reps, unit) : null

  return (
    <div className="flex flex-col gap-5 p-4">
      {previousText && (
        <button
          type="button"
          onClick={applyPrevious}
          className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-left active:bg-accent"
        >
          <History className="size-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">Igual que la última vez</span>
            <span className="block text-sm text-muted-foreground">{previousText}</span>
          </span>
        </button>
      )}

      <BigStepper
        label={`Peso (${unit})`}
        hint={`± ${formatNumber(step)} ${unit} · vacío = peso corporal`}
        value={weightText}
        onChange={setWeightText}
        onMinus={() => bumpWeight(-step)}
        onPlus={() => bumpWeight(step)}
        placeholder="0"
      />
      <BigStepper
        label="Repeticiones"
        hint={repsTarget ? `Objetivo: ${repsTarget}` : undefined}
        value={repsText}
        onChange={(v) => {
          setRepsText(v)
          setError(null)
        }}
        onMinus={() => bumpReps(-1)}
        onPlus={() => bumpReps(1)}
        placeholder={repsTarget ?? '0'}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" onClick={() => save(false)} disabled={saving}>
          Guardar
        </Button>
        <Button size="lg" onClick={() => save(!done)} disabled={saving}>
          <Check /> {done ? 'Guardar' : 'Hecha'}
        </Button>
      </div>
    </div>
  )
}

function BigStepper({
  label,
  hint,
  value,
  onChange,
  onMinus,
  onPlus,
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  onMinus: () => void
  onPlus: () => void
  placeholder: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onMinus}
          aria-label={`Menos ${label.toLowerCase()}`}
          className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary active:scale-95 active:bg-accent"
        >
          <Minus className="size-7" />
        </button>
        <NumericInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder={placeholder}
          aria-label={label}
          className="h-16 flex-1 font-display text-4xl"
        />
        <button
          type="button"
          onClick={onPlus}
          aria-label={`Más ${label.toLowerCase()}`}
          className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary active:scale-95 active:bg-accent"
        >
          <Plus className="size-7" />
        </button>
      </div>
    </div>
  )
}
