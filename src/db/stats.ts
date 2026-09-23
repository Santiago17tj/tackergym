import { db } from './db'
import { computeVolumeKg } from './workouts'
import type { Exercise, WorkoutSession, WorkoutSet } from './types'

/**
 * Historial y récords. Solo cuentan las series completadas de entrenamientos
 * finalizados (el entrenamiento en curso no altera los récords).
 */

/** 1RM estimado (fórmula de Epley). Con 1 rep es el propio peso. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30)
}

// ---------------------------------------------------------------------------
// Entrenamientos
// ---------------------------------------------------------------------------

export type WorkoutHistoryItem = {
  session: WorkoutSession
  exerciseNames: string[]
  completedSets: number
  volumeKg: number
  durationMs: number
}

export async function listWorkoutHistory(): Promise<WorkoutHistoryItem[]> {
  const sessions = await db.workoutSessions.where('status').equals('completed').toArray()
  sessions.sort((a, b) => b.startedAt - a.startedAt)
  if (sessions.length === 0) return []

  const [sets, exercises] = await Promise.all([
    db.sets.where('sessionId').anyOf(sessions.map((s) => s.id)).toArray(),
    db.exercises.toArray(),
  ])
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  const setsBySession = groupBy(sets, (s) => s.sessionId)

  return sessions.map((session) => {
    const sessionSets = (setsBySession.get(session.id) ?? []).filter((s) => s.completedAt !== null)
    return {
      session,
      exerciseNames: session.exercises.map((b) => names.get(b.exerciseId) ?? 'Ejercicio eliminado'),
      completedSets: sessionSets.length,
      volumeKg: computeVolumeKg(sessionSets),
      durationMs: (session.endedAt ?? session.startedAt) - session.startedAt,
    }
  })
}

export type WorkoutDetail = {
  session: WorkoutSession
  blocks: { blockId: string; exercise: Exercise | null; sets: WorkoutSet[]; volumeKg: number }[]
  completedSets: number
  volumeKg: number
  durationMs: number
}

export async function getWorkoutDetail(sessionId: string): Promise<WorkoutDetail | null> {
  const session = await db.workoutSessions.get(sessionId)
  if (!session || session.status !== 'completed') return null
  const [sets, exercises] = await Promise.all([
    db.sets.where('sessionId').equals(sessionId).toArray(),
    db.exercises.bulkGet(session.exercises.map((b) => b.exerciseId)),
  ])
  const completed = sets.filter((s) => s.completedAt !== null).sort((a, b) => a.setNumber - b.setNumber)
  return {
    session,
    blocks: session.exercises.map((block, i) => {
      const blockSets = completed.filter((s) => s.sessionExerciseId === block.id)
      return { blockId: block.id, exercise: exercises[i] ?? null, sets: blockSets, volumeKg: computeVolumeKg(blockSets) }
    }),
    completedSets: completed.length,
    volumeKg: computeVolumeKg(completed),
    durationMs: (session.endedAt ?? session.startedAt) - session.startedAt,
  }
}

/** Borra un entrenamiento finalizado del historial (y con él sus series). */
export async function deleteWorkout(sessionId: string): Promise<void> {
  await db.transaction('rw', db.workoutSessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.workoutSessions.delete(sessionId)
  })
}

// ---------------------------------------------------------------------------
// Ejercicios
// ---------------------------------------------------------------------------

export type ExerciseSession = {
  sessionId: string
  sessionName: string
  date: number
  sets: WorkoutSet[]
  /** Peso máximo levantado ese día (kg). */
  maxWeightKg: number
  best1RMKg: number
  volumeKg: number
}

export type ExerciseRecords = {
  maxWeightKg: number
  /** Reps con las que se hizo el peso máximo (la mejor si hay empate). */
  maxWeightReps: number
  best1RMKg: number
  maxReps: number
  maxSessionVolumeKg: number
  totalVolumeKg: number
  totalSets: number
  sessionCount: number
}

