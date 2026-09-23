import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Stepper } from '@/components/ui/stepper'
import { ExercisePicker } from '@/components/workout/ExercisePicker'
import {
  createRoutine,
  DEFAULT_ROUTINE_TARGET,
  deleteRoutine,
  MUSCLE_GROUP_LABELS,
  REST_PRESETS,
  updateRoutine,
  type RoutineExercise,
} from '@/db'
import { useExerciseMap, useRoutine, useSettings } from '@/hooks/useDb'
import { newId } from '@/lib/id'
import { formatRest } from '@/lib/format'

type Draft = { name: string; description: string; exercises: RoutineExercise[] }

const REST_CHOICES = [...REST_PRESETS, 150, 180, 240]

export function RoutineEditorPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const routine = useRoutine(id)
  const navigate = useNavigate()

  if (!isNew && routine === undefined) return null // cargando
  if (!isNew && routine === null) {
    return (
      <>
        <PageHeader title="Rutina no encontrada" backTo="/rutinas" />
        <PageContainer>
          <p className="text-muted-foreground">Puede que se haya borrado.</p>
          <Button onClick={() => navigate('/rutinas', { replace: true })}>Volver a rutinas</Button>
        </PageContainer>
      </>
    )
  }

  const initial: Draft = routine
    ? { name: routine.name, description: routine.description, exercises: routine.exercises }
    : { name: '', description: '', exercises: [] }

  return <RoutineEditor key={routine?.id ?? 'new'} routineId={routine?.id} initial={initial} />
}

function RoutineEditor({ routineId, initial }: { routineId?: string; initial: Draft }) {
  const navigate = useNavigate()
  const exerciseMap = useExerciseMap()
  const settings = useSettings()
  const [draft, setDraft] = useState<Draft>(initial)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [nameError, setNameError] = useState(false)

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial])
  const blocker = useBlocker(dirty && !done)

  // Aviso nativo si se cierra la pestaña/app con cambios sin guardar.
  useEffect(() => {
    if (!dirty || done) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, done])

  function updateItem(itemId: string, changes: Partial<RoutineExercise>) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) => {
        if (e.id !== itemId) return e
        const next = { ...e, ...changes }
        // Mantiene min ≤ max moviendo el otro extremo.
        if (changes.targetRepsMin !== undefined && next.targetRepsMax < next.targetRepsMin) next.targetRepsMax = next.targetRepsMin
        if (changes.targetRepsMax !== undefined && next.targetRepsMin > next.targetRepsMax) next.targetRepsMin = next.targetRepsMax
        return next
      }),
    }))
  }

  function moveItem(index: number, direction: -1 | 1) {
    setDraft((d) => {
      const list = [...d.exercises]
      const to = index + direction
      if (to < 0 || to >= list.length) return d
      ;[list[index], list[to]] = [list[to], list[index]]
      return { ...d, exercises: list }
    })
  }

  async function save() {
    if (!draft.name.trim()) {
      setNameError(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    try {
      if (routineId) await updateRoutine(routineId, draft)
      else await createRoutine(draft)
      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  // Navega cuando `done` ya desactivó el bloqueador.
  useEffect(() => {
    if (done) navigate('/rutinas', { replace: true })
  }, [done, navigate])

  return (
    <>
      <PageHeader
        title={routineId ? 'Editar rutina' : 'Nueva rutina'}
        backTo="/rutinas"
        action={
          <Button size="sm" onClick={save} disabled={saving || (!dirty && !!routineId)}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar
          </Button>
        }
      />
      <PageContainer>
        <div className="flex flex-col gap-2">
          <label htmlFor="routine-name" className="text-sm font-medium">
            Nombre
          </label>
          <Input
            id="routine-name"
            value={draft.name}
            onChange={(e) => {
              setDraft((d) => ({ ...d, name: e.target.value }))
              setNameError(false)
            }}
            placeholder="Ej. Torso A"
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={nameError}
            className={nameError ? 'border-destructive' : undefined}
          />
          {nameError && <p className="text-sm text-destructive">Ponle un nombre a la rutina.</p>}
          <label htmlFor="routine-description" className="mt-2 text-sm font-medium">
            Descripción <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="routine-description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Ej. Pecho, hombros y tríceps"
            autoComplete="off"
          />
        </div>

        <h2 className="mt-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Ejercicios ({draft.exercises.length})
        </h2>

        {draft.exercises.map((item, i) => {
          const exercise = exerciseMap?.get(item.exerciseId)
          return (
            <Card key={item.id} className="flex flex-col gap-3 p-3">
              <div className="flex items-start gap-1">
                <div className="min-w-0 flex-1 pt-1">
                  <h3 className="leading-tight font-bold">{exercise?.name ?? 'Ejercicio eliminado'}</h3>
                  {exercise && <p className="text-xs text-muted-foreground">{MUSCLE_GROUP_LABELS[exercise.muscleGroup]}</p>}
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Mover arriba" disabled={i === 0} onClick={() => moveItem(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Mover abajo"
                  disabled={i === draft.exercises.length - 1}
                  onClick={() => moveItem(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label="Quitar ejercicio"
                  onClick={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== item.id) }))}
                >
                  <X />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stepper label="Series" value={item.targetSets} min={1} max={20} onChange={(v) => updateItem(item.id, { targetSets: v })} />
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Descanso</span>
                  <select
                    value={item.restSeconds ?? ''}
                    onChange={(e) => updateItem(item.id, { restSeconds: e.target.value === '' ? null : Number(e.target.value) })}
                    className="h-11 min-w-0 rounded-lg bg-secondary px-3 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Auto ({formatRest(settings?.defaultRestSeconds ?? 90)})</option>
                    {REST_CHOICES.map((s) => (
                      <option key={s} value={s}>
                        {formatRest(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <Stepper label="Reps mín." value={item.targetRepsMin} min={1} max={100} onChange={(v) => updateItem(item.id, { targetRepsMin: v })} />
                <Stepper label="Reps máx." value={item.targetRepsMax} min={1} max={100} onChange={(v) => updateItem(item.id, { targetRepsMax: v })} />
              </div>
            </Card>
          )
        })}

        <Button variant="outline" size="lg" onClick={() => setPickerOpen(true)}>
          <Plus /> Añadir ejercicio
        </Button>

        {routineId && (
          <Button variant="ghost" className="mt-4 text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Borrar rutina
          </Button>
        )}
      </PageContainer>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(exercise) =>
          setDraft((d) => ({
            ...d,
            exercises: [...d.exercises, { id: newId(), exerciseId: exercise.id, ...DEFAULT_ROUTINE_TARGET }],
          }))
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title="¿Borrar esta rutina?"
        confirmLabel="Borrar"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          if (routineId) await deleteRoutine(routineId)
          setDone(true)
        }}
      >
        Los entrenamientos que ya hiciste con ella se conservan en el historial.
      </ConfirmDialog>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="¿Salir sin guardar?"
        confirmLabel="Salir"
        cancelLabel="Seguir editando"
        destructive
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        Perderás los cambios de esta rutina.
      </ConfirmDialog>
    </>
  )
}
