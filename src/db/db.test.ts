import { describe, expect, it } from 'vitest'
import { AppDatabase, db } from './db'
import { deleteExercise, createExercise, listExercises, updateExercise } from './exercises'
import { getLastPerformance } from './history'
import {
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  listRoutines,
  moveRoutine,
  reorderRoutines,
  updateRoutine,
} from './routines'
import { getSettings, setSetting } from './settings'
import { MUSCLE_GROUPS, type WorkoutSession, type WorkoutSet } from './types'

describe('seed inicial', () => {
  it('precarga el catálogo con todos los grupos musculares', async () => {
    const exercises = await listExercises()
    expect(exercises.length).toBeGreaterThanOrEqual(50)
    for (const group of MUSCLE_GROUPS) {
      expect(exercises.some((e) => e.muscleGroup === group)).toBe(true)
    }
    expect(exercises.every((e) => !e.isCustom && !e.archived)).toBe(true)
  })

  it('precarga Push, Pull y Legs en orden y con ejercicios existentes', async () => {
    const routines = await listRoutines()
    expect(routines.map((r) => r.name)).toEqual(['Push (Empuje)', 'Pull (Tracción)', 'Legs (Pierna)'])
    const ids = new Set((await db.exercises.toArray()).map((e) => e.id))
    for (const routine of routines) {
      expect(routine.exercises.length).toBeGreaterThan(0)
      for (const e of routine.exercises) expect(ids.has(e.exerciseId)).toBe(true)
    }
  })

  it('solo se ejecuta la primera vez que se crea la base de datos', async () => {
    await deleteRoutine('routine-push')
    db.close()
    const reopened = new AppDatabase()
    await reopened.open()
    expect(await reopened.routines.get('routine-push')).toBeUndefined()
    expect(await reopened.routines.count()).toBe(2)
    reopened.close()
    await db.open()
  })
})

describe('rutinas', () => {
  it('crea rutinas al final y normaliza los objetivos', async () => {
    const routine = await createRoutine({
      name: '  Torso   A ',
      exercises: [{ exerciseId: 'bench-press', targetSets: 0, targetRepsMin: 10, targetRepsMax: 6, restSeconds: null }],
    })
    expect(routine.name).toBe('Torso A')
    expect(routine.order).toBe(3)
    expect(routine.exercises[0]).toMatchObject({ targetSets: 1, targetRepsMin: 10, targetRepsMax: 10 })
    expect(routine.exercises[0].id).toBeTruthy()
  })

  it('rechaza nombres vacíos', async () => {
    await expect(createRoutine({ name: '   ' })).rejects.toThrow()
  })

  it('edita nombre y ejercicios', async () => {
    await updateRoutine('routine-pull', {
      name: 'Pull B',
      exercises: [{ exerciseId: 'deadlift', targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, restSeconds: 180 }],
    })
    const routine = await db.routines.get('routine-pull')
    expect(routine?.name).toBe('Pull B')
    expect(routine?.exercises.map((e) => e.exerciseId)).toEqual(['deadlift'])
  })

  it('duplica justo debajo de la original con IDs nuevos', async () => {
    const copy = await duplicateRoutine('routine-push')
    const routines = await listRoutines()
    expect(routines.map((r) => r.id)).toEqual(['routine-push', copy.id, 'routine-pull', 'routine-legs'])
    expect(routines.map((r) => r.order)).toEqual([0, 1, 2, 3])
    expect(copy.name).toBe('Push (Empuje) (copia)')
    const original = await db.routines.get('routine-push')
    expect(copy.exercises.map((e) => e.exerciseId)).toEqual(original?.exercises.map((e) => e.exerciseId))
    expect(copy.exercises.some((e) => original?.exercises.some((o) => o.id === e.id))).toBe(false)
  })

  it('reordena y mueve rutinas', async () => {
    await reorderRoutines(['routine-legs', 'routine-push', 'routine-pull'])
    expect((await listRoutines()).map((r) => r.id)).toEqual(['routine-legs', 'routine-push', 'routine-pull'])
    await moveRoutine('routine-pull', -1)
    expect((await listRoutines()).map((r) => r.id)).toEqual(['routine-legs', 'routine-pull', 'routine-push'])
    await moveRoutine('routine-legs', -1) // ya es la primera: no hace nada
    expect((await listRoutines()).map((r) => r.id)).toEqual(['routine-legs', 'routine-pull', 'routine-push'])
  })

  it('al borrar conserva los entrenamientos hechos con ella', async () => {
    await db.workoutSessions.add(makeSession({ id: 's1', routineId: 'routine-legs' }))
    await deleteRoutine('routine-legs')
    expect(await db.routines.get('routine-legs')).toBeUndefined()
    expect((await db.workoutSessions.get('s1'))?.routineId).toBeNull()
  })
})

