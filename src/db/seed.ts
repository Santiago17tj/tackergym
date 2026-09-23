import type { Transaction } from 'dexie'
import type { Equipment, Exercise, MuscleGroup, Routine, RoutineExercise } from './types'

type SeedExercise = [id: string, name: string, equipment: Equipment]

/** Catálogo base. Los IDs son estables: las rutinas de ejemplo los referencian. */
const SEED_EXERCISES: Record<MuscleGroup, SeedExercise[]> = {
  chest: [
    ['bench-press', 'Press de banca', 'barbell'],
    ['incline-bench-press', 'Press inclinado con barra', 'barbell'],
    ['dumbbell-bench-press', 'Press de banca con mancuernas', 'dumbbell'],
    ['incline-dumbbell-press', 'Press inclinado con mancuernas', 'dumbbell'],
    ['machine-chest-press', 'Press de pecho en máquina', 'machine'],
    ['cable-fly', 'Aperturas en polea', 'cable'],
    ['pec-deck', 'Pec deck (contractor)', 'machine'],
    ['dips', 'Fondos en paralelas', 'bodyweight'],
    ['push-up', 'Flexiones', 'bodyweight'],
  ],
  back: [
    ['deadlift', 'Peso muerto', 'barbell'],
    ['pull-up', 'Dominadas', 'bodyweight'],
    ['lat-pulldown', 'Jalón al pecho', 'cable'],
    ['barbell-row', 'Remo con barra', 'barbell'],
    ['dumbbell-row', 'Remo con mancuerna', 'dumbbell'],
    ['seated-cable-row', 'Remo sentado en polea', 'cable'],
    ['t-bar-row', 'Remo en T', 'barbell'],
    ['straight-arm-pulldown', 'Pullover en polea', 'cable'],
    ['face-pull', 'Face pull', 'cable'],
  ],
  legs: [
    ['back-squat', 'Sentadilla con barra', 'barbell'],
    ['front-squat', 'Sentadilla frontal', 'barbell'],
    ['leg-press', 'Prensa de piernas', 'machine'],
    ['romanian-deadlift', 'Peso muerto rumano', 'barbell'],
    ['bulgarian-split-squat', 'Sentadilla búlgara', 'dumbbell'],
    ['walking-lunge', 'Zancadas', 'dumbbell'],
    ['hip-thrust', 'Hip thrust', 'barbell'],
    ['leg-extension', 'Extensión de cuádriceps', 'machine'],
    ['lying-leg-curl', 'Curl femoral tumbado', 'machine'],
    ['seated-leg-curl', 'Curl femoral sentado', 'machine'],
    ['hip-abduction', 'Abducción de cadera', 'machine'],
    ['standing-calf-raise', 'Elevación de talones de pie', 'machine'],
  ],
  shoulders: [
    ['overhead-press', 'Press militar', 'barbell'],
    ['dumbbell-shoulder-press', 'Press de hombro con mancuernas', 'dumbbell'],
    ['machine-shoulder-press', 'Press de hombro en máquina', 'machine'],
    ['lateral-raise', 'Elevaciones laterales', 'dumbbell'],
    ['cable-lateral-raise', 'Elevaciones laterales en polea', 'cable'],
    ['rear-delt-fly', 'Pájaros (deltoide posterior)', 'dumbbell'],
    ['reverse-pec-deck', 'Pec deck inverso', 'machine'],
    ['shrug', 'Encogimientos de hombros', 'dumbbell'],
  ],
  arms: [
    ['barbell-curl', 'Curl con barra', 'barbell'],
    ['dumbbell-curl', 'Curl con mancuernas', 'dumbbell'],
    ['hammer-curl', 'Curl martillo', 'dumbbell'],
    ['preacher-curl', 'Curl predicador', 'machine'],
    ['cable-curl', 'Curl en polea', 'cable'],
    ['triceps-pushdown', 'Extensión de tríceps en polea', 'cable'],
    ['overhead-triceps-extension', 'Extensión de tríceps sobre la cabeza', 'cable'],
    ['skull-crusher', 'Press francés', 'barbell'],
    ['close-grip-bench-press', 'Press de banca agarre cerrado', 'barbell'],
  ],
  core: [
    ['plank', 'Plancha', 'bodyweight'],
    ['hanging-leg-raise', 'Elevación de piernas colgado', 'bodyweight'],
    ['cable-crunch', 'Crunch en polea', 'cable'],
    ['ab-wheel', 'Rueda abdominal', 'other'],
    ['russian-twist', 'Giros rusos', 'bodyweight'],
    ['crunch', 'Crunch abdominal', 'bodyweight'],
  ],
}

