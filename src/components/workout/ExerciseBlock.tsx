import { ArrowDown, ArrowUp, MoreVertical, Minus, Plus, Timer, Trash2 } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Sheet, SheetAction } from '@/components/ui/sheet'
import {
  addSet,
  moveExerciseInWorkout,
  MUSCLE_GROUP_LABELS,
  removeExerciseFromWorkout,
  removeLastSet,
  type AppSettings,
  type WorkoutSet,
} from '@/db'
import type { LastPerformance } from '@/db/history'
import { restTimer } from '@/features/rest-timer/store'
import type { ActiveWorkoutBlock } from '@/hooks/useDb'
import { formatRepRange, formatRest } from '@/lib/format'
import { SET_GRID, SetRow } from './SetRow'

type ExerciseBlockProps = {
  sessionId: string
  item: ActiveWorkoutBlock
  index: number
  count: number
  last: LastPerformance | null | undefined
  settings: AppSettings
}

export const ExerciseBlock = memo(function ExerciseBlock({
  sessionId,
  item,
  index,
  count,
  last,
  settings,
}: ExerciseBlockProps) {
  const { block, exercise, sets } = item
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const name = exercise?.name ?? 'Ejercicio eliminado'
  const restSeconds = block.restSeconds ?? settings.defaultRestSeconds
  const repRange = formatRepRange(block.targetRepsMin, block.targetRepsMax)
  const doneCount = sets.filter((s) => s.completedAt !== null).length
  const autoStartRest = settings.autoStartRest

  const onCompleted = useCallback(
    (_set: WorkoutSet) => {
      if (autoStartRest) restTimer.start(restSeconds, name)
    },
    [autoStartRest, restSeconds, name],
  )

  const closeMenuAnd = (action: () => unknown) => () => {
    setMenuOpen(false)
    void action()
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight font-bold">{name}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {exercise && <span>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</span>}
            {repRange && <span>· Objetivo {repRange} reps</span>}
            <span className="inline-flex items-center gap-0.5">
              · <Timer className="size-3" /> {formatRest(restSeconds)}
            </span>
          </p>
        </div>
        <span className="tabular mt-0.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
          {doneCount}/{sets.length}
        </span>
        <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1" onClick={() => setMenuOpen(true)} aria-label={`Opciones de ${name}`}>
          <MoreVertical />
        </Button>
      </div>

      <div className="px-2">
        <div className={`${SET_GRID} px-1 pb-1 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase`}>
          <span>Serie</span>
          <span>Anterior</span>
          <span>{settings.weightUnit}</span>
          <span>Reps</span>
          <span aria-hidden>✓</span>
        </div>
        <div className="flex flex-col gap-1">
          {sets.map((set, i) => (
            <SetRow
              key={set.id}
              set={set}
              previous={last?.sets[i]}
              unit={settings.weightUnit}
              repsPlaceholder={repRange}
              onCompleted={onCompleted}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <Button variant="secondary" size="sm" onClick={() => removeLastSet(sessionId, block.id)} disabled={sets.length === 0}>
          <Minus /> Quitar serie
        </Button>
        <Button variant="secondary" size="sm" onClick={() => addSet(sessionId, block.id)}>
          <Plus /> Añadir serie
        </Button>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={name}>
        <div className="py-1">
          <SheetAction
            icon={<Timer />}
            label={`Iniciar descanso (${formatRest(restSeconds)})`}
            onClick={closeMenuAnd(() => restTimer.start(restSeconds, name))}
          />
          <SheetAction
            icon={<ArrowUp />}
            label="Mover arriba"
            disabled={index === 0}
            onClick={closeMenuAnd(() => moveExerciseInWorkout(sessionId, block.id, -1))}
          />
          <SheetAction
            icon={<ArrowDown />}
            label="Mover abajo"
            disabled={index === count - 1}
            onClick={closeMenuAnd(() => moveExerciseInWorkout(sessionId, block.id, 1))}
          />
          <SheetAction
            icon={<Trash2 />}
            label="Quitar ejercicio"
            destructive
            onClick={closeMenuAnd(() => (doneCount > 0 ? setConfirmRemove(true) : removeExerciseFromWorkout(sessionId, block.id)))}
          />
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmRemove}
        title={`¿Quitar ${name}?`}
        confirmLabel="Quitar"
        destructive
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false)
          void removeExerciseFromWorkout(sessionId, block.id)
        }}
      >
        Se perderán las {doneCount} series completadas de este ejercicio.
      </ConfirmDialog>
    </Card>
  )
})
