import { Dexie, type EntityTable, type Table } from 'dexie'
import { addMissingCatalogExercises, seedDatabase } from './seed'
import type { Exercise, Routine, SettingKey, SettingRow, WorkoutSession, WorkoutSet } from './types'

export const DB_NAME = 'sobrecarga'

/**
 * Versión del esquema. Si se cambian índices o la forma de los datos, añade un
 * nuevo `this.version(n).stores(...)` con `.upgrade()` en lugar de editar el actual.
 */
export const DB_SCHEMA_VERSION = 2

export class AppDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  settings!: Table<SettingRow, SettingKey>

  constructor(name = DB_NAME) {
    super(name)

    // Solo se listan la clave primaria y los campos indexados.
    this.version(1).stores({
      exercises: 'id, name, muscleGroup',
      routines: 'id, order',
      workoutSessions: 'id, status, startedAt, routineId',
      // [exerciseId+completedAt] → "última vez que hice este ejercicio" sin escanear la tabla
      sets: 'id, sessionId, [exerciseId+completedAt]',
      settings: 'key',
    })

    // v2: mismo esquema; incorpora los ejercicios nuevos del catálogo a bases
    // de datos ya existentes (sin tocar los datos del usuario).
    this.version(2)
      .stores({})
      .upgrade((tx) => addMissingCatalogExercises(tx))

    // Se ejecuta UNA sola vez: cuando la base de datos se crea por primera vez.
    this.on('populate', (tx) => seedDatabase(tx))
  }
}

export const db = new AppDatabase()
