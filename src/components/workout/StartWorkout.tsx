import { Loader2, Play, Plus, Share2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { APP_NAME } from '@/config/app'
import { Card } from '@/components/ui/card'
import { startWorkout, WorkoutError, type AppSettings, type WorkoutSummary } from '@/db'
import { useHomeSummary, useRoutinesWithExercises, type RoutineWithExercises } from '@/hooks/useDb'
import { hello } from '@/lib/address'
import { formatClock, formatDuration, formatRelativeDay } from '@/lib/format'
import { estimateRoutineMinutes, routineMuscleGroups } from '@/lib/routine-meta'
import { whatsappUrl } from '@/lib/share'
import { formatWeight } from '@/lib/units'
import { cn } from '@/lib/utils'

type LocationState = { summary?: WorkoutSummary; name?: string } | null

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

const titleFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('es', { month: 'long' })

/** Semana ISO (lunes a domingo), como en un diario de entrenamiento. */
function isoWeek(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function StartWorkout({ settings }: { settings: AppSettings }) {
  const routines = useRoutinesWithExercises()
  const home = useHomeSummary()
  const location = useLocation()
  const navigate = useNavigate()
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const state = location.state as LocationState
  // No se pinta nada hasta tener los datos: evita saltos de diseño (CLS).
  const loaded = routines !== undefined && home !== undefined

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

  const now = new Date()
  const suggested = loaded ? routines.find((r) => r.id === home.suggestedRoutineId) : undefined
  const others = loaded ? routines.filter((r) => r.id !== suggested?.id) : []
  const todayIndex = (new Date().getDay() + 6) % 7
  const name = settings.displayName.trim()

  return (
    <>
      <PageHeader
        title={name ? hello(name) : capitalize(titleFormat.format(now).replace(',', ''))}
        subtitle={
          name
            ? `${capitalize(titleFormat.format(now).replace(',', ''))} de ${monthFormat.format(now)}`
            : `${capitalize(monthFormat.format(now))} · semana ${isoWeek(now)}`
        }
      />
      <PageContainer className="gap-5">
        {state?.summary && (
          <Card className="relative border-t-2 border-t-primary p-4">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => navigate('.', { replace: true, state: null })}
              className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
            >
              <X className="size-5" />
            </button>
            <p className="font-display text-2xl font-bold">{name ? `Buen trabajo, ${name}` : 'Buen trabajo'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{state.name}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <SummaryStat label="Duración" value={formatClock(state.summary.durationMs)} />
              <SummaryStat label="Series" value={String(state.summary.completedSets)} />
              <SummaryStat label="Volumen" value={formatWeight(state.summary.volumeKg, settings.weightUnit, 0)} />
            </dl>
            <a
              href={whatsappUrl(
                `Entrenamiento completado: ${state.name} 💪\n` +
                  `${formatDuration(state.summary.durationMs)} · ${state.summary.completedSets} series · ` +
                  `${formatWeight(state.summary.volumeKg, settings.weightUnit, 0)} de volumen\n` +
                  `(registrado con ${APP_NAME})`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'secondary' }), 'mt-3 w-full')}
            >
              <Share2 /> Compartir por WhatsApp
            </a>
          </Card>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loaded && (
          <section aria-labelledby="week-title">
            <div className="flex items-end justify-between gap-4">
              <h2 id="week-title" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Esta semana
              </h2>
              <dl className="flex gap-5 text-right">
                <div className="flex flex-row-reverse items-baseline gap-1.5">
                  <dt className="text-xs text-muted-foreground">
                    {home.workoutsThisWeek === 1 ? 'entreno' : 'entrenos'}
                  </dt>
                  <dd className="tabular font-display text-3xl leading-none font-bold">{home.workoutsThisWeek}</dd>
                </div>
                <div className="flex flex-row-reverse items-baseline gap-1.5">
                  <dt className="text-xs text-muted-foreground">
                    {home.weekStreak === 1 ? 'semana seguida' : 'semanas seguidas'}
                  </dt>
                  <dd className="tabular font-display text-3xl leading-none font-bold">{home.weekStreak}</dd>
                </div>
              </dl>
            </div>
            <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Días entrenados esta semana">
              {WEEKDAYS.map((day, i) => {
                const trained = home.weekDays[i]
                const isToday = i === todayIndex
                return (
                  <li key={day} className="flex flex-col items-center gap-1">
                    <span
                      aria-hidden
                      className={cn(
                        'block h-8 w-full rounded-sm',
                        trained ? 'bg-primary' : 'bg-secondary',
                        isToday && !trained && 'outline-2 outline-offset-1 outline-primary',
                      )}
                    />
                    <span
                      aria-hidden
                      className={cn('text-[11px] font-semibold', isToday ? 'text-foreground' : 'text-muted-foreground')}
                    >
                      {day}
                    </span>
                    <span className="sr-only">
                      {WEEKDAY_NAMES[i]}
                      {isToday ? ' (hoy)' : ''}: {trained ? 'entrenado' : 'sin entrenar'}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {loaded && suggested && (
          <SuggestedCard
            routine={suggested}
            lastDone={home.lastDoneByRoutine.get(suggested.id)}
            minutes={estimateRoutineMinutes(suggested.exercises, settings.defaultRestSeconds)}
            starting={starting === suggested.id}
            disabled={starting !== null}
            onStart={() => start(suggested.id)}
          />
        )}

        {loaded && routines.length === 0 && (
          <EmptyState icon={Play} title="No tienes rutinas" description="Crea una rutina o empieza un entrenamiento libre.">
            <Button className="mt-2" onClick={() => navigate('/rutinas/nueva')}>
              <Plus /> Crear rutina
            </Button>
          </EmptyState>
        )}

        {loaded && others.length > 0 && (
          <section aria-labelledby="other-routines" className="flex flex-col gap-2">
            <h2 id="other-routines" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Otras rutinas
            </h2>
            <Card className="divide-y overflow-hidden">
              {others.map((routine) => {
                const last = home.lastDoneByRoutine.get(routine.id)
                return (
                  <div key={routine.id} className="flex items-center gap-3 p-3 pl-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-2xl leading-tight font-bold">{routine.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {routineMuscleGroups(routine.exercises).slice(0, 3).join(' · ') || 'Sin ejercicios'}
                        {' · '}
                        {last ? formatRelativeDay(last) : 'sin hacer'}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-md"
                      aria-label={`Empezar ${routine.name}`}
                      disabled={starting !== null || routine.exercises.length === 0}
                      onClick={() => start(routine.id)}
                    >
                      {starting === routine.id ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
                    </Button>
                  </div>
                )
              })}
            </Card>
          </section>
        )}

        {loaded && (
          <div className="flex flex-col gap-1">
            <Button variant="outline" size="lg" onClick={() => start()} disabled={starting !== null}>
              {starting === 'free' ? <Loader2 className="animate-spin" /> : <Plus />} Entrenamiento libre
            </Button>
            <Link
              to="/rutinas"
              className="py-3 text-center text-sm text-muted-foreground underline-offset-4 active:underline"
            >
              Crear o editar rutinas
            </Link>
          </div>
        )}
      </PageContainer>
    </>
  )
}

function SuggestedCard({
  routine,
  lastDone,
  minutes,
  starting,
  disabled,
  onStart,
}: {
  routine: RoutineWithExercises
  lastDone: number | undefined
  minutes: number
  starting: boolean
  disabled: boolean
  onStart: () => void
}) {
  const groups = routineMuscleGroups(routine.exercises)
  const totalSets = routine.exercises.reduce((sum, e) => sum + e.targetSets, 0)
  return (
    <section aria-labelledby="suggested-title" className="border-y py-5">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        Siguiente · {lastDone ? `última vez ${formatRelativeDay(lastDone)}` : 'aún sin hacer'}
      </p>
      <h2 id="suggested-title" className="mt-1 font-display text-5xl leading-[0.95] font-bold">
        {routine.name}
      </h2>
      {groups.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{groups.join(' / ')}</p>}
      <dl className="mt-4 grid grid-cols-3 divide-x border-y">
        <Figure label="ejercicios" value={routine.exercises.length} />
        <Figure label="series" value={totalSets} />
        <Figure label="min aprox." value={minutes} />
      </dl>
      <Button
        size="lg"
        className="mt-4 h-16 w-full text-2xl"
        onClick={onStart}
        disabled={disabled || routine.exercises.length === 0}
      >
        {starting ? <Loader2 className="size-6 animate-spin" /> : <Play className="size-6 fill-current" />} Empezar
      </Button>
    </section>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse px-3 py-2 first:pl-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular font-display text-3xl leading-none font-bold">{value}</dd>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-md bg-secondary px-2 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="tabular truncate font-display text-2xl leading-none font-bold">{value}</dd>
    </div>
  )
}
