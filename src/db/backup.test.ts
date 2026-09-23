import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, BackupError, createBackup, parseBackup, restoreBackup, summarizeBackup } from './backup'
import { db } from './db'
import { createRoutine } from './routines'
import { setSetting } from './settings'

describe('backup / restore', () => {
  it('exporta y restaura todos los datos sin pérdidas', async () => {
    await createRoutine({ name: 'Full body' })
    await setSetting('weightUnit', 'lb')
    await db.workoutSessions.add({
      id: 's1',
      routineId: 'routine-push',
      name: 'Push',
      status: 'completed',
      exercises: [{ id: 'b1', exerciseId: 'bench-press', restSeconds: null, targetRepsMin: 5, targetRepsMax: 5 }],
      notes: '',
      startedAt: 1,
      endedAt: 2,
    })
    await db.sets.add({
      id: 'x1',
      sessionId: 's1',
      sessionExerciseId: 'b1',
      exerciseId: 'bench-press',
      setNumber: 1,
      weightKg: 80,
      reps: 5,
      completedAt: 2,
    })

    const backup = await createBackup()
    // Simula el viaje por un archivo .json
    const restored = parseBackup(JSON.parse(JSON.stringify(backup)))
    expect(summarizeBackup(restored)).toMatchObject({ routines: 4, workoutSessions: 1, sets: 1, settings: 1 })

    // Se pierde todo (p. ej. teléfono nuevo)…
    await db.delete()
    await db.open()
    await db.routines.clear()
    expect(await db.sets.count()).toBe(0)

    // …y se recupera.
    await restoreBackup(restored)
    expect(await db.routines.count()).toBe(4)
    expect(await db.sets.get('x1')).toMatchObject({ weightKg: 80, reps: 5 })
    expect(await db.settings.get('weightUnit')).toEqual({ key: 'weightUnit', value: 'lb' })
    expect(await db.exercises.count()).toBe(backup.data.exercises.length)
  })

  it('rechaza archivos que no son backups', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow(BackupError)
    expect(() => parseBackup(null)).toThrow(BackupError)
  })

  it('rechaza backups de una versión futura', async () => {
    const backup = { ...(await createBackup()), formatVersion: 999 }
    expect(() => parseBackup(backup)).toThrow(/versión más nueva/)
  })

  it('rechaza registros dañados sin tocar los datos actuales', async () => {
    const backup = await createBackup()
    const broken = {
      ...backup,
      data: { ...backup.data, exercises: [...backup.data.exercises, { id: 'x', name: 'Roto', muscleGroup: 'nope' }] },
    }
    expect(() => parseBackup(broken)).toThrow(/exercises/)
    expect(await db.routines.count()).toBe(3)
  })

  it('rechaza series huérfanas y ajustes inválidos', async () => {
    const backup = await createBackup()
    const orphan = {
      ...backup,
      data: {
        ...backup.data,
        sets: [
          {
            id: 'x',
            sessionId: 'nope',
            sessionExerciseId: 'b',
            exerciseId: 'bench-press',
            setNumber: 1,
            weightKg: 1,
            reps: 1,
            completedAt: null,
          },
        ],
      },
    }
    expect(() => parseBackup(orphan)).toThrow(/series/)
    const badSetting = { ...backup, data: { ...backup.data, settings: [{ key: 'weightUnit', value: 'stone' }] } }
    expect(() => parseBackup(badSetting)).toThrow(/settings/)
  })

  it('la restauración es atómica: si falla no se modifica nada', async () => {
    const backup = await createBackup()
    const valid = parseBackup(backup)
    // Fuerza un fallo a mitad de la transacción (clave duplicada en bulkAdd).
    valid.data.sets = [
      { id: 'dup', sessionId: 's', sessionExerciseId: 'b', exerciseId: 'e', setNumber: 1, weightKg: 1, reps: 1, completedAt: null },
      { id: 'dup', sessionId: 's', sessionExerciseId: 'b', exerciseId: 'e', setNumber: 2, weightKg: 1, reps: 1, completedAt: null },
    ]
    await expect(restoreBackup(valid)).rejects.toThrow()
    expect(await db.routines.count()).toBe(3)
    expect(await db.exercises.count()).toBe(backup.data.exercises.length)
  })

  it('usa un identificador de formato estable', async () => {
    expect((await createBackup()).format).toBe(BACKUP_FORMAT)
  })
})
