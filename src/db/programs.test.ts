import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { AppDatabase, db } from './db'
import { deleteExercise } from './exercises'
import { installProgram, PROGRAMS, recommendProgram } from './programs'
import { buildSeedExercises } from './seed'

describe('programas', () => {
  it('todos los ejercicios de los programas existen en el catálogo', () => {
    const catalog = new Set(buildSeedExercises().map((e) => e.id))
    for (const program of PROGRAMS)
      for (const routine of program.routines)
        for (const [id] of routine.exercises) expect(catalog.has(id), `${program.id}: ${id}`).toBe(true)
  })

  it('instala las rutinas de un programa al final', async () => {
    const routines = await installProgram('upper-lower')
    expect(routines.map((r) => r.name)).toEqual(['Torso A', 'Pierna A', 'Torso B', 'Pierna B'])
    const all = await db.routines.orderBy('order').toArray()
    expect(all.slice(-4).map((r) => r.name)).toEqual(['Torso A', 'Pierna A', 'Torso B', 'Pierna B'])
    expect(all.map((r) => r.order)).toEqual(all.map((_, i) => i))
  })

  it('puede instalarse al principio de la lista', async () => {
    await installProgram('strength-5x5', { position: 'start' })
    const all = await db.routines.orderBy('order').toArray()
    expect(all.map((r) => r.name)).toEqual(['5×5 · Día A', '5×5 · Día B', 'Push (Empuje)', 'Pull (Tracción)', 'Legs (Pierna)'])
    expect(all.map((r) => r.order)).toEqual([0, 1, 2, 3, 4])
  })

  it('restaura ejercicios borrados o archivados que el programa necesita', async () => {
    await deleteExercise('hip-thrust') // sin historial → se borra
    expect(await db.exercises.get('hip-thrust')).toBeUndefined()
    await installProgram('glutes')
    expect((await db.exercises.get('hip-thrust'))?.archived).toBe(false)
  })

  it('recomienda según días y lugar', () => {
    expect(recommendProgram(3, 'gym').id).toBe('full-body')
    expect(recommendProgram(4, 'gym').id).toBe('upper-lower')
    expect(recommendProgram(6, 'gym').id).toBe('ppl')
    expect(recommendProgram(4, 'home').id).toBe('home')
    expect(recommendProgram(3, 'dumbbells').id).toBe('dumbbells')
  })
})

describe('migración v1 → v2', () => {
  it('añade los ejercicios nuevos del catálogo sin tocar los datos existentes', async () => {
    const name = 'migracion-test'
    await Dexie.delete(name)
    // Base de datos "antigua" con el esquema v1 y solo dos ejercicios
    const old = new Dexie(name)
    old.version(1).stores({
      exercises: 'id, name, muscleGroup',
      routines: 'id, order',
      workoutSessions: 'id, status, startedAt, routineId',
      sets: 'id, sessionId, [exerciseId+completedAt]',
      settings: 'key',
    })
    await old.open()
    const now = Date.now()
    await old.table('exercises').bulkAdd([
      { id: 'bench-press', name: 'Mi press renombrado', muscleGroup: 'chest', equipment: 'barbell', isCustom: false, archived: false, createdAt: now, updatedAt: now },
      { id: 'mi-ejercicio', name: 'Mío', muscleGroup: 'core', equipment: 'other', isCustom: true, archived: false, createdAt: now, updatedAt: now },
    ])
    old.close()

    const upgraded = new AppDatabase(name)
    await upgraded.open()
    expect((await upgraded.exercises.get('bench-press'))?.name).toBe('Mi press renombrado')
    expect(await upgraded.exercises.get('mi-ejercicio')).toBeDefined()
    expect(await upgraded.exercises.get('goblet-squat')).toBeDefined()
    expect(await upgraded.exercises.count()).toBe(buildSeedExercises().length + 1)
    upgraded.close()
    await Dexie.delete(name)
  })
})
