import { newId } from '@/lib/id'
import { db } from './db'
import { getLastPerformance, type LastPerformance } from './history'
import type { SessionExercise, WorkoutSession, WorkoutSet } from './types'

export const FREE_WORKOUT_NAME = 'Entrenamiento libre'
/** Series por defecto al añadir un ejercicio sin historial fuera de una rutina. */
const DEFAULT_SET_COUNT = 3

export class WorkoutError extends Error {
  override name = 'WorkoutError'
}

export type WorkoutSummary = {
  completedSets: number
  exercises: number
  /** Σ peso × reps de las series completadas, en kg. */
  volumeKg: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.where('status').equals('active').first()
}

export async function getSessionSets(sessionId: string): Promise<WorkoutSet[]> {
  const sets = await db.sets.where('sessionId').equals(sessionId).toArray()
  return sets.sort((a, b) => a.setNumber - b.setNumber)
}

export function computeVolumeKg(sets: Pick<WorkoutSet, 'weightKg' | 'reps' | 'completedAt'>[]): number {
  return sets.reduce(
    (sum, s) => (s.completedAt !== null && s.weightKg !== null && s.reps !== null ? sum + s.weightKg * s.reps : sum),
    0,
  )
}

// ---------------------------------------------------------------------------
// Pre-llenado (sobrecarga progresiva)
// ---------------------------------------------------------------------------

/**
 * Valores iniciales de la serie `index` (0-based) a partir de la última vez:
 * misma serie si existe; si hoy se hacen más series que entonces, se repite la última.
 */
export function prefillFromLast(last: LastPerformance | null, index: number): Pick<WorkoutSet, 'weightKg' | 'reps'> {
  const source = last?.sets[index] ?? last?.sets.at(-1)
  return { weightKg: source?.weightKg ?? null, reps: source?.reps ?? null }
}

function buildSets(
  sessionId: string,
  block: SessionExercise,
  count: number,
  last: LastPerformance | null,
): WorkoutSet[] {
  return Array.from({ length: count }, (_, i) => ({
    id: newId(),
    sessionId,
    sessionExerciseId: block.id,
    exerciseId: block.exerciseId,
    setNumber: i + 1,
    ...prefillFromLast(last, i),
    completedAt: null,
  }))
}

// ---------------------------------------------------------------------------
// Ciclo de vida del entrenamiento
// ---------------------------------------------------------------------------

/**
 * Empieza un entrenamiento desde una rutina (o libre si no se indica).
 * Solo puede haber uno activo: si ya existe, se lanza `WorkoutError`.
 */
export async function startWorkout(options: { routineId?: string } = {}): Promise<WorkoutSession> {
  return db.transaction('rw', db.workoutSessions, db.sets, db.routines, async () => {
    if (await getActiveSession()) throw new WorkoutError('Ya hay un entrenamiento en curso.')

    const routine = options.routineId ? await db.routines.get(options.routineId) : undefined
    if (options.routineId && !routine) throw new WorkoutError('La rutina no existe.')

    const session: WorkoutSession = {
      id: newId(),
      routineId: routine?.id ?? null,
      name: routine?.name ?? FREE_WORKOUT_NAME,
      status: 'active',
      exercises: [],
      notes: '',
      startedAt: Date.now(),
      endedAt: null,
    }

    const sets: WorkoutSet[] = []
    for (const item of routine?.exercises ?? []) {
      const block: SessionExercise = {
        id: newId(),
        exerciseId: item.exerciseId,
        restSeconds: item.restSeconds,
        targetRepsMin: item.targetRepsMin,
        targetRepsMax: item.targetRepsMax,
      }
      session.exercises.push(block)
      const last = await getLastPerformance(item.exerciseId)
      sets.push(...buildSets(session.id, block, item.targetSets, last))
    }

    await db.workoutSessions.add(session)
    await db.sets.bulkAdd(sets)
    return session
  })
}

/** Termina el entrenamiento: descarta las series no completadas y los ejercicios vacíos. */
export async function finishWorkout(sessionId: string): Promise<WorkoutSummary> {
  return db.transaction('rw', db.workoutSessions, db.sets, async () => {
    const session = await db.workoutSessions.get(sessionId)
    if (!session || session.status !== 'active') throw new WorkoutError('No hay un entrenamiento activo.')

    const sets = await getSessionSets(sessionId)
    const completed = sets.filter((s) => s.completedAt !== null)
    if (completed.length === 0) throw new WorkoutError('Completa al menos una serie para guardar el entrenamiento.')

    await db.sets.bulkDelete(sets.filter((s) => s.completedAt === null).map((s) => s.id))

    // Renumera por bloque (p. ej. si se saltó la serie 2 de 3).
    const updates: { key: string; changes: Partial<WorkoutSet> }[] = []
    const usedBlocks = new Set<string>()
    for (const block of session.exercises) {
      const blockSets = completed.filter((s) => s.sessionExerciseId === block.id)
      if (blockSets.length) usedBlocks.add(block.id)
      blockSets.forEach((s, i) => {
        if (s.setNumber !== i + 1) updates.push({ key: s.id, changes: { setNumber: i + 1 } })
      })
    }
    if (updates.length) await db.sets.bulkUpdate(updates)

    const endedAt = Date.now()
    await db.workoutSessions.update(sessionId, {
      status: 'completed',
      endedAt,
      exercises: session.exercises.filter((b) => usedBlocks.has(b.id)),
    })

    return {
      completedSets: completed.length,
      exercises: usedBlocks.size,
      volumeKg: computeVolumeKg(completed),
      durationMs: endedAt - session.startedAt,
    }
  })
}

