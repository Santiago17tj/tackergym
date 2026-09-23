import { Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ProgressChart } from '@/components/history/ProgressChart'
import { StatTile } from '@/components/history/StatTile'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { MUSCLE_GROUP_LABELS } from '@/db'
import { useExercise, useExerciseStats, useWeightUnit } from '@/hooks/useDb'
import { formatDayTime } from '@/lib/format'
import { formatNumber, formatWeight, toDisplayWeight } from '@/lib/units'

const METRICS = [
  { value: 'max', label: 'Peso máx.' },
  { value: '1rm', label: '1RM est.' },
  { value: 'volume', label: 'Volumen' },
] as const

type Metric = (typeof METRICS)[number]['value']

const METRIC_TITLES: Record<Metric, string> = {
  max: 'Peso máximo por sesión',
  '1rm': '1RM estimado por sesión',
  volume: 'Volumen por sesión',
}

const compact = new Intl.NumberFormat('es', { maximumFractionDigits: 1, notation: 'compact' })

export function ExerciseDetailPage() {
  const { id } = useParams()
  const exercise = useExercise(id)
  const stats = useExerciseStats(id)
  const unit = useWeightUnit()
  const [metric, setMetric] = useState<Metric>('max')

  const points = useMemo(() => {
    if (!stats) return []
    return [...stats.sessions].reverse().map((s) => ({
      x: s.date,
      y: toDisplayWeight(metric === 'max' ? s.maxWeightKg : metric === '1rm' ? s.best1RMKg : s.volumeKg, unit),
    }))
  }, [stats, metric, unit])

  if (exercise === undefined || stats === undefined) return null
  if (exercise === null || stats === null) {
    return (
      <>
        <PageHeader title="Ejercicio no encontrado" backTo="/historial?vista=ejercicios" />
        <PageContainer>
          <p className="text-muted-foreground">Puede que se haya borrado.</p>
        </PageContainer>
      </>
    )
  }

  const { records } = stats

  return (
    <>
      <PageHeader title={exercise.name} subtitle={MUSCLE_GROUP_LABELS[exercise.muscleGroup]} backTo="/historial?vista=ejercicios" />
      <PageContainer>
        {records.sessionCount === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Todavía no has registrado series de este ejercicio.</p>
        ) : (
          <>
            <section aria-labelledby="records-title" className="flex flex-col gap-2">
              <h2 id="records-title" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                <Trophy className="size-4 text-primary" /> Récords
              </h2>
              <dl className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Peso máximo"
                  value={formatWeight(records.maxWeightKg, unit)}
                  detail={`× ${records.maxWeightReps} reps`}
                />
                <StatTile label="1RM estimado" value={formatWeight(records.best1RMKg, unit, 1)} detail="Fórmula de Epley" />
                <StatTile label="Máx. repeticiones" value={String(records.maxReps)} detail="en una serie" />
                <StatTile label="Mejor volumen" value={formatWeight(records.maxSessionVolumeKg, unit, 0)} detail="en una sesión" />
              </dl>
              <p className="tabular text-sm text-muted-foreground">
                Total: {formatWeight(records.totalVolumeKg, unit, 0)} · {records.totalSets} series · {records.sessionCount}{' '}
                {records.sessionCount === 1 ? 'sesión' : 'sesiones'}
              </p>
            </section>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{METRIC_TITLES[metric]}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <SegmentedControl label="Métrica de la gráfica" value={metric} options={METRICS} onChange={setMetric} />
                {points.length >= 2 ? (
                  <ProgressChart
                    points={points}
                    label={`${METRIC_TITLES[metric]} en ${unit}, ${points.length} sesiones. El detalle está en la lista de sesiones.`}
                    formatValue={(v) => compact.format(v)}
                    formatTooltip={(v) => `${formatNumber(v, 1)} ${unit}`}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    La gráfica aparecerá a partir de tu segunda sesión.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Valores en {unit}. Toca la gráfica para ver cada sesión.</p>
              </CardContent>
            </Card>

            <section aria-labelledby="sessions-title" className="flex flex-col gap-2">
              <h2 id="sessions-title" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Sesiones
              </h2>
              {stats.sessions.map((session) => {
                const isRecord = session.maxWeightKg === records.maxWeightKg && records.maxWeightKg > 0
                return (
                  <Link key={session.sessionId} to={`/historial/entreno/${session.sessionId}`}>
                    <Card className="p-3 active:bg-accent/50">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-semibold">{session.sessionName}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDayTime(session.date)}</span>
                      </div>
                      <p className="tabular mt-1 text-sm">
                        {session.sets
                          .map((s) => `${formatNumber(toDisplayWeight(s.weightKg ?? 0, unit))}×${s.reps}`)
                          .join('  ·  ')}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {isRecord && (
                          <span className="inline-flex items-center gap-1 font-semibold text-primary">
                            <Trophy className="size-3" /> Récord ·
                          </span>
                        )}
                        Máx. {formatWeight(session.maxWeightKg, unit)} · Volumen {formatWeight(session.volumeKg, unit, 0)}
                      </p>
                    </Card>
                  </Link>
                )
              })}
            </section>
          </>
        )}
      </PageContainer>
    </>
  )
}
