import { ChevronRight, ListChecks } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { useRoutinesWithExercises } from '@/hooks/useDb'

export function RoutinesPage() {
  const routines = useRoutinesWithExercises()

  return (
    <>
      <PageHeader title="Rutinas" subtitle={routines ? `${routines.length} rutinas` : undefined} />
      <PageContainer>
        {routines?.length === 0 && (
          <EmptyState
            icon={ListChecks}
            title="Aún no hay rutinas"
            description="Crea rutinas como Push, Pull o Legs y añade tus ejercicios."
          />
        )}

        {routines?.map((routine) => {
          const totalSets = routine.exercises.reduce((sum, e) => sum + e.targetSets, 0)
          return (
            <Card key={routine.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{routine.name}</h2>
                  {routine.description && (
                    <p className="truncate text-sm text-muted-foreground">{routine.description}</p>
                  )}
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-2 text-xs font-medium tracking-wide text-primary uppercase">
                {routine.exercises.length} ejercicios · {totalSets} series
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {routine.exercises.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="truncate">{item.exercise?.name ?? 'Ejercicio eliminado'}</span>
                    <span className="tabular shrink-0 text-muted-foreground">
                      {item.targetSets} ×{' '}
                      {item.targetRepsMin === item.targetRepsMax
                        ? item.targetRepsMin
                        : `${item.targetRepsMin}–${item.targetRepsMax}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </PageContainer>
    </>
  )
}
