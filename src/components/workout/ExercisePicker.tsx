import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { createExercise, MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/db'
import { useExercises } from '@/hooks/useDb'
import { cn } from '@/lib/utils'

type ExercisePickerProps = {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
  title?: string
}

/** Buscador de ejercicios con filtro por grupo muscular y alta rápida de uno nuevo. */
export function ExercisePicker({ open, onClose, onPick, title = 'Añadir ejercicio' }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<MuscleGroup | undefined>()
  const [creating, setCreating] = useState(false)
  const exercises = useExercises({ search, muscleGroup: group })

  function close() {
    setSearch('')
    setGroup(undefined)
    setCreating(false)
    onClose()
  }

  function pick(exercise: Exercise) {
    onPick(exercise)
    close()
  }

  async function create(muscleGroup: MuscleGroup) {
    const exercise = await createExercise({ name: search, muscleGroup, equipment: 'other' })
    pick(exercise)
  }

  const trimmed = search.trim()
  const exactMatch = exercises?.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())

  return (
    <Sheet open={open} onClose={close} title={title} tall>
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCreating(false)
            }}
            placeholder="Buscar ejercicio…"
            enterKeyHint="search"
            className="pl-10"
            aria-label="Buscar ejercicio"
          />
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          <Chip active={!group} onClick={() => setGroup(undefined)}>
            Todos
          </Chip>
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(group === g ? undefined : g)}>
              {MUSCLE_GROUP_LABELS[g]}
            </Chip>
          ))}
        </div>
      </div>

      <ul className="divide-y">
        {exercises?.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => pick(exercise)}
              className="flex min-h-14 w-full flex-col justify-center px-4 py-2 text-left active:bg-accent"
            >
              <span className="font-medium">{exercise.name}</span>
              <span className="text-xs text-muted-foreground">
                {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
                {exercise.isCustom && ' · Personalizado'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {exercises?.length === 0 && !trimmed && (
        <p className="p-6 text-center text-sm text-muted-foreground">No hay ejercicios en este grupo.</p>
      )}
      {trimmed && !exactMatch && (
        <div className="border-t p-3">
          {creating ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">¿Qué grupo muscular trabaja «{trimmed}»?</p>
              <div className="grid grid-cols-2 gap-2">
                {MUSCLE_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => create(g)}
                    className="h-12 rounded-lg bg-secondary text-sm font-semibold active:bg-accent"
                  >
                    {MUSCLE_GROUP_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (group ? create(group) : setCreating(true))}
              className="flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left font-semibold text-primary active:bg-accent"
            >
              <Plus className="size-5" /> Crear «{trimmed}»
            </button>
          )}
        </div>
      )}

    </Sheet>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
