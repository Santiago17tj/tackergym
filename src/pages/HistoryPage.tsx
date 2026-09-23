import { ChevronRight, Dumbbell, History } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { StatTile } from '@/components/history/StatTile'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { MUSCLE_GROUP_LABELS } from '@/db'
import { useExercisesWithHistory, useWeightUnit, useWorkoutHistory } from '@/hooks/useDb'
import { formatDayTime, formatDuration, formatMonth, formatRelativeDay } from '@/lib/format'
import { formatWeight } from '@/lib/units'

const TABS = [
  { value: 'entrenos', label: 'Entrenamientos' },
  { value: 'ejercicios', label: 'Ejercicios' },
] as const

type Tab = (typeof TABS)[number]['value']

export function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('vista') === 'ejercicios' ? 'ejercicios' : 'entrenos'

  return (
    <>
      <PageHeader title="Historial" />
      <PageContainer>
        <SegmentedControl
          label="Vista del historial"
          value={tab}
          options={TABS}
          onChange={(value) => setParams(value === 'entrenos' ? {} : { vista: value }, { replace: true })}
        />
        {tab === 'entrenos' ? <WorkoutList /> : <ExerciseList />}
      </PageContainer>
    </>
  )
}

function WorkoutList() {
  const history = useWorkoutHistory()
  const unit = useWeightUnit()
  if (!history) return null

  if (history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Sin entrenamientos todavía"
        description="Cuando finalices un entrenamiento aparecerá aquí con su duración, series y volumen."
      />
    )
  }

  // Agrupa por mes (la lista ya viene de más reciente a más antiguo).
  const months: { month: string; items: typeof history }[] = []
  for (const item of history) {
    const month = formatMonth(item.session.startedAt)
    if (months.at(-1)?.month !== month) months.push({ month, items: [] })
    months.at(-1)!.items.push(item)
  }

  // Resumen del mes en curso
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonth = history.filter((h) => h.session.startedAt >= monthStart.getTime())
  const monthMinutes = thisMonth.reduce((sum, h) => sum + h.durationMs, 0)
  const monthVolume = thisMonth.reduce((sum, h) => sum + h.volumeKg, 0)

  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Resumen de este mes">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Este mes</h2>
        <dl className="mt-2 grid grid-cols-3 gap-2">
          <StatTile label="Entrenos" value={String(thisMonth.length)} />
          <StatTile label="Tiempo" value={formatDuration(monthMinutes)} />
          <StatTile label="Volumen" value={formatWeight(monthVolume, unit, 0)} />
        </dl>
      </section>
      {months.map(({ month, items }) => (
        <section key={month} aria-label={month} className="flex flex-col gap-3">
          <h2 className="mt-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{month}</h2>
          {items.map((item) => (
            <Link key={item.session.id} to={`/historial/entreno/${item.session.id}`}>
              <Card className="flex items-center gap-3 p-4 active:bg-accent/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate font-display text-2xl leading-tight font-bold">{item.session.name}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDayTime(item.session.startedAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{item.exerciseNames.join(' · ')}</p>
                  <p className="tabular mt-2 text-sm">
                    {formatDuration(item.durationMs)} · {item.completedSets} series · {formatWeight(item.volumeKg, unit, 0)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Card>
            </Link>
          ))}
        </section>
      ))}
    </div>
  )
}

function ExerciseList() {
  const exercises = useExercisesWithHistory()
  const unit = useWeightUnit()
  if (!exercises) return null

  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Sin récords todavía"
        description="Completa series en tus entrenamientos para ver aquí tus récords y tu progreso por ejercicio."
      />
    )
  }

  return (
    <Card className="divide-y">
      {exercises.map((item) => (
        <Link
          key={item.exercise.id}
          to={`/historial/ejercicio/${item.exercise.id}`}
          className="flex min-h-16 items-center gap-3 px-4 py-3 first:rounded-t-xl last:rounded-b-xl active:bg-accent/50"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{item.exercise.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {MUSCLE_GROUP_LABELS[item.exercise.muscleGroup]} · {item.sessionCount}{' '}
              {item.sessionCount === 1 ? 'sesión' : 'sesiones'} · {formatRelativeDay(item.lastDate)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular font-bold">{item.maxWeightKg > 0 ? formatWeight(item.maxWeightKg, unit) : '—'}</p>
            <p className="text-xs text-muted-foreground">máximo</p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ))}
    </Card>
  )
}
