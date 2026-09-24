import { ChevronRight, LineChart, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import {
  createExercise,
  deleteExercise,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  updateExercise,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '@/db'
import { toast } from '@/features/toast/store'
import { useExercises } from '@/hooks/useDb'
import { cn } from '@/lib/utils'

/** Catálogo de ejercicios: buscar, crear, renombrar, recategorizar y borrar. */
export function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<MuscleGroup | undefined>()
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  const exercises = useExercises({ search, muscleGroup: group })

  return (
    <>
      <PageHeader
        title="Ejercicios"
        subtitle={exercises ? `${exercises.length} en el catálogo` : undefined}
        backTo="/rutinas"
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Nuevo
          </Button>
        }
      />
      <PageContainer className="gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio…"
            className="pl-10"
            aria-label="Buscar ejercicio"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <GroupChip active={!group} onClick={() => setGroup(undefined)}>
            Todos
          </GroupChip>
          {MUSCLE_GROUPS.map((g) => (
            <GroupChip key={g} active={group === g} onClick={() => setGroup(group === g ? undefined : g)}>
              {MUSCLE_GROUP_LABELS[g]}
            </GroupChip>
          ))}
        </div>

        <Card className="divide-y overflow-hidden">
          {exercises?.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => setEditing(exercise)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-accent/50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{exercise.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {EQUIPMENT_LABELS[exercise.equipment]}
                  {exercise.isCustom && ' · Tuyo'}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
          {exercises?.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</p>}
        </Card>
      </PageContainer>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nuevo ejercicio' : 'Editar ejercicio'}
      >
        {editing !== null && (
          <ExerciseForm
            key={editing === 'new' ? 'new' : editing.id}
            exercise={editing === 'new' ? null : editing}
            defaultGroup={group}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  )
}

function ExerciseForm({
  exercise,
  defaultGroup,
  onDone,
}: {
  exercise: Exercise | null
  defaultGroup?: MuscleGroup
  onDone: () => void
}) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(exercise?.muscleGroup ?? defaultGroup ?? 'chest')
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? 'barbell')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) {
      setError('Ponle un nombre.')
      return
    }
    if (exercise) {
      await updateExercise(exercise.id, { name, muscleGroup, equipment })
      toast.show('Ejercicio actualizado')
    } else {
      await createExercise({ name, muscleGroup, equipment })
      toast.show('Ejercicio creado', { description: 'Ya puedes añadirlo a tus rutinas.' })
    }
    onDone()
  }

  async function remove() {
    if (!exercise) return
    const result = await deleteExercise(exercise.id)
    toast.show(result === 'archived' ? 'Ejercicio ocultado' : 'Ejercicio borrado', {
      description:
        result === 'archived'
          ? 'Tiene historial: se conserva en tus récords pero ya no aparece en el catálogo.'
          : 'También se ha quitado de tus rutinas.',
    })
    setConfirmDelete(false)
    onDone()
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Nombre</span>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          maxLength={60}
          placeholder="Ej. Remo en máquina"
          aria-invalid={error !== null}
        />
        {error && <span className="text-sm text-destructive">{error}</span>}
      </label>

      <div>
        <p className="font-semibold">Grupo muscular</p>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Grupo muscular">
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={muscleGroup === g}
              onClick={() => setMuscleGroup(g)}
              className={cn(
                'min-h-11 rounded-lg px-2 text-sm font-semibold',
                muscleGroup === g ? 'bg-primary text-primary-foreground' : 'bg-secondary',
              )}
            >
              {MUSCLE_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Material</span>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment)}
          className="h-12 rounded-lg bg-secondary px-3 font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq}>
              {EQUIPMENT_LABELS[eq]}
            </option>
          ))}
        </select>
        {equipment === 'barbell' && (
          <span className="text-xs text-muted-foreground">Con barra verás la calculadora de discos al apuntar.</span>
        )}
      </label>

      <Button size="lg" onClick={save}>
        {exercise ? 'Guardar cambios' : 'Crear ejercicio'}
      </Button>

      {exercise && (
        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/historial/ejercicio/${exercise.id}`}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-semibold active:bg-accent"
          >
            <LineChart className="size-5" /> Ver progreso
          </Link>
          <Button variant="secondary" className="text-red-400" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Borrar
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`¿Borrar «${exercise?.name}»?`}
        confirmLabel="Borrar"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        Se quitará de tus rutinas. Si ya tiene series registradas, se ocultará del catálogo pero seguirá en tu historial
        y récords.
      </ConfirmDialog>
    </div>
  )
}

function GroupChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 shrink-0 rounded-md px-3 text-sm font-semibold whitespace-nowrap transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
      )}
    >
      {children}
    </button>
  )
}
