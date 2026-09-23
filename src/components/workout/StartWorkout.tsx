import { Clock, Dumbbell, Flame, Layers, Loader2, Play, Plus, Timer, TrendingUp, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { startWorkout, WorkoutError, type AppSettings, type WorkoutSummary } from '@/db'
import { useHomeSummary, useRoutinesWithExercises, type RoutineWithExercises } from '@/hooks/useDb'
import { formatClock, formatRelativeDay } from '@/lib/format'
import { estimateRoutineMinutes, routineMuscleGroups } from '@/lib/routine-meta'
import { formatWeight } from '@/lib/units'
import { cn } from '@/lib/utils'

type LocationState = { summary?: WorkoutSummary; name?: string } | null

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const WELCOME_KEY = 'welcome-dismissed'

function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

const todayFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

function readWelcomeDismissed(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === '1'
  } catch {
    return false
  }
}

export function StartWorkout({ settings }: { settings: AppSettings }) {
  const routines = useRoutinesWithExercises()
  const home = useHomeSummary()
  const location = useLocation()
  const navigate = useNavigate()
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [welcomeDismissed, setWelcomeDismissed] = useState(readWelcomeDismissed)
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

  function dismissWelcome() {
    setWelcomeDismissed(true)
    try {
      localStorage.setItem(WELCOME_KEY, '1')
    } catch {
      // Sin almacenamiento: se volverá a mostrar, no pasa nada.
    }
  }

  const today = todayFormat.format(new Date())
  const suggested = loaded ? routines.find((r) => r.id === home.suggestedRoutineId) : undefined
  const others = loaded ? routines.filter((r) => r.id !== suggested?.id) : []
  const todayIndex = (new Date().getDay() + 6) % 7
  const showWelcome = loaded && !welcomeDismissed && home.totalWorkouts === 0

  return (
    <>
      <PageHeader title={greeting()} subtitle={today.charAt(0).toUpperCase() + today.slice(1)} />
      <PageContainer className="gap-5">
        {state?.summary && (
          <Card className="relative overflow-hidden border-primary/50 bg-gradient-to-br from-primary/20 to-card p-4">
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
              <SummaryStat label="Duración" value={formatClock(state.summary.durationMs)} />
              <SummaryStat label="Series" value={String(state.summary.completedSets)} />
              <SummaryStat label="Volumen" value={formatWeight(state.summary.volumeKg, settings.weightUnit, 0)} />
            </dl>
          </Card>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {showWelcome && <WelcomeCard onDismiss={dismissWelcome} />}

        {loaded && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Esta semana</h2>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Flame className={cn('size-4', home.weekStreak > 0 ? 'text-primary' : 'text-muted-foreground')} />
                {home.weekStreak > 0
                  ? `Racha: ${home.weekStreak} ${home.weekStreak === 1 ? 'semana' : 'semanas'}`
                  : 'Empieza tu racha'}
              </span>
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
                        'flex size-9 items-center justify-center rounded-full text-sm font-bold',
                        trained ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                        isToday && !trained && 'ring-2 ring-primary/70',
                      )}
                    >
                      {trained ? <Dumbbell className="size-4" /> : day}
                    </span>
                    <span className={cn('text-[11px]', isToday ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                      {isToday ? 'Hoy' : day}
                    </span>
                    <span className="sr-only">
                      {WEEKDAY_NAMES[i]}: {trained ? 'entrenado' : 'sin entrenar'}
                    </span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              {home.workoutsThisWeek === 0
                ? 'Aún no has entrenado esta semana.'
                : `${home.workoutsThisWeek} ${home.workoutsThisWeek === 1 ? 'entrenamiento' : 'entrenamientos'} esta semana. ¡Sigue así!`}
            </p>
          </Card>
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
            <h2 id="other-routines" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Otras rutinas
            </h2>
            <Card className="divide-y overflow-hidden">
              {others.map((routine) => {
                const last = home.lastDoneByRoutine.get(routine.id)
                return (
                  <div key={routine.id} className="flex items-center gap-3 p-3 pl-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{routine.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {routineMuscleGroups(routine.exercises).slice(0, 3).join(' · ') || 'Sin ejercicios'}
                        {' · '}
                        {last ? formatRelativeDay(last) : 'sin hacer'}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full"
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
    <section
      aria-labelledby="suggested-title"
      className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/25 via-card to-card p-5"
    >
      <Dumbbell aria-hidden className="absolute -top-4 -right-6 size-32 rotate-[-30deg] text-primary/10" />
      <p className="text-xs font-bold tracking-widest text-primary uppercase">Hoy toca</p>
      <h2 id="suggested-title" className="relative mt-1 text-3xl leading-tight font-extrabold tracking-tight">
        {routine.name}
      </h2>
      {groups.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <Chip key={g} className="bg-background/70">
              {g}
            </Chip>
          ))}
        </div>
      )}
      <dl className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Meta icon={<Layers />} label="Ejercicios" value={`${routine.exercises.length} ejercicios`} />
        <Meta icon={<TrendingUp />} label="Series" value={`${totalSets} series`} />
        <Meta icon={<Clock />} label="Duración estimada" value={`~${minutes} min`} />
      </dl>
      <p className="relative mt-2 text-xs text-muted-foreground">
        {lastDone ? `Última vez ${formatRelativeDay(lastDone)}` : 'Aún no la has hecho'}
      </p>
      <Button
        size="lg"
        className="relative mt-4 h-16 w-full text-xl"
        onClick={onStart}
        disabled={disabled || routine.exercises.length === 0}
      >
        {starting ? <Loader2 className="size-6 animate-spin" /> : <Play className="size-6 fill-current" />} Empezar
      </Button>
    </section>
  )
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 [&_svg]:size-4 [&_svg]:text-primary">
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { icon: <Play className="fill-current" />, title: 'Elige una rutina', text: 'Empieza con Push, Pull o Legs, o crea la tuya.' },
    { icon: <TrendingUp />, title: 'Registra tus series', text: 'Peso y reps se rellenan con tu última vez: intenta superarla.' },
    { icon: <Timer />, title: 'Descansa con el cronómetro', text: 'Al marcar ✓ arranca solo y te avisa al terminar.' },
  ]
  return (
    <Card className="relative p-4">
      <button
        type="button"
        aria-label="Cerrar bienvenida"
        onClick={onDismiss}
        className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
      >
        <X className="size-5" />
      </button>
      <h2 className="pr-10 text-lg font-bold">Así funciona</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sin internet y sin cuentas: tus datos se quedan en el teléfono.</p>
      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-5">
              {step.icon}
            </span>
            <span>
              <span className="block font-semibold">
                {i + 1}. {step.title}
              </span>
              <span className="block text-sm text-muted-foreground">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <Button variant="secondary" className="mt-4 w-full" onClick={onDismiss}>
        Entendido
      </Button>
    </Card>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-background/60 px-1 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="tabular truncate text-base font-bold">{value}</dd>
    </div>
  )
}
