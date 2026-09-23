import { newId } from '@/lib/id'
import { db } from './db'
import { buildSeedExercises } from './seed'
import type { Routine, RoutineExercise } from './types'

/** [ejercicio, series, reps mín, reps máx, descanso (s)] */
type ProgramExercise = [exerciseId: string, sets: number, repsMin: number, repsMax: number, restSeconds?: number]

export type ProgramLevel = 'Principiante' | 'Intermedio' | 'Avanzado'
export type ProgramPlace = 'gym' | 'dumbbells' | 'home'

export type ProgramTemplate = {
  id: string
  name: string
  summary: string
  level: ProgramLevel
  daysPerWeek: string
  /** Días por semana para los que es la mejor opción (para recomendar). */
  bestFor: number[]
  place: ProgramPlace
  routines: { name: string; description: string; exercises: ProgramExercise[] }[]
}

export const PLACE_LABELS: Record<ProgramPlace, string> = {
  gym: 'Gimnasio',
  dumbbells: 'Solo mancuernas',
  home: 'En casa, sin equipo',
}

/** Programas listos para usar. Todos los ejercicios existen en el catálogo base. */
export const PROGRAMS: ProgramTemplate[] = [
  {
    id: 'full-body',
    name: 'Cuerpo completo',
    summary: 'Todo el cuerpo en cada sesión. Ideal para empezar o con poco tiempo.',
    level: 'Principiante',
    daysPerWeek: '2–3 días',
    bestFor: [2, 3],
    place: 'gym',
    routines: [
      {
        name: 'Cuerpo completo A',
        description: 'Sentadilla, empuje y tracción',
        exercises: [
          ['back-squat', 3, 8, 10, 150],
          ['bench-press', 3, 8, 10, 120],
          ['barbell-row', 3, 8, 10, 120],
          ['dumbbell-shoulder-press', 2, 10, 12, 90],
          ['cable-crunch', 3, 12, 15, 60],
        ],
      },
      {
        name: 'Cuerpo completo B',
        description: 'Bisagra de cadera, empuje inclinado y jalón',
        exercises: [
          ['romanian-deadlift', 3, 8, 10, 150],
          ['incline-dumbbell-press', 3, 8, 12, 120],
          ['lat-pulldown', 3, 10, 12, 90],
          ['walking-lunge', 2, 10, 12, 90],
          ['plank', 3, 30, 45, 60],
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Torso / Pierna',
    summary: 'Cuatro días alternando torso y pierna. Buen equilibrio de volumen y descanso.',
    level: 'Intermedio',
    daysPerWeek: '4 días',
    bestFor: [4],
    place: 'gym',
    routines: [
      {
        name: 'Torso A',
        description: 'Fuerza de empuje y tracción horizontal',
        exercises: [
          ['bench-press', 4, 6, 8, 150],
          ['barbell-row', 4, 6, 8, 150],
          ['overhead-press', 3, 8, 10, 120],
          ['lat-pulldown', 3, 10, 12, 90],
          ['triceps-pushdown', 2, 10, 12, 60],
          ['barbell-curl', 2, 10, 12, 60],
        ],
      },
      {
        name: 'Pierna A',
        description: 'Cuádriceps y gemelo',
        exercises: [
          ['back-squat', 4, 6, 8, 180],
          ['leg-press', 3, 10, 12, 120],
          ['leg-extension', 3, 12, 15, 60],
          ['lying-leg-curl', 3, 10, 12, 90],
          ['standing-calf-raise', 4, 10, 15, 60],
        ],
      },
      {
        name: 'Torso B',
        description: 'Volumen de hombro, pecho y espalda',
        exercises: [
          ['incline-dumbbell-press', 4, 8, 12, 120],
          ['pull-up', 4, 6, 10, 150],
          ['seated-cable-row', 3, 10, 12, 90],
          ['lateral-raise', 3, 12, 15, 60],
          ['face-pull', 3, 12, 15, 60],
          ['hammer-curl', 2, 10, 12, 60],
        ],
      },
      {
        name: 'Pierna B',
        description: 'Femoral y glúteo',
        exercises: [
          ['romanian-deadlift', 4, 8, 10, 150],
          ['bulgarian-split-squat', 3, 8, 12, 90],
          ['hip-thrust', 3, 8, 12, 90],
          ['seated-leg-curl', 3, 10, 12, 60],
          ['hanging-leg-raise', 3, 10, 15, 60],
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    summary: 'Empuje, tracción y pierna. Tres días, o seis repitiendo el ciclo.',
    level: 'Intermedio',
    daysPerWeek: '3 o 6 días',
    bestFor: [5, 6],
    place: 'gym',
    routines: [
      {
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
    ],
  },
  {
    id: 'strength-5x5',
    name: 'Fuerza 5×5',
    summary: 'Pocos ejercicios, mucho peso. Sube un poco la carga cada sesión.',
    level: 'Intermedio',
    daysPerWeek: '3 días',
    bestFor: [3],
    place: 'gym',
    routines: [
      {
        name: '5×5 · Día A',
        description: 'Sentadilla, banca y remo',
        exercises: [
          ['back-squat', 5, 5, 5, 180],
          ['bench-press', 5, 5, 5, 180],
          ['barbell-row', 5, 5, 5, 150],
        ],
      },
      {
        name: '5×5 · Día B',
        description: 'Sentadilla, press militar y peso muerto',
        exercises: [
          ['back-squat', 5, 5, 5, 180],
          ['overhead-press', 5, 5, 5, 180],
          ['deadlift', 1, 5, 5, 180],
        ],
      },
    ],
  },
  {
    id: 'glutes',
    name: 'Glúteo y pierna',
    summary: 'Enfocado en glúteo y femoral, con trabajo de cuádriceps.',
    level: 'Principiante',
    daysPerWeek: '2 días',
    bestFor: [],
    place: 'gym',
    routines: [
      {
        name: 'Glúteo A',
        description: 'Hip thrust y zancada',
        exercises: [
          ['hip-thrust', 4, 8, 12, 120],
          ['bulgarian-split-squat', 3, 8, 12, 90],
          ['romanian-deadlift', 3, 8, 10, 120],
          ['hip-abduction', 3, 12, 20, 60],
          ['cable-kickback', 3, 12, 15, 60],
        ],
      },
      {
        name: 'Glúteo B',
        description: 'Sumo, goblet y subidas',
        exercises: [
          ['sumo-deadlift', 4, 6, 8, 150],
          ['goblet-squat', 3, 10, 12, 90],
          ['step-up', 3, 10, 12, 90],
          ['seated-leg-curl', 3, 10, 12, 60],
          ['glute-bridge', 3, 15, 20, 60],
        ],
      },
    ],
  },
  {
    id: 'dumbbells',
    name: 'Solo mancuernas',
    summary: 'Para casa o gimnasios pequeños: solo necesitas un par de mancuernas y un banco.',
    level: 'Principiante',
    daysPerWeek: '3 días',
    bestFor: [2, 3],
    place: 'dumbbells',
    routines: [
      {
        name: 'Mancuernas A',
        description: 'Empuje, tracción y pierna',
        exercises: [
          ['dumbbell-bench-press', 3, 8, 12, 90],
          ['dumbbell-row', 3, 8, 12, 90],
          ['goblet-squat', 3, 10, 12, 90],
          ['dumbbell-shoulder-press', 3, 8, 12, 90],
          ['dumbbell-curl', 2, 10, 12, 60],
          ['dumbbell-kickback', 2, 10, 12, 60],
        ],
      },
      {
        name: 'Mancuernas B',
        description: 'Cadera, inclinado y hombro',
        exercises: [
          ['dumbbell-romanian-deadlift', 3, 8, 12, 90],
          ['incline-dumbbell-press', 3, 8, 12, 90],
          ['bulgarian-split-squat', 3, 8, 12, 90],
          ['arnold-press', 3, 8, 12, 90],
          ['hammer-curl', 2, 10, 12, 60],
          ['lateral-raise', 3, 12, 15, 60],
        ],
      },
    ],
  },
  {
    id: 'home',
    name: 'En casa, sin equipo',
    summary: 'Solo con tu peso corporal. Sube las repeticiones cuando se haga fácil.',
    level: 'Principiante',
    daysPerWeek: '3 días',
    bestFor: [2, 3],
    place: 'home',
    routines: [
      {
        name: 'Casa A',
        description: 'Empuje, pierna y core',
        exercises: [
          ['push-up', 3, 8, 15, 60],
          ['bodyweight-squat', 3, 15, 20, 60],
          ['inverted-row', 3, 8, 12, 60],
          ['glute-bridge', 3, 15, 20, 45],
          ['plank', 3, 30, 45, 45],
          ['mountain-climber', 3, 20, 30, 45],
        ],
      },
      {
        name: 'Casa B',
        description: 'Hombro, tríceps y cardio',
        exercises: [
          ['pike-push-up', 3, 6, 10, 60],
          ['walking-lunge', 3, 10, 12, 60],
          ['bench-dip', 3, 10, 15, 60],
          ['incline-push-up', 3, 10, 15, 60],
          ['side-plank', 3, 20, 30, 45],
          ['burpee', 3, 8, 12, 60],
        ],
      },
    ],
  },
]

export function getProgram(id: string): ProgramTemplate | undefined {
  return PROGRAMS.find((p) => p.id === id)
}

/**
 * Programa recomendado según días por semana y lugar de entreno.
 * Casa y mancuernas tienen su propio programa; en gimnasio decide la frecuencia.
 */
export function recommendProgram(days: number, place: ProgramPlace): ProgramTemplate {
  if (place === 'home') return getProgram('home')!
  if (place === 'dumbbells') return getProgram('dumbbells')!
  return PROGRAMS.find((p) => p.place === 'gym' && p.bestFor.includes(days)) ?? getProgram('full-body')!
}

/**
 * Añade las rutinas de un programa a la lista: al final, o al principio si es
 * el programa elegido en la bienvenida (así "Siguiente" propone su primera
 * rutina). Si algún ejercicio del programa se borró o archivó, se restaura.
 */
export async function installProgram(
  programId: string,
  options: { position?: 'start' | 'end' } = {},
): Promise<Routine[]> {
  const program = getProgram(programId)
  if (!program) throw new Error('Programa no encontrado')

  return db.transaction('rw', db.routines, db.exercises, async () => {
    const needed = new Set(program.routines.flatMap((r) => r.exercises.map(([id]) => id)))
    const catalog = new Map(buildSeedExercises().map((e) => [e.id, e]))
    for (const id of needed) {
      const current = await db.exercises.get(id)
      if (!current) {
        const base = catalog.get(id)
        if (!base) throw new Error(`Ejercicio desconocido en el programa: ${id}`)
        await db.exercises.add(base)
      } else if (current.archived) {
        await db.exercises.update(id, { archived: false })
      }
    }

    const count = program.routines.length
    let order: number
    if (options.position === 'start') {
      // Hace hueco desplazando las rutinas existentes.
      await db.routines.toCollection().modify((r) => {
        r.order += count
      })
      order = 0
    } else {
      const last = await db.routines.orderBy('order').last()
      order = last ? last.order + 1 : 0
    }
    const now = Date.now()
    const routines: Routine[] = program.routines.map((r) => ({
      id: newId(),
      name: r.name,
      description: r.description,
      order: order++,
      createdAt: now,
      updatedAt: now,
      exercises: r.exercises.map(
        ([exerciseId, targetSets, targetRepsMin, targetRepsMax, restSeconds]): RoutineExercise => ({
          id: newId(),
          exerciseId,
          targetSets,
          targetRepsMin,
          targetRepsMax,
          restSeconds: restSeconds ?? null,
        }),
      ),
    }))
    await db.routines.bulkAdd(routines)
    return routines
  })
}