export type ExerciseStats = {
  /** Sesiones de más reciente a más antigua. */
  sessions: ExerciseSession[]
  records: ExerciseRecords
}

async function completedSessionMap(): Promise<Map<string, WorkoutSession>> {
  const sessions = await db.workoutSessions.where('status').equals('completed').toArray()
  return new Map(sessions.map((s) => [s.id, s]))
}

function summarizeSessions(sets: WorkoutSet[], sessions: Map<string, WorkoutSession>): ExerciseSession[] {
  const bySession = groupBy(
    sets.filter((s) => s.completedAt !== null && sessions.has(s.sessionId)),
    (s) => s.sessionId,
  )
  const result: ExerciseSession[] = []
  for (const [sessionId, sessionSets] of bySession) {
    const session = sessions.get(sessionId)!
    sessionSets.sort((a, b) => a.setNumber - b.setNumber)
    result.push({
      sessionId,
      sessionName: session.name,
      date: session.startedAt,
      sets: sessionSets,
      maxWeightKg: Math.max(...sessionSets.map((s) => s.weightKg ?? 0)),
      best1RMKg: Math.max(...sessionSets.map((s) => estimateOneRepMax(s.weightKg ?? 0, s.reps ?? 0))),
      volumeKg: computeVolumeKg(sessionSets),
    })
  }
  return result.sort((a, b) => b.date - a.date)
}

function computeRecords(sessions: ExerciseSession[]): ExerciseRecords {
  const records: ExerciseRecords = {
    maxWeightKg: 0,
    maxWeightReps: 0,
    best1RMKg: 0,
    maxReps: 0,
    maxSessionVolumeKg: 0,
    totalVolumeKg: 0,
    totalSets: 0,
    sessionCount: sessions.length,
  }
  for (const session of sessions) {
    records.best1RMKg = Math.max(records.best1RMKg, session.best1RMKg)
    records.maxSessionVolumeKg = Math.max(records.maxSessionVolumeKg, session.volumeKg)
    records.totalVolumeKg += session.volumeKg
    records.totalSets += session.sets.length
    for (const set of session.sets) {
      const weight = set.weightKg ?? 0
      const reps = set.reps ?? 0
      records.maxReps = Math.max(records.maxReps, reps)
      if (weight > records.maxWeightKg || (weight === records.maxWeightKg && reps > records.maxWeightReps)) {
        records.maxWeightKg = weight
        records.maxWeightReps = reps
      }
    }
  }
  return records
}

export async function getExerciseStats(exerciseId: string): Promise<ExerciseStats> {
  const [sets, sessions] = await Promise.all([
    db.sets.where('[exerciseId+completedAt]').between([exerciseId, 0], [exerciseId, Infinity]).toArray(),
    completedSessionMap(),
  ])
  const summary = summarizeSessions(sets, sessions)
  return { sessions: summary, records: computeRecords(summary) }
}

export type ExerciseOverview = {
  exercise: Exercise
  lastDate: number
  sessionCount: number
  maxWeightKg: number
  best1RMKg: number
}

/** Ejercicios con historial, del hecho más recientemente al más antiguo. */
export async function listExercisesWithHistory(): Promise<ExerciseOverview[]> {
  const [sets, sessions, exercises] = await Promise.all([
    db.sets.filter((s) => s.completedAt !== null).toArray(),
    completedSessionMap(),
    db.exercises.toArray(),
  ])
  const byExercise = groupBy(sets, (s) => s.exerciseId)
  const result: ExerciseOverview[] = []
  for (const exercise of exercises) {
    const exerciseSets = byExercise.get(exercise.id)
    if (!exerciseSets) continue
    const summary = summarizeSessions(exerciseSets, sessions)
    if (summary.length === 0) continue
    const records = computeRecords(summary)
    result.push({
      exercise,
      lastDate: summary[0].date,
      sessionCount: summary.length,
      maxWeightKg: records.maxWeightKg,
      best1RMKg: records.best1RMKg,
    })
  }
  return result.sort((a, b) => b.lastDate - a.lastDate)
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}
