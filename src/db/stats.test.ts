import { describe, expect, it, vi } from 'vitest'
import { db } from './db'
import {
  deleteWorkout,
  estimateOneRepMax,
  getExerciseStats,
  getWorkoutDetail,
  listExercisesWithHistory,
  listWorkoutHistory,
} from './stats'
import { addExerciseToWorkout, finishWorkout, getSessionSets, setSetCompleted, startWorkout, updateSet } from './workouts'

/** Registra un entrenamiento completo: { exerciseId: [[kg, reps], ...] } */
async function logWorkout(at: number, plan: Record<string, [number, number][]>) {
  vi.setSystemTime(at)
  const session = await startWorkout()
  for (const [exerciseId, sets] of Object.entries(plan)) {
    const block = await addExerciseToWorkout(session.id, exerciseId)
    const blockSets = (await getSessionSets(session.id)).filter((s) => s.sessionExerciseId === block.id)
    for (const [i, [weightKg, reps]] of sets.entries()) {
      await updateSet(blockSets[i].id, { weightKg, reps })
      await setSetCompleted(blockSets[i].id, true)
    }
  }
  vi.setSystemTime(at + 3_600_000)
  await finishWorkout(session.id)
  return session.id
}

describe('estadísticas', () => {
  it('1RM estimado (Epley)', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 1)
    expect(estimateOneRepMax(0, 10)).toBe(0)
  })

  it('historial de entrenamientos en orden cronológico inverso', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const first = await logWorkout(1_000_000, { 'bench-press': [[60, 10], [60, 8]] })
    const second = await logWorkout(90_000_000, { 'bench-press': [[70, 5]], dips: [[0, 12]] })
    vi.useRealTimers()

    const history = await listWorkoutHistory()
    expect(history.map((h) => h.session.id)).toEqual([second, first])
    expect(history[1]).toMatchObject({ completedSets: 2, volumeKg: 1080, durationMs: 3_600_000 })
    expect(history[0].exerciseNames).toEqual(['Press de banca', 'Fondos en paralelas'])

    const detail = await getWorkoutDetail(second)
    expect(detail?.blocks.map((b) => [b.exercise?.id, b.sets.length, b.volumeKg])).toEqual([
      ['bench-press', 1, 350],
      ['dips', 1, 0],
    ])
  })

  it('récords por ejercicio, ignorando el entrenamiento en curso', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await logWorkout(1_000_000, { 'back-squat': [[100, 5], [100, 5], [90, 10]] })
    await logWorkout(2_000_000, { 'back-squat': [[110, 3], [110, 2]] })
    vi.useRealTimers()

    // Entrenamiento activo con un "récord" que aún no cuenta
    const active = await startWorkout()
    await addExerciseToWorkout(active.id, 'back-squat')
    const [set] = await getSessionSets(active.id)
    await updateSet(set.id, { weightKg: 200, reps: 1 })
    await setSetCompleted(set.id, true)

    const { sessions, records } = await getExerciseStats('back-squat')
    expect(sessions).toHaveLength(2)
    expect(sessions[0].maxWeightKg).toBe(110)
    expect(records).toMatchObject({
      maxWeightKg: 110,
      maxWeightReps: 3,
      maxReps: 10,
      maxSessionVolumeKg: 1900,
      totalVolumeKg: 1900 + 550,
      totalSets: 5,
      sessionCount: 2,
    })
    expect(records.best1RMKg).toBeCloseTo(121, 5) // 110×3 → 121 (supera a 90×10 → 120)

    const overview = await listExercisesWithHistory()
    expect(overview.map((o) => o.exercise.id)).toEqual(['back-squat'])
    expect(overview[0]).toMatchObject({ sessionCount: 2, maxWeightKg: 110, lastDate: 2_000_000 })
  })

  it('borrar un entrenamiento del historial', async () => {
    const id = await logWorkout(Date.now(), { deadlift: [[140, 5]] })
    await deleteWorkout(id)
    expect(await listWorkoutHistory()).toEqual([])
    expect(await db.sets.count()).toBe(0)
    expect((await getExerciseStats('deadlift')).records.sessionCount).toBe(0)
  })
})

describe('resumen de inicio', () => {
  // Miércoles 23 sept 2026, 18:00
  const now = new Date(2026, 8, 23, 18).getTime()
  const at = (d: number, h = 18) => new Date(2026, 8, d, h).getTime()

  it('semana actual, racha y rutina sugerida', async () => {
    const { summarizeHome, startOfWeek } = await import('./stats')
    expect(new Date(startOfWeek(now)).getDate()).toBe(21) // lunes 21
    const summary = summarizeHome(
      [
        { startedAt: at(21), routineId: 'push' }, // lunes
        { startedAt: at(23, 7), routineId: 'pull' }, // miércoles
        { startedAt: at(16), routineId: 'legs' }, // semana anterior
        { startedAt: at(2), routineId: 'push' }, // hace 3 semanas (rompe la racha)
      ],
      ['push', 'pull', 'legs'],
      now,
    )
    expect(summary.weekDays).toEqual([true, false, true, false, false, false, false])
    expect(summary.workoutsThisWeek).toBe(2)
    expect(summary.weekStreak).toBe(2)
    expect(summary.suggestedRoutineId).toBe('legs') // la menos reciente
  })

  it('sugiere primero las rutinas nunca hechas, en orden', async () => {
    const { summarizeHome } = await import('./stats')
    expect(summarizeHome([{ startedAt: at(22), routineId: 'push' }], ['push', 'pull', 'legs'], now).suggestedRoutineId).toBe('pull')
    expect(summarizeHome([], ['push', 'pull'], now)).toMatchObject({ suggestedRoutineId: 'push', weekStreak: 0 })
  })

  it('la racha cuenta desde la semana pasada si esta aún no hay entrenos', async () => {
    const { summarizeHome } = await import('./stats')
    expect(summarizeHome([{ startedAt: at(15), routineId: null }, { startedAt: at(8), routineId: null }], [], now).weekStreak).toBe(2)
  })

  it('mejores pesos excluyen el entrenamiento en curso', async () => {
    const { getExerciseBests } = await import('./stats')
    await logWorkout(Date.now() - 1000, { 'bench-press': [[80, 5]] })
    const active = await startWorkout()
    await addExerciseToWorkout(active.id, 'bench-press')
    const [set] = await getSessionSets(active.id)
    await updateSet(set.id, { weightKg: 100, reps: 1 })
    await setSetCompleted(set.id, true)
    const bests = await getExerciseBests(['bench-press', 'deadlift'])
    expect(bests.get('bench-press')).toBe(80)
    expect(bests.get('deadlift')).toBe(0)
  })
})