type SeedRoutineExercise = [exerciseId: string, sets: number, repsMin: number, repsMax: number, restSeconds?: number]

const SEED_ROUTINES: { id: string; name: string; description: string; exercises: SeedRoutineExercise[] }[] = [
  {
    id: 'routine-push',
    name: 'Push (Empuje)',
    description: 'Pecho, hombros y tríceps',
    exercises: [
      ['bench-press', 4, 6, 8, 150],
      ['incline-dumbbell-press', 3, 8, 12, 120],
      ['dumbbell-shoulder-press', 3, 8, 12, 120],
      ['lateral-raise', 3, 12, 15, 60],
      ['cable-fly', 3, 12, 15, 60],
      ['triceps-pushdown', 3, 10, 12, 60],
    ],
  },
  {
    id: 'routine-pull',
    name: 'Pull (Tracción)',
    description: 'Espalda, deltoide posterior y bíceps',
    exercises: [
      ['pull-up', 4, 6, 10, 150],
      ['barbell-row', 3, 8, 10, 120],
      ['lat-pulldown', 3, 10, 12, 90],
      ['seated-cable-row', 3, 10, 12, 90],
      ['face-pull', 3, 12, 15, 60],
      ['barbell-curl', 3, 8, 12, 60],
      ['hammer-curl', 2, 10, 12, 60],
    ],
  },
  {
    id: 'routine-legs',
    name: 'Legs (Pierna)',
    description: 'Cuádriceps, femoral, glúteo y gemelo',
    exercises: [
      ['back-squat', 4, 6, 8, 180],
      ['romanian-deadlift', 3, 8, 10, 150],
      ['leg-press', 3, 10, 12, 120],
      ['lying-leg-curl', 3, 10, 12, 90],
      ['leg-extension', 3, 12, 15, 60],
      ['standing-calf-raise', 4, 10, 15, 60],
    ],
  },
]

export function buildSeedExercises(now = Date.now()): Exercise[] {
  return (Object.entries(SEED_EXERCISES) as [MuscleGroup, SeedExercise[]][]).flatMap(([muscleGroup, list]) =>
    list.map(([id, name, equipment]) => ({
      id,
      name,
      muscleGroup,
      equipment,
      isCustom: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })),
  )
}

export function buildSeedRoutines(now = Date.now()): Routine[] {
  return SEED_ROUTINES.map((routine, order) => ({
    id: routine.id,
    name: routine.name,
    description: routine.description,
    order,
    createdAt: now,
    updatedAt: now,
    exercises: routine.exercises.map(
      ([exerciseId, targetSets, targetRepsMin, targetRepsMax, restSeconds], i): RoutineExercise => ({
        id: `${routine.id}-${i}`,
        exerciseId,
        targetSets,
        targetRepsMin,
        targetRepsMax,
        restSeconds: restSeconds ?? null,
      }),
    ),
  }))
}

export async function seedDatabase(tx: Transaction): Promise<void> {
  const now = Date.now()
  await tx.table<Exercise, string>('exercises').bulkAdd(buildSeedExercises(now))
  await tx.table<Routine, string>('routines').bulkAdd(buildSeedRoutines(now))
}
