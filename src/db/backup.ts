import { APP_NAME } from '@/config/app'
import { db, DB_SCHEMA_VERSION } from './db'
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  WEIGHT_UNITS,
  type Exercise,
  type Routine,
  type RoutineExercise,
  type SessionExercise,
  type SettingRow,
  type WorkoutSession,
  type WorkoutSet,
} from './types'

/** Identificador del formato de archivo (independiente del nombre visible de la app). */
export const BACKUP_FORMAT = 'sobrecarga-backup'
export const BACKUP_FORMAT_VERSION = 1

export type BackupData = {
  exercises: Exercise[]
  routines: Routine[]
  workoutSessions: WorkoutSession[]
  sets: WorkoutSet[]
  settings: SettingRow[]
}

export type BackupFile = {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  schemaVersion: number
  app: string
  exportedAt: string
  data: BackupData
}

export class BackupError extends Error {
  override name = 'BackupError'
}

// ---------------------------------------------------------------------------
// Exportar
// ---------------------------------------------------------------------------

export async function createBackup(): Promise<BackupFile> {
  const data = await db.transaction('r', db.exercises, db.routines, db.workoutSessions, db.sets, db.settings, async () => ({
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    workoutSessions: await db.workoutSessions.toArray(),
    sets: await db.sets.toArray(),
    settings: await db.settings.toArray(),
  }))
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: DB_SCHEMA_VERSION,
    app: APP_NAME,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`
  return `${BACKUP_FORMAT}_${stamp}.json`
}

export type ExportResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Genera el backup y lo entrega al usuario. En móviles usa la hoja de compartir
 * nativa (permite "Guardar en Archivos", Drive, WhatsApp…); si no está disponible
 * descarga el archivo directamente.
 */
export async function exportBackup(): Promise<ExportResult> {
  const backup = await createBackup()
  const json = JSON.stringify(backup, null, 2)
  const name = backupFileName()
  const file = new File([json], name, { type: 'application/json' })

  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
  if (isTouchDevice && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Cualquier otro fallo: se intenta la descarga clásica.
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

type Guard<T> = (value: unknown) => value is T

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNullableNumber = (v: unknown): v is number | null => v === null || isNumber(v)
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'
const oneOf =
  <T extends string>(values: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as readonly string[]).includes(v)

function shape<T>(spec: Record<string, (v: unknown) => boolean>): Guard<T> {
  return (value): value is T => isObject(value) && Object.entries(spec).every(([key, check]) => check(value[key]))
}

const isRoutineExercise = shape<RoutineExercise>({
  id: isNonEmptyString,
  exerciseId: isNonEmptyString,
  targetSets: isNumber,
  targetRepsMin: isNumber,
  targetRepsMax: isNumber,
  restSeconds: isNullableNumber,
})

const isSessionExercise = shape<SessionExercise>({
  id: isNonEmptyString,
  exerciseId: isNonEmptyString,
  restSeconds: isNullableNumber,
  targetRepsMin: isNullableNumber,
  targetRepsMax: isNullableNumber,
})

const arrayOf =
  <T>(guard: Guard<T>) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(guard)

const guards: { [K in keyof BackupData]: Guard<BackupData[K][number]> } = {
  exercises: shape<Exercise>({
    id: isNonEmptyString,
    name: isNonEmptyString,
    muscleGroup: oneOf(MUSCLE_GROUPS),
    equipment: oneOf(EQUIPMENT),
    isCustom: isBoolean,
    archived: isBoolean,
    createdAt: isNumber,
    updatedAt: isNumber,
  }),
  routines: shape<Routine>({
    id: isNonEmptyString,
    name: isNonEmptyString,
    description: isString,
    order: isNumber,
    exercises: arrayOf(isRoutineExercise),
    createdAt: isNumber,
    updatedAt: isNumber,
  }),
  workoutSessions: shape<WorkoutSession>({
    id: isNonEmptyString,
    routineId: (v) => v === null || isNonEmptyString(v),
    name: isString,
    status: oneOf(['active', 'completed'] as const),
    exercises: arrayOf(isSessionExercise),
    notes: isString,
    startedAt: isNumber,
    endedAt: isNullableNumber,
  }),
  sets: shape<WorkoutSet>({
    id: isNonEmptyString,
    sessionId: isNonEmptyString,
    sessionExerciseId: isNonEmptyString,
    exerciseId: isNonEmptyString,
    setNumber: isNumber,
    weightKg: isNullableNumber,
    reps: isNullableNumber,
    completedAt: isNullableNumber,
  }),
  settings: (v): v is SettingRow => {
    if (!isObject(v)) return false
    if (v.key === 'weightUnit') return oneOf(WEIGHT_UNITS)(v.value)
    if (v.key === 'defaultRestSeconds') return isNumber(v.value) && v.value >= 0
    if (v.key === 'autoStartRest' || v.key === 'restSound' || v.key === 'restVibration') return isBoolean(v.value)
    return false
  },
}

/**
 * Valida un backup ya parseado. Lanza `BackupError` con un mensaje legible
 * indicando qué falla; nunca se escribe nada si la validación no pasa.
 */
export function parseBackup(raw: unknown): BackupFile {
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) {
    throw new BackupError('El archivo no es una copia de seguridad válida de la app.')
  }
  if (!isNumber(raw.formatVersion) || raw.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError('La copia se creó con una versión más nueva de la app. Actualízala e inténtalo de nuevo.')
  }
  if (!isObject(raw.data)) throw new BackupError('La copia de seguridad no contiene datos.')

  const data = raw.data
  const result = {} as Record<keyof BackupData, unknown[]>
  for (const table of Object.keys(guards) as (keyof BackupData)[]) {
    const rows = data[table] ?? []
    if (!Array.isArray(rows)) throw new BackupError(`La sección "${table}" está dañada.`)
    const guard = guards[table] as (v: unknown) => boolean
    const badIndex = rows.findIndex((row) => !guard(row))
    if (badIndex !== -1) throw new BackupError(`Registro inválido en "${table}" (posición ${badIndex + 1}).`)
    const ids = new Set(rows.map((r: Record<string, unknown>) => r.id ?? r.key))
    if (ids.size !== rows.length) throw new BackupError(`Hay registros duplicados en "${table}".`)
    result[table] = rows
  }

  const backupData = result as BackupData
  const sessionIds = new Set(backupData.workoutSessions.map((s) => s.id))
  if (backupData.sets.some((s) => !sessionIds.has(s.sessionId))) {
    throw new BackupError('Hay series que no pertenecen a ningún entrenamiento.')
  }
  if (backupData.workoutSessions.filter((s) => s.status === 'active').length > 1) {
    throw new BackupError('La copia contiene más de un entrenamiento activo.')
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: raw.formatVersion,
    schemaVersion: isNumber(raw.schemaVersion) ? raw.schemaVersion : DB_SCHEMA_VERSION,
    app: isString(raw.app) ? raw.app : APP_NAME,
    exportedAt: isString(raw.exportedAt) ? raw.exportedAt : '',
    data: backupData,
  }
}

// ---------------------------------------------------------------------------
// Importar
// ---------------------------------------------------------------------------

export type BackupSummary = { [K in keyof BackupData]: number }

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const d = backup.data
  return {
    exercises: d.exercises.length,
    routines: d.routines.length,
    workoutSessions: d.workoutSessions.length,
    sets: d.sets.length,
    settings: d.settings.length,
  }
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new BackupError('No se pudo leer el archivo: no es un JSON válido.')
  }
  return parseBackup(raw)
}

/**
 * Sustituye TODOS los datos actuales por los del backup en una única
 * transacción: si algo falla, no se modifica nada.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const { data } = backup
  await db.transaction('rw', db.exercises, db.routines, db.workoutSessions, db.sets, db.settings, async () => {
    await Promise.all([
      db.exercises.clear(),
      db.routines.clear(),
      db.workoutSessions.clear(),
      db.sets.clear(),
      db.settings.clear(),
    ])
    await db.exercises.bulkAdd(data.exercises)
    await db.routines.bulkAdd(data.routines)
    await db.workoutSessions.bulkAdd(data.workoutSessions)
    await db.sets.bulkAdd(data.sets)
    await db.settings.bulkAdd(data.settings)
  })
}
