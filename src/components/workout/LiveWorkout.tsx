import { Flag, Plus, Timer, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { addExerciseToWorkout, discardWorkout, finishWorkout, WorkoutError, type AppSettings } from '@/db'
import { restTimer } from '@/features/rest-timer/store'
import { useExerciseBests, useLastPerformances, type ActiveWorkout } from '@/hooks/useDb'
import { useNow } from '@/hooks/useNow'
import { formatClock } from '@/lib/format'
import { ExerciseBlock, type BlockStatus } from './ExerciseBlock'
import { ExercisePicker } from './ExercisePicker'

type LiveWorkoutProps = {
  workout: ActiveWorkout
  settings: AppSettings
}

export function LiveWorkout({ workout, settings }: LiveWorkoutProps) {
  const { session, blocks, completedSets, totalSets } = workout
  const navigate = useNavigate()
  const now = useNow(1000)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exerciseIds = useMemo(() => blocks.map((b) => b.block.exerciseId), [blocks])
  const lastPerformances = useLastPerformances(exerciseIds, session.id)
  const bests = useExerciseBests(exerciseIds)

  // Ejercicio actual = el primero con series pendientes.
  const currentIndex = blocks.findIndex((b) => b.sets.some((s) => s.completedAt === null))
  const statusOf = (i: number, done: boolean): BlockStatus =>
    i === currentIndex ? 'current' : done ? 'done' : 'upcoming'

  // Al terminar un ejercicio, lleva la vista al siguiente.
  const previousIndexRef = useRef(currentIndex)
  useEffect(() => {
    const previous = previousIndexRef.current
    previousIndexRef.current = currentIndex
    if (currentIndex > previous && previous !== -1) {
      const id = blocks[currentIndex]?.block.id
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (id) document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }
  }, [currentIndex, blocks])

  async function finish() {
    setBusy(true)
    try {
      const summary = await finishWorkout(session.id)
      restTimer.stop()
      navigate('/', { replace: true, state: { summary, name: session.name } })
    } catch (e) {
      setError(e instanceof WorkoutError ? e.message : 'No se pudo guardar el entrenamiento.')
    } finally {
      setBusy(false)
      setFinishOpen(false)
    }
  }

  async function discard() {
    setBusy(true)
    try {
      await discardWorkout(session.id)
      restTimer.stop()
    } finally {
      setBusy(false)
      setDiscardOpen(false)
    }
  }

  const pendingSets = totalSets - completedSets
  const progress = totalSets === 0 ? 0 : completedSets / totalSets
  const allDone = totalSets > 0 && pendingSets === 0
  const requestFinish = () => (completedSets > 0 ? setFinishOpen(true) : setDiscardOpen(true))

  return (
    <>
      <PageHeader
        title={session.name}
        subtitle={`${formatClock(now - session.startedAt)} · ${completedSets}/${totalSets} series`}
        action={
          <div className="flex shrink-0 gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Iniciar descanso"
              onClick={() => restTimer.start(settings.defaultRestSeconds)}
            >
              <Timer />
            </Button>
            <Button size="sm" onClick={requestFinish}>
              <Flag /> Finalizar
            </Button>
          </div>
        }
      >
        <div
          role="progressbar"
          aria-label="Series completadas"
          aria-valuemin={0}
          aria-valuemax={totalSets}
          aria-valuenow={completedSets}
          className="h-1 w-full bg-secondary"
        >
          <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
      </PageHeader>

      <PageContainer className="gap-3 px-2 pb-24">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {blocks.length === 0 && (
          <p className="px-4 py-8 text-center text-muted-foreground">
            Entrenamiento libre: añade tu primer ejercicio para empezar.
          </p>
        )}

        {blocks.map((item, i) => (
          <ExerciseBlock
            key={item.block.id}
            sessionId={session.id}
            item={item}
            index={i}
            count={blocks.length}
            status={statusOf(i, item.sets.length > 0 && item.sets.every((s) => s.completedAt !== null))}
            last={lastPerformances?.get(item.block.exerciseId)}
            bestKg={bests?.get(item.block.exerciseId)}
            settings={settings}
          />
        ))}

        <Button variant="outline" size="lg" onClick={() => setPickerOpen(true)}>
          <Plus /> Añadir ejercicio
        </Button>
        {blocks.length > 0 && (
          <Button
            size="lg"
            variant={allDone ? 'default' : 'secondary'}
            className="h-16 text-xl"
            onClick={requestFinish}
          >
            <Flag /> {allDone ? 'Todo hecho · finalizar' : 'Finalizar entrenamiento'}
          </Button>
        )}
        <Button variant="ghost" className="text-destructive" onClick={() => setDiscardOpen(true)}>
          <Trash2 /> Descartar entrenamiento
        </Button>
      </PageContainer>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(exercise) => void addExerciseToWorkout(session.id, exercise.id)}
      />

      <ConfirmDialog
        open={finishOpen}
        title="¿Finalizar entrenamiento?"
        confirmLabel="Guardar"
        busy={busy}
        onCancel={() => setFinishOpen(false)}
        onConfirm={finish}
      >
        {completedSets} series completadas en {formatClock(now - session.startedAt)}.
        {pendingSets > 0 && ` Las ${pendingSets} series sin marcar no se guardarán.`}
      </ConfirmDialog>

      <ConfirmDialog
        open={discardOpen}
        title="¿Descartar entrenamiento?"
        confirmLabel="Descartar"
        destructive
        busy={busy}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={discard}
      >
        {completedSets === 0
          ? 'Todavía no has completado ninguna serie. El entrenamiento se eliminará sin guardarse.'
          : `Se perderán las ${completedSets} series completadas.`}
      </ConfirmDialog>
    </>
  )
}
