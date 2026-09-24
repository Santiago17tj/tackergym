import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, MoreVertical, Minus, Plus, Timer, Trash2 } from 'lucide-react'
import { memo, useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
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
import { toast } from '@/features/toast/store'
import type { ActiveWorkoutBlock } from '@/hooks/useDb'
import { vibrate } from '@/lib/alerts'
import { formatRepRange, formatRest } from '@/lib/format'
import { formatWeight } from '@/lib/units'
import { cn } from '@/lib/utils'
import { SetEditor } from './SetEditor'
import { SetRow } from './SetRow'

export type BlockStatus = 'done' | 'current' | 'upcoming'

type ExerciseBlockProps = {
  sessionId: string
  item: ActiveWorkoutBlock
  index: number
  count: number
  status: BlockStatus
  last: LastPerformance | null | undefined
  /** Mejor peso histórico (kg); 0 si nunca se hizo. */
  bestKg: number | undefined
  settings: AppSettings
}

export const ExerciseBlock = memo(function ExerciseBlock({
  sessionId,
  item,
  index,
  count,
  status,
  last,
  bestKg,
  settings,
}: ExerciseBlockProps) {
  const { block, exercise, sets } = item
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const onEdit = useCallback((set: WorkoutSet) => setEditingId(set.id), [])
  /** Mayor peso ya celebrado en esta sesión, para no repetir el aviso de récord. */
  const celebratedRef = useRef(0)

  const name = exercise?.name ?? 'Ejercicio eliminado'
  const restSeconds = block.restSeconds ?? settings.defaultRestSeconds
  const repRange = formatRepRange(block.targetRepsMin, block.targetRepsMax)
  const doneCount = sets.filter((s) => s.completedAt !== null).length
  const autoStartRest = settings.autoStartRest
  const unit = settings.weightUnit
  const displayName = settings.displayName.trim()
  const nextSetId = status === 'current' ? sets.find((s) => s.completedAt === null)?.id : undefined
  const best = bestKg ?? 0

  const onCompleted = useCallback(
    (set: WorkoutSet) => {
      const weight = set.weightKg ?? 0
      if (best > 0 && weight > best && weight > celebratedRef.current) {
        celebratedRef.current = weight
        vibrate([60, 40, 120])
        toast.show(displayName ? `Nuevo récord, ${displayName}` : 'Nuevo récord', {
          description: `${name}: ${formatWeight(weight, unit)} (antes ${formatWeight(best, unit)})`,
          tone: 'record',
        })
      }
      if (autoStartRest) restTimer.start(restSeconds, name)
    },
    [autoStartRest, restSeconds, name, best, unit, displayName],
  )

  const closeMenuAnd = (action: () => unknown) => () => {
    setMenuOpen(false)
    void action()
  }

  const isRecordSet = (set: WorkoutSet) => set.completedAt !== null && best > 0 && (set.weightKg ?? 0) > best

  // Ejercicio terminado y plegado: una línea con el resumen.
  if (status === 'done' && !expanded) {
    const maxKg = Math.max(0, ...sets.map((s) => s.weightKg ?? 0))
    const hasRecord = sets.some(isRecordSet)
    return (
      <Card id={`block-${block.id}`} className="scroll-mt-32">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          className="flex w-full items-center gap-3 rounded-xl p-3 text-left active:bg-accent/50"
        >
          <CheckCircle2 className="size-7 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{name}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {doneCount} series · máx. {formatWeight(maxKg, unit)}
              {hasRecord && <span className="font-semibold text-primary"> · récord</span>}
            </span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-label="Mostrar series" />
        </button>
      </Card>
    )
  }

  return (
    <Card
      id={`block-${block.id}`}
      className={cn('scroll-mt-32 overflow-hidden transition-shadow', status === 'current' && 'border-primary ring-1 ring-primary')}
    >
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {status === 'current' && (
              <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary-foreground">
                AHORA
              </span>
            )}
            {status === 'done' && <CheckCircle2 className="size-5 text-success" aria-label="Completado" />}
          </div>
          <h2 className="mt-1 text-lg leading-tight font-bold">{name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {exercise && <Chip>{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</Chip>}
            {repRange && <Chip>{repRange} reps</Chip>}
            <Chip>
              <Timer className="size-3" aria-hidden /> {formatRest(restSeconds)}
            </Chip>
            {best > 0 && <Chip>Récord {formatWeight(best, unit)}</Chip>}
          </div>
        </div>
        <span className="tabular mt-0.5 font-display text-xl leading-none font-bold text-muted-foreground">
          {doneCount}/{sets.length}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mt-1 -mr-1"
          onClick={() => setMenuOpen(true)}
          aria-label={`Opciones de ${name}`}
        >
          <MoreVertical />
        </Button>
      </div>

      <div className="px-2">
        <div className="flex flex-col gap-1">
          {sets.map((set, i) => (
            <SetRow
              key={set.id}
              set={set}
              previous={last?.sets[i]}
              unit={unit}
              repsTarget={repRange}
              isRecord={isRecordSet(set)}
              isNext={set.id === nextSetId}
              onEdit={onEdit}
              onCompleted={onCompleted}
            />
          ))}
        </div>
      </div>

      <SetEditor
        exerciseName={name}
        set={sets.find((s) => s.id === editingId) ?? null}
        previous={last?.sets[sets.findIndex((s) => s.id === editingId)]}
        unit={unit}
        repsTarget={repRange}
        barbell={exercise?.equipment === 'barbell'}
        onClose={() => setEditingId(null)}
        onCompleted={onCompleted}
      />

      <div className="grid grid-cols-2 gap-2 p-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => removeLastSet(sessionId, block.id)}
          disabled={sets.length === 0}
        >
          <Minus /> Quitar serie
        </Button>
        <Button variant="secondary" size="sm" onClick={() => addSet(sessionId, block.id)}>
          <Plus /> Añadir serie
        </Button>
      </div>
      {status === 'done' && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-full border-t py-3 text-sm font-medium text-muted-foreground active:bg-accent/50"
        >
          Plegar
        </button>
      )}

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
            onClick={closeMenuAnd(() =>
              doneCount > 0 ? setConfirmRemove(true) : removeExerciseFromWorkout(sessionId, block.id),
            )}
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
