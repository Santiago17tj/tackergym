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
  getActiveSession,
  getLastPerformance,
  getSessionSets,
  type LastPerformance,
  type SessionExercise,
  type WorkoutSession,
  type WorkoutSet,
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

/**
 * Última marca de varios ejercicios a la vez (columna "Anterior" del
 * entrenamiento en vivo), excluyendo la sesión en curso.
 */
export function useLastPerformances(
  exerciseIds: string[],
  excludeSessionId?: string,
): Map<string, LastPerformance | null> | undefined {
  const key = [...new Set(exerciseIds)].sort().join('|')
  return useLiveQuery(async () => {
    const ids = key ? key.split('|') : []
    const results = await Promise.all(ids.map((id) => getLastPerformance(id, { excludeSessionId })))
    return new Map(ids.map((id, i) => [id, results[i]]))
  }, [key, excludeSessionId])
}

/** Fecha del último entrenamiento completado de cada rutina. */
export function useRoutineLastDone(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.workoutSessions.where('status').equals('completed').toArray()
    const map = new Map<string, number>()
    for (const s of sessions) {
      if (s.routineId && s.startedAt > (map.get(s.routineId) ?? 0)) map.set(s.routineId, s.startedAt)
    }
    return map
  }, [])
}

// ---------------------------------------------------------------------------
// Entrenamiento activo
// ---------------------------------------------------------------------------

export type ActiveWorkoutBlock = {
  block: SessionExercise
  exercise: Exercise | null
  sets: WorkoutSet[]
}

export type ActiveWorkout = {
  session: WorkoutSession
  blocks: ActiveWorkoutBlock[]
  completedSets: number
  totalSets: number
}

/** Entrenamiento en curso con sus ejercicios y series; null si no hay ninguno. */
export function useActiveWorkout(): ActiveWorkout | null | undefined {
  return useLiveQuery(async () => {
    const session = await getActiveSession()
    if (!session) return null
    const [sets, exercises] = await Promise.all([
      getSessionSets(session.id),
      db.exercises.bulkGet(session.exercises.map((b) => b.exerciseId)),
    ])
    const blocks = session.exercises.map((block, i) => ({
      block,
      exercise: exercises[i] ?? null,
      sets: sets.filter((s) => s.sessionExerciseId === block.id),
    }))
    return {
      session,
      blocks,
      completedSets: sets.filter((s) => s.completedAt !== null).length,
      totalSets: sets.length,
    }
  }, [])
}

/** true si hay un entrenamiento en curso (para el indicador de la navegación). */
export function useHasActiveWorkout(): boolean {
  return useLiveQuery(async () => (await db.workoutSessions.where('status').equals('active').count()) > 0, []) ?? false
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
