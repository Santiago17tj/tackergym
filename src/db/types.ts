/**
 * Modelo de datos local (IndexedDB vía Dexie).
 *
 * Convenciones:
 * - IDs `string` (UUID) → no colisionan al restaurar backups ni al fusionar datos.
 *   Los ejercicios y rutinas precargados usan IDs estables legibles (`bench-press`).
 * - Fechas como epoch en milisegundos (`number`) → serializan a JSON sin pérdidas.
 * - El peso se guarda SIEMPRE en kg (`weightKg`). La unidad de Ajustes (kg/lb)
 *   solo afecta a cómo se muestra y se introduce.
 */

export const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'] as const
export type Equipment = (typeof EQUIPMENT)[number]

export const WEIGHT_UNITS = ['kg', 'lb'] as const
export type WeightUnit = (typeof WEIGHT_UNITS)[number]

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  /** true si lo creó el usuario (los del catálogo base son false). */
  isCustom: boolean
  /** Oculto del catálogo pero conservado porque tiene historial. */
  archived: boolean
  createdAt: number
  updatedAt: number
}

/** Un ejercicio dentro de una rutina (plantilla). */
export interface RoutineExercise {
  /** ID propio del bloque: permite repetir el mismo ejercicio y claves estables en React. */
  id: string
  exerciseId: string
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  /** Descanso específico en segundos; null = usar el de Ajustes. */
  restSeconds: number | null
}

export interface Routine {
  id: string
  name: string
  description: string
  /** Posición en la lista (reordenable). */
  order: number
  exercises: RoutineExercise[]
  createdAt: number
  updatedAt: number
}

export type WorkoutStatus = 'active' | 'completed'

/** Un ejercicio dentro de una sesión real (puede diferir de la rutina de origen). */
export interface SessionExercise {
  id: string
  exerciseId: string
  restSeconds: number | null
}

export interface WorkoutSession {
  id: string
  /** Rutina de origen; null si fue un entrenamiento libre o la rutina se borró. */
  routineId: string | null
  /** Nombre copiado al empezar, para que el historial no cambie si se edita la rutina. */
  name: string
  status: WorkoutStatus
  exercises: SessionExercise[]
  notes: string
  startedAt: number
  endedAt: number | null
}

export interface WorkoutSet {
  id: string
  sessionId: string
  /** Bloque de la sesión al que pertenece (`SessionExercise.id`). */
  sessionExerciseId: string
  exerciseId: string
  /** Número de serie dentro del bloque, empezando en 1. */
  setNumber: number
  weightKg: number | null
  reps: number | null
  /**
   * Momento en que se marcó como completada; null = pendiente.
   * (IndexedDB no indexa booleanos, así que el timestamp hace de flag e índice.)
   */
  completedAt: number | null
}

export interface AppSettings {
  weightUnit: WeightUnit
  /** Descanso por defecto en segundos. */
  defaultRestSeconds: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: 'kg',
  defaultRestSeconds: 90,
}

export type SettingKey = keyof AppSettings

/** Fila de la tabla `settings` (clave/valor tipado). */
export type SettingRow = { [K in SettingKey]: { key: K; value: AppSettings[K] } }[SettingKey]

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  legs: 'Piernas / Glúteo',
  shoulders: 'Hombros',
  arms: 'Brazos',
  core: 'Core',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
  band: 'Banda',
  other: 'Otro',
}
