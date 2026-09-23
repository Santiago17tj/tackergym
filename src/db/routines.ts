import { newId } from '@/lib/id'
import { db } from './db'
import type { Routine, RoutineExercise } from './types'

export type RoutineExerciseInput = Omit<RoutineExercise, 'id'> & { id?: string }

export type RoutineInput = {
  name: string
  description?: string
  exercises?: RoutineExerciseInput[]
}

/** Objetivo por defecto al añadir un ejercicio a una rutina. */
export const DEFAULT_ROUTINE_TARGET = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: null } as const

function cleanName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) throw new Error('El nombre de la rutina no puede estar vacío')
  return trimmed
}

function normalizeExercises(list: RoutineExerciseInput[]): RoutineExercise[] {
  return list.map((e) => {
    const targetRepsMin = Math.max(1, Math.round(e.targetRepsMin))
    return {
      id: e.id ?? newId(),
      exerciseId: e.exerciseId,
      targetSets: Math.max(1, Math.round(e.targetSets)),
      targetRepsMin,
      targetRepsMax: Math.max(targetRepsMin, Math.round(e.targetRepsMax)),
      restSeconds: e.restSeconds === null ? null : Math.max(0, Math.round(e.restSeconds)),
    }
  })
}

export async function listRoutines(): Promise<Routine[]> {
  return db.routines.orderBy('order').toArray()
}

async function nextOrder(): Promise<number> {
  const last = await db.routines.orderBy('order').last()
  return last ? last.order + 1 : 0
}

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  const now = Date.now()
  const routine: Routine = {
    id: newId(),
    name: cleanName(input.name),
    description: input.description?.trim() ?? '',
    order: await nextOrder(),
    exercises: normalizeExercises(input.exercises ?? []),
    createdAt: now,
    updatedAt: now,
  }
  await db.routines.add(routine)
  return routine
}

export async function updateRoutine(id: string, changes: Partial<RoutineInput>): Promise<void> {
  const patch: Partial<Routine> = { updatedAt: Date.now() }
  if (changes.name !== undefined) patch.name = cleanName(changes.name)
  if (changes.description !== undefined) patch.description = changes.description.trim()
  if (changes.exercises !== undefined) patch.exercises = normalizeExercises(changes.exercises)
  const updated = await db.routines.update(id, patch)
  if (!updated) throw new Error('Rutina no encontrada')
}

/** Duplica una rutina justo debajo de la original, con "(copia)" en el nombre. */
export async function duplicateRoutine(id: string): Promise<Routine> {
  return db.transaction('rw', db.routines, async () => {
    const source = await db.routines.get(id)
    if (!source) throw new Error('Rutina no encontrada')

    // Hace hueco desplazando las rutinas posteriores.
    await db.routines.where('order').above(source.order).modify((r) => {
      r.order += 1
    })

    const now = Date.now()
    const copy: Routine = {
      ...source,
      id: newId(),
      name: `${source.name} (copia)`,
      order: source.order + 1,
      exercises: source.exercises.map((e) => ({ ...e, id: newId() })),
      createdAt: now,
      updatedAt: now,
    }
    await db.routines.add(copy)
    return copy
  })
}

/** Borra la rutina. Los entrenamientos ya hechos se conservan (guardan su propio nombre). */
export async function deleteRoutine(id: string): Promise<void> {
  await db.transaction('rw', db.routines, db.workoutSessions, async () => {
    await db.routines.delete(id)
    await db.workoutSessions.where('routineId').equals(id).modify({ routineId: null })
  })
}

/** Reordena según la lista de IDs recibida (p. ej. tras arrastrar). */
export async function reorderRoutines(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.routines, async () => {
    const all = await db.routines.orderBy('order').toArray()
    const rank = new Map(orderedIds.map((id, i) => [id, i]))
    // Las rutinas no incluidas mantienen su posición relativa al final.
    const sorted = [...all].sort(
      (a, b) => (rank.get(a.id) ?? orderedIds.length + a.order) - (rank.get(b.id) ?? orderedIds.length + b.order),
    )
    await db.routines.bulkUpdate(sorted.map((r, order) => ({ key: r.id, changes: { order } })))
  })
}

/** Mueve una rutina una posición arriba (-1) o abajo (+1). */
export async function moveRoutine(id: string, direction: -1 | 1): Promise<void> {
  const ids = (await listRoutines()).map((r) => r.id)
  const from = ids.indexOf(id)
  const to = from + direction
  if (from === -1 || to < 0 || to >= ids.length) return
  ;[ids[from], ids[to]] = [ids[to], ids[from]]
  await reorderRoutines(ids)
}
