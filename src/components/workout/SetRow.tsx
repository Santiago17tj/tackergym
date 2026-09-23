import { Check, Trophy } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { NumericInput } from '@/components/ui/input'
import { setSetCompleted, updateSet, WorkoutError, type WeightUnit, type WorkoutSet } from '@/db'
import type { LastPerformance } from '@/db/history'
import { unlockAudio, vibrate } from '@/lib/alerts'
import { formatNumber, parseDecimal, toDisplayWeight, toStoredWeight } from '@/lib/units'
import { cn } from '@/lib/utils'

/** Columnas compartidas por la cabecera y las filas de la tabla de series. */
export const SET_GRID = 'grid grid-cols-[2rem_minmax(0,1fr)_4.75rem_4rem_3rem] items-center gap-2'

type SetRowProps = {
  set: WorkoutSet
  previous: LastPerformance['sets'][number] | undefined
  unit: WeightUnit
  repsPlaceholder: string | null
  /** Serie completada que supera el mejor peso histórico. */
  isRecord: boolean
  /** Primera serie pendiente del ejercicio actual: se resalta su ✓. */
  isNext: boolean
  onCompleted: (set: WorkoutSet) => void
}

const weightToText = (kg: number | null, unit: WeightUnit) => (kg === null ? '' : String(toDisplayWeight(kg, unit)))
const repsToText = (reps: number | null) => (reps === null ? '' : String(reps))

/**
 * Al salir del campo muestra lo que el usuario escribió ya normalizado
 * ("82," → "82", "7.6" reps → "8"), sin esperar a que IndexedDB responda.
 * Si no es un número válido, vuelve al valor guardado.
 */
function normalizeOnBlur(text: string, stored: string, integer = false): string {
  if (text.trim() === '') return ''
  const value = parseDecimal(text)
  if (value === null) return stored
  return String(integer ? Math.round(value) : Math.round(value * 100) / 100)
}

export const SetRow = memo(function SetRow({
  set,
  previous,
  unit,
  repsPlaceholder,
  isRecord,
  isNext,
  onCompleted,
}: SetRowProps) {
  const weightRef = useRef<HTMLInputElement>(null)
  const repsRef = useRef<HTMLInputElement>(null)
  const [weightText, setWeightText] = useState(() => weightToText(set.weightKg, unit))
  const [repsText, setRepsText] = useState(() => repsToText(set.reps))
  const [shake, setShake] = useState(false)
  const done = set.completedAt !== null

  // Si el valor cambia desde fuera (copiar "Anterior", cambio de unidad…),
  // se refleja salvo que el usuario esté escribiendo en ese campo.
  useEffect(() => {
    if (document.activeElement !== weightRef.current) setWeightText(weightToText(set.weightKg, unit))
  }, [set.weightKg, unit])
  useEffect(() => {
    if (document.activeElement !== repsRef.current) setRepsText(repsToText(set.reps))
  }, [set.reps])

  function onWeightChange(text: string) {
    setWeightText(text)
    const value = parseDecimal(text)
    if (text.trim() === '') void updateSet(set.id, { weightKg: null })
    else if (value !== null) void updateSet(set.id, { weightKg: toStoredWeight(value, unit) })
  }

  function onRepsChange(text: string) {
    setRepsText(text)
    const value = parseDecimal(text)
    if (text.trim() === '') void updateSet(set.id, { reps: null })
    else if (value !== null) void updateSet(set.id, { reps: value })
  }

  async function toggle() {
    unlockAudio() // dentro del gesto: permite que suene el fin del descanso en iOS
    try {
      const updated = await setSetCompleted(set.id, !done)
      if (!done) {
        vibrate(15)
        onCompleted(updated)
      }
    } catch (error) {
      if (!(error instanceof WorkoutError)) throw error
      setShake(true)
      repsRef.current?.focus()
    }
  }

  function copyPrevious() {
    if (!previous) return
    void updateSet(set.id, { weightKg: previous.weightKg, reps: previous.reps })
  }

  const previousText =
    previous && previous.reps !== null
      ? `${formatNumber(toDisplayWeight(previous.weightKg ?? 0, unit))} × ${previous.reps}`
      : '—'

  return (
    <div
      className={cn(
        SET_GRID,
        'rounded-lg px-1 py-1 transition-colors',
        done && (isRecord ? 'bg-primary/20' : 'bg-success/15'),
        isNext && 'bg-accent/60',
      )}
    >
      <span
        className={cn(
          'tabular flex justify-center text-base font-bold',
          done ? (isRecord ? 'text-primary' : 'text-success') : 'text-muted-foreground',
        )}
      >
        {isRecord ? (
          <Trophy className="size-5" aria-label={`Serie ${set.setNumber}: nuevo récord`} />
        ) : (
          set.setNumber
        )}
      </span>

      <button
        type="button"
        onClick={copyPrevious}
        disabled={!previous}
        className="tabular h-12 truncate rounded-md text-center text-sm text-muted-foreground active:bg-accent disabled:active:bg-transparent"
        aria-label={previous ? `Usar lo de la última vez: ${previousText}` : 'Sin datos de la última vez'}
      >
        {previousText}
      </button>

      <NumericInput
        ref={weightRef}
        value={weightText}
        onChange={(e) => onWeightChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setWeightText(normalizeOnBlur(weightText, weightToText(set.weightKg, unit)))}
        placeholder={previous?.weightKg != null ? String(toDisplayWeight(previous.weightKg, unit)) : unit}
        aria-label={`Peso serie ${set.setNumber} (${unit})`}
        className={cn('h-12 px-1', done && 'border-success/40')}
      />

      <NumericInput
        ref={repsRef}
        value={repsText}
        onChange={(e) => onRepsChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setRepsText(normalizeOnBlur(repsText, repsToText(set.reps), true))}
        onAnimationEnd={() => setShake(false)}
        enterKeyHint="done"
        placeholder={repsPlaceholder ?? 'reps'}
        aria-label={`Repeticiones serie ${set.setNumber}`}
        className={cn('h-12 px-1', done && 'border-success/40', shake && 'animate-shake border-destructive')}
      />

      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Serie ${set.setNumber} completada`}
        onClick={toggle}
        className={cn(
          'flex size-12 items-center justify-center rounded-lg transition-[background-color,transform] active:scale-90',
          done
            ? isRecord
              ? 'bg-primary text-primary-foreground'
              : 'bg-success text-black'
            : isNext
              ? 'bg-secondary text-primary ring-2 ring-primary'
              : 'bg-secondary text-muted-foreground',
        )}
      >
        <Check className="size-6" strokeWidth={3} />
      </button>
    </div>
  )
})
