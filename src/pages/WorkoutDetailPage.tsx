import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { StatTile } from '@/components/history/StatTile'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { SetEditor } from '@/components/workout/SetEditor'
import { deleteHistorySet, deleteWorkout, updateWorkoutNotes, type WorkoutDetail, type WorkoutSet } from '@/db'
import { toast } from '@/features/toast/store'
import { useWeightUnit, useWorkoutDetail } from '@/hooks/useDb'
import { formatDayTime, formatDuration } from '@/lib/format'
import { formatSet, formatWeight } from '@/lib/units'

export function WorkoutDetailPage() {
  const { id } = useParams()
  const detail = useWorkoutDetail(id)
  const unit = useWeightUnit()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState<{ set: WorkoutSet; block: WorkoutDetail['blocks'][number] } | null>(null)

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

        <NotesField key={`${detail.session.id}:${detail.session.notes}`} sessionId={detail.session.id} initial={detail.session.notes} />
        <p className="-mt-2 text-xs text-muted-foreground">Toca una serie para corregirla.</p>

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
            <ul className="divide-y border-t">
              {block.sets.map((set) => (
                <li key={set.id}>
                  <button
                    type="button"
                    onClick={() => setEditing({ set, block })}
                    aria-label={`Corregir serie ${set.setNumber}: ${formatSet(set.weightKg, set.reps, unit)}`}
                    className="tabular flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-accent/50"
                  >
                    <span className="w-6 font-display text-lg font-bold text-muted-foreground">{set.setNumber}</span>
                    <span className="flex-1 font-display text-xl font-bold">{formatSet(set.weightKg, set.reps, unit)}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatWeight((set.weightKg ?? 0) * (set.reps ?? 0), unit, 0)}
                    </span>
                    <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}

        <Button variant="ghost" className="mt-2 text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Borrar entrenamiento
        </Button>
      </PageContainer>

      <SetEditor
        exerciseName={editing?.block.exercise?.name ?? 'Ejercicio'}
        set={editing?.set ?? null}
        previous={undefined}
        unit={unit}
        repsTarget={null}
        barbell={editing?.block.exercise?.equipment === 'barbell'}
        onClose={() => setEditing(null)}
        onDelete={async (set) => {
          setEditing(null)
          const result = await deleteHistorySet(set.id)
          if (result === 'workout') {
            toast.show('Entrenamiento borrado', { description: 'No le quedaba ninguna serie.' })
            navigate('/historial', { replace: true })
          } else {
            toast.show('Serie borrada')
          }
        }}
      />

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

function NotesField({ sessionId, initial }: { sessionId: string; initial: string }) {
  const [notes, setNotes] = useState(initial)
  return (
    <label className="block">
      <span className="text-sm font-semibold">Notas</span>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== initial && void updateWorkoutNotes(sessionId, notes)}
        maxLength={500}
        rows={2}
        placeholder="Añade cómo te sentiste, molestias, qué mejorar…"
        className="mt-1 w-full rounded-lg border border-input bg-card p-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />
    </label>
  )
}
