import { ArrowDown, ArrowUp, ChevronDown, Copy, ListChecks, MoreVertical, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Sheet, SheetAction } from '@/components/ui/sheet'
import { deleteRoutine, duplicateRoutine, moveRoutine, startWorkout, WorkoutError } from '@/db'
import { useRoutinesWithExercises, useSettings, type RoutineWithExercises } from '@/hooks/useDb'
import { formatRepRange } from '@/lib/format'
import { estimateRoutineMinutes, routineMuscleGroups } from '@/lib/routine-meta'

export function RoutinesPage() {
  const routines = useRoutinesWithExercises()
  const settings = useSettings()
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
          const groups = routineMuscleGroups(routine.exercises)
          return (
            <Card key={routine.id} className="overflow-hidden">
              <div className="flex items-start gap-2 p-4 pb-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-3xl leading-tight font-bold uppercase">{routine.name}</h2>
                  {routine.description && (
                    <p className="truncate text-sm text-muted-foreground">{routine.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="-mt-1 -mr-2"
                  onClick={() => setMenuFor(routine)}
                  aria-label={`Más opciones de ${routine.name}`}
                >
                  <MoreVertical />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 px-4">
                {groups.map((g) => (
                  <Chip key={g}>{g}</Chip>
                ))}
              </div>
              <p className="mt-3 flex flex-wrap gap-x-3 px-4 text-sm text-muted-foreground">
                <span>{routine.exercises.length} ejercicios</span>
                <span>{totalSets} series</span>
                <span>~{estimateRoutineMinutes(routine.exercises, settings?.defaultRestSeconds ?? 90)} min</span>
              </p>

              <details className="group mt-2 px-4">
                <summary className="flex h-10 cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted-foreground select-none">
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                  Ver ejercicios
                </summary>
                <ul className="space-y-1 pb-2 text-sm">
                  {routine.exercises.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="truncate">{item.exercise?.name ?? 'Ejercicio eliminado'}</span>
                      <span className="tabular shrink-0 text-muted-foreground">
                        {item.targetSets} × {formatRepRange(item.targetRepsMin, item.targetRepsMax)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>

              <div className="grid grid-cols-2 gap-2 p-4 pt-2">
                <Button variant="secondary" onClick={() => navigate(`/rutinas/${routine.id}`)}>
                  <Pencil /> Editar
                </Button>
                <Button onClick={() => start(routine)} disabled={routine.exercises.length === 0}>
                  <Play className="fill-current" /> Empezar
                </Button>
              </div>
            </Card>
          )
        })}
      </PageContainer>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name ?? ''}>
        <div className="py-1">
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
