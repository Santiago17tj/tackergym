import { ChevronRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { StatTile } from '@/components/history/StatTile'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { deleteWorkout } from '@/db'
import { useWeightUnit, useWorkoutDetail } from '@/hooks/useDb'
import { formatDayTime, formatDuration } from '@/lib/format'
import { formatWeight } from '@/lib/units'

export function WorkoutDetailPage() {
  const { id } = useParams()
  const detail = useWorkoutDetail(id)
  const unit = useWeightUnit()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (detail === undefined) return null
  if (detail === null) {
    return (
      <>
        <PageHeader title="Entrenamiento no encontrado" backTo="/historial" />
        <PageContainer>
          <p className="text-muted-foreground">Puede que se haya borrado.</p>
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <PageHeader title={detail.session.name} subtitle={formatDayTime(detail.session.startedAt)} backTo="/historial" />
      <PageContainer>
        <dl className="grid grid-cols-3 gap-2">
          <StatTile label="Duración" value={formatDuration(detail.durationMs)} />
          <StatTile label="Series" value={String(detail.completedSets)} />
          <StatTile label="Volumen" value={formatWeight(detail.volumeKg, unit, 0)} />
        </dl>

        {detail.blocks.map((block) => (
          <Card key={block.blockId} className="overflow-hidden">
            {block.exercise ? (
              <Link
                to={`/historial/ejercicio/${block.exercise.id}`}
                className="flex items-center justify-between gap-2 p-4 pb-2 active:bg-accent/50"
              >
                <h2 className="truncate text-lg font-bold">{block.exercise.name}</h2>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-label="Ver progreso" />
              </Link>
            ) : (
              <h2 className="p-4 pb-2 text-lg font-bold">Ejercicio eliminado</h2>
            )}
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="w-16 py-1 pl-4 text-left font-medium">Serie</th>
                  <th className="py-1 text-right font-medium">Peso</th>
                  <th className="py-1 text-right font-medium">Reps</th>
                  <th className="py-1 pr-4 text-right font-medium">Volumen</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {block.sets.map((set) => (
                  <tr key={set.id} className="border-t">
                    <td className="py-2 pl-4 font-semibold text-muted-foreground">{set.setNumber}</td>
                    <td className="py-2 text-right font-semibold">{formatWeight(set.weightKg ?? 0, unit)}</td>
                    <td className="py-2 text-right font-semibold">{set.reps}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">
                      {formatWeight((set.weightKg ?? 0) * (set.reps ?? 0), unit, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}

        <Button variant="ghost" className="mt-2 text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Borrar entrenamiento
        </Button>
      </PageContainer>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Borrar este entrenamiento?"
        confirmLabel="Borrar"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          const sessionId = detail.session.id
          navigate('/historial', { replace: true })
          await deleteWorkout(sessionId)
        }}
      >
        Se eliminarán sus {detail.completedSets} series y dejarán de contar para tus récords. No se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
