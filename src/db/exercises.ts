import { Dexie } from 'dexie'
import { newId } from '@/lib/id'
import { db } from './db'
import type { Equipment, Exercise, MuscleGroup } from './types'

export type ExerciseInput = {
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
}

function cleanName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) throw new Error('El nombre del ejercicio no puede estar vacío')
  return trimmed
}

/** Ordena alfabéticamente respetando acentos (Á junto a A). */
export function compareByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
}

export async function listExercises(options: { muscleGroup?: MuscleGroup; includeArchived?: boolean } = {}) {
  const collection = options.muscleGroup
    ? db.exercises.where('muscleGroup').equals(options.muscleGroup)
    : db.exercises.toCollection()
  const exercises = await collection.toArray()
  return exercises.filter((e) => options.includeArchived || !e.archived).sort(compareByName)
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const now = Date.now()
  const exercise: Exercise = {
    id: newId(),
    name: cleanName(input.name),
    muscleGroup: input.muscleGroup,
    equipment: input.equipment,
    isCustom: true,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.exercises.add(exercise)
  return exercise
}

export async function updateExercise(id: string, changes: Partial<ExerciseInput>): Promise<void> {
  const patch: Partial<Exercise> = { ...changes, updatedAt: Date.now() }
  if (changes.name !== undefined) patch.name = cleanName(changes.name)
  const updated = await db.exercises.update(id, patch)
  if (!updated) throw new Error('Ejercicio no encontrado')
}

/**
 * Elimina un ejercicio y lo quita de todas las rutinas. Si ya tiene series
 * registradas se archiva en lugar de borrarse, para no romper el historial.
 */
export async function deleteExercise(id: string): Promise<'deleted' | 'archived'> {
  return db.transaction('rw', db.exercises, db.routines, db.sets, async () => {
    const routines = await db.routines.toArray()
    for (const routine of routines) {
      if (routine.exercises.some((e) => e.exerciseId === id)) {
        await db.routines.update(routine.id, {
          exercises: routine.exercises.filter((e) => e.exerciseId !== id),
          updatedAt: Date.now(),
        })
      }
    }

    const hasHistory =
      (await db.sets
        .where('[exerciseId+completedAt]')
        .between([id, Dexie.minKey], [id, Dexie.maxKey])
        .count()) > 0

    if (hasHistory) {
      await db.exercises.update(id, { archived: true, updatedAt: Date.now() })
      return 'archived'
    }
    await db.exercises.delete(id)
    return 'deleted'
  })
}