describe('ejercicios', () => {
  it('crea ejercicios personalizados', async () => {
    const exercise = await createExercise({ name: 'Remo Meadows', muscleGroup: 'back', equipment: 'barbell' })
    expect(exercise.isCustom).toBe(true)
    await updateExercise(exercise.id, { name: 'Remo Meadows unilateral' })
    expect((await db.exercises.get(exercise.id))?.name).toBe('Remo Meadows unilateral')
  })

  it('borra sin historial y lo quita de las rutinas', async () => {
    expect(await deleteExercise('bench-press')).toBe('deleted')
    expect(await db.exercises.get('bench-press')).toBeUndefined()
    const push = await db.routines.get('routine-push')
    expect(push?.exercises.some((e) => e.exerciseId === 'bench-press')).toBe(false)
  })

  it('archiva en lugar de borrar si tiene historial', async () => {
    await db.workoutSessions.add(makeSession({ id: 's1' }))
    await db.sets.add(makeSet({ id: 'x', sessionId: 's1', exerciseId: 'bench-press', completedAt: 1 }))
    expect(await deleteExercise('bench-press')).toBe('archived')
    expect((await db.exercises.get('bench-press'))?.archived).toBe(true)
    expect((await listExercises()).some((e) => e.id === 'bench-press')).toBe(false)
    expect((await listExercises({ includeArchived: true })).some((e) => e.id === 'bench-press')).toBe(true)
  })
})

describe('última marca (sobrecarga progresiva)', () => {
  it('devuelve las series completadas de la sesión más reciente', async () => {
    await db.workoutSessions.bulkAdd([makeSession({ id: 'old' }), makeSession({ id: 'new' }), makeSession({ id: 'now' })])
    await db.sets.bulkAdd([
      makeSet({ id: 'a', sessionId: 'old', setNumber: 1, weightKg: 60, reps: 8, completedAt: 100 }),
      makeSet({ id: 'b', sessionId: 'new', setNumber: 2, weightKg: 70, reps: 6, completedAt: 210 }),
      makeSet({ id: 'c', sessionId: 'new', setNumber: 1, weightKg: 70, reps: 8, completedAt: 200 }),
      makeSet({ id: 'd', sessionId: 'new', setNumber: 3, weightKg: 70, reps: null, completedAt: null }),
      makeSet({ id: 'e', sessionId: 'now', setNumber: 1, weightKg: 75, reps: 5, completedAt: 300 }),
      makeSet({ id: 'f', sessionId: 'new', exerciseId: 'deadlift', completedAt: 400 }),
    ])

    const last = await getLastPerformance('bench-press', { excludeSessionId: 'now' })
    expect(last?.sessionId).toBe('new')
    expect(last?.sets).toEqual([
      { setNumber: 1, weightKg: 70, reps: 8 },
      { setNumber: 2, weightKg: 70, reps: 6 },
    ])
    expect((await getLastPerformance('bench-press'))?.sessionId).toBe('now')
    expect(await getLastPerformance('lateral-raise')).toBeNull()
  })
})

describe('ajustes', () => {
  it('usa kg y 90 s por defecto y guarda cambios', async () => {
    expect(await getSettings()).toEqual({ weightUnit: 'kg', defaultRestSeconds: 90 })
    await setSetting('weightUnit', 'lb')
    expect((await getSettings()).weightUnit).toBe('lb')
  })
})

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session',
    routineId: null,
    name: 'Test',
    status: 'completed',
    exercises: [],
    notes: '',
    startedAt: 0,
    endedAt: 1,
    ...overrides,
  }
}

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set',
    sessionId: 'session',
    sessionExerciseId: 'block',
    exerciseId: 'bench-press',
    setNumber: 1,
    weightKg: 50,
    reps: 10,
    completedAt: null,
    ...overrides,
  }
}
