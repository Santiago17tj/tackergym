import { Check, Pencil, Trophy } from 'lucide-react'
import { memo, useState } from 'react'
import { setSetCompleted, WorkoutError, type WeightUnit, type WorkoutSet } from '@/db'
import type { LastPerformance } from '@/db/history'
import { unlockAudio, vibrate } from '@/lib/alerts'
import { formatSet } from '@/lib/units'
import { cn } from '@/lib/utils'

type SetRowProps = {
  set: WorkoutSet
  previous: LastPerformance['sets'][number] | undefined
  unit: WeightUnit
  /** Rango de reps objetivo ("8–12"), para orientar cuando la serie está vacía. */
  repsTarget: string | null
  /** Serie completada que supera el mejor peso histórico. */
  isRecord: boolean
  /** Primera serie pendiente del ejercicio actual: se resalta. */
  isNext: boolean
  onEdit: (set: WorkoutSet) => void
  onCompleted: (set: WorkoutSet) => void
}

/**
 * Una serie: lo planificado a la izquierda (tocar para cambiarlo) y un botón
 * grande para marcarla hecha. Sin casillas de números a la vista.
 */
export const SetRow = memo(function SetRow({
  set,
  previous,
  unit,
  repsTarget,
  isRecord,
  isNext,
  onEdit,
  onCompleted,
}: SetRowProps) {
  const [busy, setBusy] = useState(false)
  const done = set.completedAt !== null
  const value = formatSet(set.weightKg, set.reps, unit)
  const previousText = previous ? formatSet(previous.weightKg, previous.reps, unit) : null

  async function toggle() {
    unlockAudio() // dentro del gesto: permite que suene el fin del descanso en iOS
    // Sin repeticiones no se puede marcar: se abre el editor directamente.
    if (!done && set.reps === null) {
      onEdit(set)
      return
    }
    setBusy(true)
    try {
      const updated = await setSetCompleted(set.id, !done)
      if (!done) {
        vibrate(15)
        onCompleted(updated)
      }
    } catch (error) {
      if (!(error instanceof WorkoutError)) throw error
      onEdit(set)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg p-1.5 transition-colors',
        done ? (isRecord ? 'bg-primary/15' : 'bg-success/10') : isNext ? 'bg-accent' : 'bg-transparent',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold',
          done
            ? isRecord
              ? 'bg-primary text-primary-foreground'
              : 'bg-success/20 text-success'
            : 'bg-secondary text-muted-foreground',
        )}
      >
        {isRecord ? <Trophy className="size-4" aria-label={`Serie ${set.setNumber}: nuevo récord`} /> : set.setNumber}
      </span>

      <button
        type="button"
        onClick={() => onEdit(set)}
        aria-label={`Serie ${set.setNumber}: ${value ?? 'sin apuntar'}. Tocar para cambiar`}
        className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 text-left active:bg-accent"
      >
        <span className="min-w-0">
          {value ? (
            <span
              className={cn(
                'tabular block font-display text-2xl leading-tight font-bold',
                done && 'text-muted-foreground',
              )}
            >
              {value}
            </span>
          ) : (
            <span className="block text-base font-medium text-muted-foreground">Toca para apuntar</span>
          )}
          <span className="block truncate text-xs text-muted-foreground">
            {previousText ? `Última vez: ${previousText}` : repsTarget ? `Objetivo: ${repsTarget} reps` : 'Primera vez'}
          </span>
        </span>
        {!done && <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      </button>

      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Serie ${set.setNumber} hecha`}
        onClick={toggle}
        disabled={busy}
        className={cn(
          'flex h-12 w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-[background-color,transform] active:scale-95',
          done
            ? isRecord
              ? 'bg-primary text-primary-foreground'
              : 'bg-success text-black'
            : isNext
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground',
        )}
      >
        <Check className="size-5" strokeWidth={3} aria-hidden />
        {done ? 'Hecha' : 'Marcar'}
      </button>
    </div>
  )
})
