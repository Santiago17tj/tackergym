import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '@/db'
import type { ResolvedRoutineExercise } from '@/hooks/useDb'

/** Segundos que dura una serie de media (sin contar el descanso). */
const SET_WORK_SECONDS = 40

/** Grupos musculares de una rutina, del más trabajado al menos (por nº de series). */
export function routineMuscleGroups(exercises: ResolvedRoutineExercise[]): string[] {
  const sets = new Map<MuscleGroup, number>()
  for (const item of exercises) {
    if (!item.exercise) continue
    sets.set(item.exercise.muscleGroup, (sets.get(item.exercise.muscleGroup) ?? 0) + item.targetSets)
  }
  return [...sets.entries()].sort((a, b) => b[1] - a[1]).map(([group]) => MUSCLE_GROUP_LABELS[group])
}

/** Duración estimada en minutos (múltiplo de 5): series × (trabajo + descanso). */
export function estimateRoutineMinutes(exercises: ResolvedRoutineExercise[], defaultRestSeconds: number): number {
  const seconds = exercises.reduce(
    (sum, e) => sum + e.targetSets * (SET_WORK_SECONDS + (e.restSeconds ?? defaultRestSeconds)),
    0,
  )
  return Math.max(5, Math.round(seconds / 60 / 5) * 5)
}
