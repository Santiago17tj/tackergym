import { ArrowDown, ArrowUp, Copy, ListChecks, MoreVertical, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Sheet, SheetAction } from '@/components/ui/sheet'
import { deleteRoutine, duplicateRoutine, moveRoutine, startWorkout, WorkoutError } from '@/db'
import { useRoutinesWithExercises, type RoutineWithExercises } from '@/hooks/useDb'
import { formatRepRange } from '@/lib/format'

export function RoutinesPage() {
  const routines = useRoutinesWithExercises()
  const navigate = useNavigate()
  const [menuFor, setMenuFor] = useState<RoutineWithExercises | null>(null)
  const [deleting, setDeleting] = useState<RoutineWithExercises | null>(null)
  const [error, setError] = useState<string | null>(null)

  const index = menuFor ? (routines?.findIndex((r) => r.id === menuFor.id) ?? -1) : -1

  function act(action: (routine: RoutineWithExercises) => unknown) {
    return () => {
      const routine = menuFor
      setMenuFor(null)
      if (routine) void action(routine)
    }
  }

  async function start(routine: RoutineWithExercises) {
    try {
      await startWorkout({ routineId: routine.id })
      navigate('/')
    } catch (e) {
      setError(e instanceof WorkoutError ? `${e.message} Finalízalo antes de empezar otro.` : 'No se pudo empezar.')
    }
  }

  return (
    <>
      <PageHeader
        title="Rutinas"
        subtitle={routines ? `${routines.length} ${routines.length === 1 ? 'rutina' : 'rutinas'}` : undefined}
        action={
          <Button size="sm" onClick={() => navigate('/rutinas/nueva')}>
            <Plus /> Nueva
          </Button>
        }
      />
      <PageContainer>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {routines?.length === 0 && (
          <EmptyState
            icon={ListChecks}
            title="Aún no hay rutinas"
            description="Crea rutinas como Push, Pull o Legs y añade tus ejercicios."
          >
            <Button className="mt-2" onClick={() => navigate('/rutinas/nueva')}>
              <Plus /> Crear rutina
            </Button>
          </EmptyState>
        )}

        {routines?.map((routine) => {
          const totalSets = routine.exercises.reduce((sum, e) => sum + e.targetSets, 0)
          return (
            <Card key={routine.id} className="relative">
              <Link to={`/rutinas/${routine.id}`} className="block rounded-xl p-4 pr-14 active:bg-accent/50">
                <h2 className="truncate text-lg font-bold">{routine.name}</h2>
                {routine.description && <p className="truncate text-sm text-muted-foreground">{routine.description}</p>}
                <p className="mt-2 text-xs font-medium tracking-wide text-primary uppercase">
                  {routine.exercises.length} ejercicios · {totalSets} series
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {routine.exercises.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="truncate">{item.exercise?.name ?? 'Ejercicio eliminado'}</span>
                      <span className="tabular shrink-0 text-muted-foreground">
                        {item.targetSets} × {formatRepRange(item.targetRepsMin, item.targetRepsMax)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2"
                onClick={() => setMenuFor(routine)}
                aria-label={`Opciones de ${routine.name}`}
              >
                <MoreVertical />
              </Button>
            </Card>
          )
        })}
      </PageContainer>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name ?? ''}>
        <div className="py-1">
          <SheetAction icon={<Play />} label="Empezar entrenamiento" onClick={act(start)} />
          <SheetAction icon={<Pencil />} label="Editar" onClick={act((r) => navigate(`/rutinas/${r.id}`))} />
          <SheetAction icon={<Copy />} label="Duplicar" onClick={act((r) => duplicateRoutine(r.id))} />
          <SheetAction icon={<ArrowUp />} label="Mover arriba" disabled={index <= 0} onClick={act((r) => moveRoutine(r.id, -1))} />
          <SheetAction
            icon={<ArrowDown />}
            label="Mover abajo"
            disabled={!routines || index === routines.length - 1}
            onClick={act((r) => moveRoutine(r.id, 1))}
          />
          <SheetAction icon={<Trash2 />} label="Borrar" destructive onClick={act(setDeleting)} />
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        title={`¿Borrar «${deleting?.name}»?`}
        confirmLabel="Borrar"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void deleteRoutine(deleting.id)
          setDeleting(null)
        }}
      >
        Los entrenamientos que ya hiciste con esta rutina se conservan en el historial.
      </ConfirmDialog>
    </>
  )
}
