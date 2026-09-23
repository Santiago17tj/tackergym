import { Loader2, Play, Plus, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { APP_TAGLINE } from '@/config/app'
import { startWorkout, WorkoutError, type WeightUnit, type WorkoutSummary } from '@/db'
import { useRoutineLastDone, useRoutinesWithExercises } from '@/hooks/useDb'
import { formatClock, formatRelativeDay } from '@/lib/format'
import { formatWeight } from '@/lib/units'

type LocationState = { summary?: WorkoutSummary; name?: string } | null

export function StartWorkout({ unit }: { unit: WeightUnit }) {
  const routines = useRoutinesWithExercises()
  const lastDone = useRoutineLastDone()
  const location = useLocation()
  const navigate = useNavigate()
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const state = location.state as LocationState

  async function start(routineId?: string) {
    setStarting(routineId ?? 'free')
    setError(null)
    try {
      await startWorkout({ routineId })
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(e instanceof WorkoutError ? e.message : 'No se pudo empezar el entrenamiento.')
    } finally {
      setStarting(null)
    }
  }

  return (
    <>
      <PageHeader title="Entrenar" subtitle={APP_TAGLINE} />
      <PageContainer>
        {state?.summary && (
          <Card className="relative border-primary/50 bg-primary/10 p-4">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => navigate('.', { replace: true, state: null })}
              className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
            >
              <X className="size-5" />
            </button>
            <p className="flex items-center gap-2 text-lg font-bold">
              <Trophy className="size-5 text-primary" /> ¡Entrenamiento guardado!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{state.name}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Duración" value={formatClock(state.summary.durationMs)} />
              <Stat label="Series" value={String(state.summary.completedSets)} />
              <Stat label="Volumen" value={formatWeight(state.summary.volumeKg, unit, 0)} />
            </dl>
          </Card>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {routines?.length === 0 && (
          <EmptyState icon={Play} title="No tienes rutinas" description="Crea una rutina o empieza un entrenamiento libre." />
        )}

        {routines?.map((routine) => {
          const last = lastDone?.get(routine.id)
          const names = routine.exercises.map((e) => e.exercise?.name).filter(Boolean)
          return (
            <Card key={routine.id} className="flex flex-col gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="truncate text-xl font-bold">{routine.name}</h2>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {last ? formatRelativeDay(last) : 'Sin hacer'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {names.length ? names.join(' · ') : 'Sin ejercicios'}
                </p>
              </div>
              <Button size="lg" onClick={() => start(routine.id)} disabled={starting !== null}>
                {starting === routine.id ? <Loader2 className="animate-spin" /> : <Play />} Empezar
              </Button>
            </Card>
          )
        })}

        <Button variant="secondary" size="lg" onClick={() => start()} disabled={starting !== null}>
          {starting === 'free' ? <Loader2 className="animate-spin" /> : <Plus />} Entrenamiento libre
        </Button>
        <Link to="/rutinas" className="py-2 text-center text-sm text-muted-foreground underline-offset-4 active:underline">
          Gestionar rutinas
        </Link>
      </PageContainer>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-background/60 px-1 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="tabular truncate text-base font-bold">{value}</dd>
    </div>
  )
}
