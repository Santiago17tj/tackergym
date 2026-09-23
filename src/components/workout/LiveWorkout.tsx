import { Flag, Plus, Timer, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { addExerciseToWorkout, discardWorkout, finishWorkout, WorkoutError, type AppSettings } from '@/db'
import { restTimer } from '@/features/rest-timer/store'
import { useLastPerformances, type ActiveWorkout } from '@/hooks/useDb'
import { useNow } from '@/hooks/useNow'
import { formatClock } from '@/lib/format'
import { ExerciseBlock } from './ExerciseBlock'
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
            <Button size="sm" onClick={() => (completedSets > 0 ? setFinishOpen(true) : setDiscardOpen(true))}>
              <Flag /> Finalizar
            </Button>
          </div>
        }
      />

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
            last={lastPerformances?.get(item.block.exerciseId)}
            settings={settings}
          />
        ))}

        <Button variant="outline" size="lg" onClick={() => setPickerOpen(true)}>
          <Plus /> Añadir ejercicio
        </Button>
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
