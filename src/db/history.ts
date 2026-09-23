import { Dexie } from 'dexie'
import { db } from './db'
import type { WorkoutSet } from './types'

export type LastPerformance = {
  sessionId: string
  date: number
  /** Series completadas de ese ejercicio en esa sesión, en orden. */
  sets: Pick<WorkoutSet, 'setNumber' | 'weightKg' | 'reps'>[]
}

/**
 * Última vez que se completó un ejercicio: base para pre-llenar peso y reps
 * (sobrecarga progresiva). Usa el índice [exerciseId+completedAt], sin escanear.
 */
export async function getLastPerformance(
  exerciseId: string,
  options: { excludeSessionId?: string } = {},
): Promise<LastPerformance | null> {
  const latest = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .filter((s) => s.sessionId !== options.excludeSessionId)
    .first()
  if (!latest || latest.completedAt === null) return null

  const sets = await db.sets
    .where('sessionId')
    .equals(latest.sessionId)
    .filter((s) => s.exerciseId === exerciseId && s.completedAt !== null)
    .toArray()
  sets.sort((a, b) => a.setNumber - b.setNumber)

  return {
    sessionId: latest.sessionId,
    date: latest.completedAt,
    sets: sets.map(({ setNumber, weightKg, reps }) => ({ setNumber, weightKg, reps })),
  }
}
