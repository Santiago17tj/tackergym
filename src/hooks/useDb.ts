/**
 * Hooks reactivos sobre IndexedDB. Con `useLiveQuery` la UI se actualiza sola
 * cuando cambian los datos (incluso desde otra pestaña).
 *
 * Todos devuelven `undefined` mientras cargan: distingue "cargando" de "vacío".
 * Como la app es una SPA sin SSR, IndexedDB solo se lee en el navegador.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import {
  db,
  getLastPerformance,
  listExercises,
  listRoutines,
  MUSCLE_GROUPS,
  resolveSettings,
  type AppSettings,
  type Exercise,
  type MuscleGroup,
  type Routine,
  type RoutineExercise,
  type WeightUnit,
} from '@/db'

// ---------------------------------------------------------------------------
// Ejercicios
// ---------------------------------------------------------------------------

export type ExerciseFilter = {
  muscleGroup?: MuscleGroup
  /** Búsqueda por nombre, sin distinguir mayúsculas ni acentos. */
  search?: string
  includeArchived?: boolean
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export function useExercises(filter: ExerciseFilter = {}): Exercise[] | undefined {
  const { muscleGroup, search, includeArchived } = filter
  const exercises = useLiveQuery(
    () => listExercises({ muscleGroup, includeArchived }),
    [muscleGroup, includeArchived],
  )
  return useMemo(() => {
    if (!exercises || !search?.trim()) return exercises
    const query = normalize(search)
    return exercises.filter((e) => normalize(e.name).includes(query))
  }, [exercises, search])
}

/** Catálogo agrupado por grupo muscular, en el orden de `MUSCLE_GROUPS`. */
export function useExercisesByGroup(filter: Omit<ExerciseFilter, 'muscleGroup'> = {}) {
  const exercises = useExercises(filter)
  return useMemo(() => {
    if (!exercises) return undefined
    const groups = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, [] as Exercise[]])) as Record<
      MuscleGroup,
      Exercise[]
    >
    for (const exercise of exercises) groups[exercise.muscleGroup].push(exercise)
    return groups
  }, [exercises])
}

export function useExercise(id: string | undefined): Exercise | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.exercises.get(id)) ?? null) : null), [id])
}

/** Mapa id → ejercicio (incluye archivados) para resolver referencias rápidamente. */
export function useExerciseMap(): Map<string, Exercise> | undefined {
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => exercises && new Map(exercises.map((e) => [e.id, e])), [exercises])
}

// ---------------------------------------------------------------------------
// Rutinas
// ---------------------------------------------------------------------------

export function useRoutines(): Routine[] | undefined {
  return useLiveQuery(() => listRoutines(), [])
}

export function useRoutine(id: string | undefined): Routine | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.routines.get(id)) ?? null) : null), [id])
}

export type ResolvedRoutineExercise = RoutineExercise & { exercise: Exercise | null }
export type RoutineWithExercises = Omit<Routine, 'exercises'> & { exercises: ResolvedRoutineExercise[] }

async function resolveRoutines(routines: Routine[]): Promise<RoutineWithExercises[]> {
  const ids = [...new Set(routines.flatMap((r) => r.exercises.map((e) => e.exerciseId)))]
  const exercises = await db.exercises.bulkGet(ids)
  const byId = new Map(exercises.filter((e): e is Exercise => !!e).map((e) => [e.id, e]))
  return routines.map((routine) => ({
    ...routine,
    exercises: routine.exercises.map((e) => ({ ...e, exercise: byId.get(e.exerciseId) ?? null })),
  }))
}

/** Rutinas con sus ejercicios ya resueltos (nombre, grupo muscular…). */
export function useRoutinesWithExercises(): RoutineWithExercises[] | undefined {
  return useLiveQuery(async () => resolveRoutines(await listRoutines()), [])
}

export function useRoutineWithExercises(id: string | undefined): RoutineWithExercises | null | undefined {
  return useLiveQuery(async () => {
    const routine = id ? await db.routines.get(id) : undefined
    return routine ? (await resolveRoutines([routine]))[0] : null
  }, [id])
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

export function useLastPerformance(exerciseId: string | undefined, excludeSessionId?: string) {
  return useLiveQuery(
    () => (exerciseId ? getLastPerformance(exerciseId, { excludeSessionId }) : null),
    [exerciseId, excludeSessionId],
  )
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(async () => resolveSettings(await db.settings.toArray()), [])
}

/** Unidad de peso activa. Devuelve 'kg' mientras carga para no parpadear. */
export function useWeightUnit(): WeightUnit {
  return useSettings()?.weightUnit ?? 'kg'
}

// ---------------------------------------------------------------------------
// Estadísticas generales
// ---------------------------------------------------------------------------

export function useDataCounts() {
  return useLiveQuery(async () => {
    const [exercises, routines, workouts, sets] = await Promise.all([
      db.exercises.filter((e) => !e.archived).count(),
      db.routines.count(),
      db.workoutSessions.where('status').equals('completed').count(),
      db.sets.count(),
    ])
    return { exercises, routines, workouts, sets }
  }, [])
}