/** Cancela el entrenamiento activo sin guardar nada. */
export async function discardWorkout(sessionId: string): Promise<void> {
  await db.transaction('rw', db.workoutSessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.workoutSessions.delete(sessionId)
  })
}

// ---------------------------------------------------------------------------
// Ejercicios dentro del entrenamiento
// ---------------------------------------------------------------------------

async function getActiveOrThrow(sessionId: string): Promise<WorkoutSession> {
  const session = await db.workoutSessions.get(sessionId)
  if (!session || session.status !== 'active') throw new WorkoutError('No hay un entrenamiento activo.')
  return session
}

export async function addExerciseToWorkout(sessionId: string, exerciseId: string): Promise<SessionExercise> {
  return db.transaction('rw', db.workoutSessions, db.sets, async () => {
    const session = await getActiveOrThrow(sessionId)
    const block: SessionExercise = {
      id: newId(),
      exerciseId,
      restSeconds: null,
      targetRepsMin: null,
      targetRepsMax: null,
    }
    const last = await getLastPerformance(exerciseId, { excludeSessionId: sessionId })
    await db.workoutSessions.update(sessionId, { exercises: [...session.exercises, block] })
    await db.sets.bulkAdd(buildSets(sessionId, block, last?.sets.length || DEFAULT_SET_COUNT, last))
    return block
  })
}

export async function removeExerciseFromWorkout(sessionId: string, blockId: string): Promise<void> {
  await db.transaction('rw', db.workoutSessions, db.sets, async () => {
    const session = await getActiveOrThrow(sessionId)
    await db.workoutSessions.update(sessionId, { exercises: session.exercises.filter((b) => b.id !== blockId) })
    await db.sets.where('sessionId').equals(sessionId).filter((s) => s.sessionExerciseId === blockId).delete()
  })
}

/** Mueve un ejercicio una posición arriba (-1) o abajo (+1) dentro del entrenamiento. */
export async function moveExerciseInWorkout(sessionId: string, blockId: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.workoutSessions, async () => {
    const session = await getActiveOrThrow(sessionId)
    const list = [...session.exercises]
    const from = list.findIndex((b) => b.id === blockId)
    const to = from + direction
    if (from === -1 || to < 0 || to >= list.length) return
    ;[list[from], list[to]] = [list[to], list[from]]
    await db.workoutSessions.update(sessionId, { exercises: list })
  })
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

async function getBlockSets(sessionId: string, blockId: string): Promise<WorkoutSet[]> {
  const sets = await db.sets
    .where('sessionId')
    .equals(sessionId)
    .filter((s) => s.sessionExerciseId === blockId)
    .toArray()
  return sets.sort((a, b) => a.setNumber - b.setNumber)
}

/** Añade una serie copiando el peso y las reps de la anterior. */
export async function addSet(sessionId: string, blockId: string): Promise<WorkoutSet> {
  return db.transaction('rw', db.workoutSessions, db.sets, async () => {
    const session = await getActiveOrThrow(sessionId)
    const block = session.exercises.find((b) => b.id === blockId)
    if (!block) throw new WorkoutError('El ejercicio no forma parte del entrenamiento.')
    const previous = (await getBlockSets(sessionId, blockId)).at(-1)
    const set: WorkoutSet = {
      id: newId(),
      sessionId,
      sessionExerciseId: blockId,
      exerciseId: block.exerciseId,
      setNumber: (previous?.setNumber ?? 0) + 1,
      weightKg: previous?.weightKg ?? null,
      reps: previous?.reps ?? null,
      completedAt: null,
    }
    await db.sets.add(set)
    return set
  })
}

/** Quita la última serie del ejercicio. */
export async function removeLastSet(sessionId: string, blockId: string): Promise<void> {
  await db.transaction('rw', db.sets, async () => {
    const last = (await getBlockSets(sessionId, blockId)).at(-1)
    if (last) await db.sets.delete(last.id)
  })
}

export async function updateSet(id: string, changes: Partial<Pick<WorkoutSet, 'weightKg' | 'reps'>>): Promise<void> {
  const clean: Partial<WorkoutSet> = {}
  if ('weightKg' in changes) clean.weightKg = changes.weightKg == null ? null : Math.max(0, changes.weightKg)
  if ('reps' in changes) clean.reps = changes.reps == null ? null : Math.max(0, Math.round(changes.reps))
  await db.sets.update(id, clean)
}

/**
 * Marca o desmarca una serie. Para completarla hacen falta reps; si el peso
 * está vacío se interpreta como peso corporal (0 kg).
 */
export async function setSetCompleted(id: string, completed: boolean): Promise<WorkoutSet> {
  return db.transaction('rw', db.sets, async () => {
    const set = await db.sets.get(id)
    if (!set) throw new WorkoutError('La serie no existe.')
    if (completed && (set.reps === null || set.reps <= 0)) throw new WorkoutError('Indica las repeticiones.')
    const changes: Partial<WorkoutSet> = completed
      ? { completedAt: Date.now(), weightKg: set.weightKg ?? 0 }
      : { completedAt: null }
    await db.sets.update(id, changes)
    return { ...set, ...changes }
  })
}
