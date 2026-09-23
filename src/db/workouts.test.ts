import { describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addExerciseToWorkout,
  addSet,
  discardWorkout,
  finishWorkout,
  getActiveSession,
  getSessionSets,
  moveExerciseInWorkout,
  prefillFromLast,
  removeExerciseFromWorkout,
  removeLastSet,
  setSetCompleted,
  startWorkout,
  updateSet,
  WorkoutError,
} from './workouts'

async function completeAll(sessionId: string, values: { weightKg: number; reps: number }) {
  for (const set of await getSessionSets(sessionId)) {
    await updateSet(set.id, values)
    await setSetCompleted(set.id, true)
  }
}

describe('entrenamiento en vivo', () => {
  it('crea la sesión con los ejercicios y series de la rutina', async () => {
    const session = await startWorkout({ routineId: 'routine-push' })
    const routine = await db.routines.get('routine-push')
    expect(session.name).toBe('Push (Empuje)')
    expect(session.exercises.map((e) => e.exerciseId)).toEqual(routine?.exercises.map((e) => e.exerciseId))
    expect(session.exercises[0]).toMatchObject({ targetRepsMin: 6, targetRepsMax: 8, restSeconds: 150 })

    const sets = await getSessionSets(session.id)
    const total = routine!.exercises.reduce((n, e) => n + e.targetSets, 0)
    expect(sets).toHaveLength(total)
    // Sin historial: campos vacíos
    expect(sets.every((s) => s.weightKg === null && s.reps === null && s.completedAt === null)).toBe(true)
    expect((await getActiveSession())?.id).toBe(session.id)
  })

  it('solo permite un entrenamiento activo', async () => {
    await startWorkout()
    await expect(startWorkout()).rejects.toBeInstanceOf(WorkoutError)
  })

  it('entrenamiento libre y añadir ejercicios', async () => {
    const session = await startWorkout()
    expect(session.name).toBe('Entrenamiento libre')
    expect(session.exercises).toEqual([])
    const block = await addExerciseToWorkout(session.id, 'deadlift')
    const sets = await getSessionSets(session.id)
    expect(sets).toHaveLength(3)
    expect(sets.every((s) => s.sessionExerciseId === block.id && s.exerciseId === 'deadlift')).toBe(true)
  })

  it('pre-llena con el peso y reps de la última vez (sobrecarga progresiva)', async () => {
    const first = await startWorkout({ routineId: 'routine-legs' })
    const firstSets = await getSessionSets(first.id)
    const squat = firstSets.filter((s) => s.exerciseId === 'back-squat')
    // Serie 1: 100×8, serie 2: 102.5×6; el resto sin hacer
    await updateSet(squat[0].id, { weightKg: 100, reps: 8 })
    await setSetCompleted(squat[0].id, true)
    await updateSet(squat[1].id, { weightKg: 102.5, reps: 6 })
    await setSetCompleted(squat[1].id, true)
    await finishWorkout(first.id)

    const second = await startWorkout({ routineId: 'routine-legs' })
    const next = (await getSessionSets(second.id)).filter((s) => s.exerciseId === 'back-squat')
    expect(next).toHaveLength(4)
    expect(next.map((s) => [s.weightKg, s.reps])).toEqual([
      [100, 8],
      [102.5, 6],
      [102.5, 6], // se repite la última serie hecha
      [102.5, 6],
    ])
    expect(next.every((s) => s.completedAt === null)).toBe(true)
  })

  it('al añadir un ejercicio con historial usa el mismo nº de series de la última vez', () => {
    expect(prefillFromLast(null, 0)).toEqual({ weightKg: null, reps: null })
    const last = { sessionId: 's', date: 1, sets: [{ setNumber: 1, weightKg: 20, reps: 10 }] }
    expect(prefillFromLast(last, 3)).toEqual({ weightKg: 20, reps: 10 })
  })

  it('completar exige reps; peso vacío = peso corporal', async () => {
    const session = await startWorkout()
    await addExerciseToWorkout(session.id, 'pull-up')
    const [set] = await getSessionSets(session.id)
    await expect(setSetCompleted(set.id, true)).rejects.toThrow(/repeticiones/)
    await updateSet(set.id, { reps: 10 })
    const done = await setSetCompleted(set.id, true)
    expect(done.completedAt).not.toBeNull()
    expect(done.weightKg).toBe(0)
    await setSetCompleted(set.id, false)
    expect((await db.sets.get(set.id))?.completedAt).toBeNull()
  })

  it('updateSet sanea valores', async () => {
    const session = await startWorkout()
    await addExerciseToWorkout(session.id, 'bench-press')
    const [set] = await getSessionSets(session.id)
    await updateSet(set.id, { weightKg: -5, reps: 7.6 })
    expect(await db.sets.get(set.id)).toMatchObject({ weightKg: 0, reps: 8 })
    await updateSet(set.id, { weightKg: null })
    expect(await db.sets.get(set.id)).toMatchObject({ weightKg: null, reps: 8 })
  })

  it('añade series copiando la anterior y quita la última', async () => {
    const session = await startWorkout()
    const block = await addExerciseToWorkout(session.id, 'bench-press')
    const sets = await getSessionSets(session.id)
    await updateSet(sets[2].id, { weightKg: 80, reps: 5 })
    const added = await addSet(session.id, block.id)
    expect(added).toMatchObject({ setNumber: 4, weightKg: 80, reps: 5, completedAt: null })
    await removeLastSet(session.id, block.id)
    await removeLastSet(session.id, block.id)
    expect((await getSessionSets(session.id)).map((s) => s.setNumber)).toEqual([1, 2])
  })

  it('reordena y quita ejercicios con sus series', async () => {
    const session = await startWorkout()
    const a = await addExerciseToWorkout(session.id, 'bench-press')
    const b = await addExerciseToWorkout(session.id, 'dips')
    await moveExerciseInWorkout(session.id, b.id, -1)
    expect((await db.workoutSessions.get(session.id))?.exercises.map((e) => e.id)).toEqual([b.id, a.id])
    await removeExerciseFromWorkout(session.id, b.id)
    expect((await db.workoutSessions.get(session.id))?.exercises.map((e) => e.id)).toEqual([a.id])
    expect((await getSessionSets(session.id)).every((s) => s.sessionExerciseId === a.id)).toBe(true)
  })

  it('finalizar guarda solo lo completado y calcula el resumen', async () => {
    const session = await startWorkout()
    const bench = await addExerciseToWorkout(session.id, 'bench-press')
    await addExerciseToWorkout(session.id, 'dips') // no se hace nada → se descarta
    const benchSets = (await getSessionSets(session.id)).filter((s) => s.sessionExerciseId === bench.id)
    // Hace la 1 y la 3 (se salta la 2)
    for (const set of [benchSets[0], benchSets[2]]) {
      await updateSet(set.id, { weightKg: 60, reps: 10 })
      await setSetCompleted(set.id, true)
    }

    const summary = await finishWorkout(session.id)
    expect(summary).toMatchObject({ completedSets: 2, exercises: 1, volumeKg: 1200 })

    const saved = await db.workoutSessions.get(session.id)
    expect(saved?.status).toBe('completed')
    expect(saved?.endedAt).not.toBeNull()
    expect(saved?.exercises.map((e) => e.id)).toEqual([bench.id])
    expect((await getSessionSets(session.id)).map((s) => s.setNumber)).toEqual([1, 2])
    expect(await getActiveSession()).toBeUndefined()
  })

  it('no permite finalizar sin series completadas', async () => {
    const session = await startWorkout({ routineId: 'routine-pull' })
    await expect(finishWorkout(session.id)).rejects.toThrow(/al menos una serie/)
  })

  it('descartar borra la sesión y sus series', async () => {
    const session = await startWorkout({ routineId: 'routine-pull' })
    await completeAll(session.id, { weightKg: 10, reps: 10 })
    await discardWorkout(session.id)
    expect(await db.workoutSessions.count()).toBe(0)
    expect(await db.sets.count()).toBe(0)
  })
})
