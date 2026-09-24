import type { WeightUnit } from '@/db/types'

/** Barra olímpica estándar y discos habituales de gimnasio. */
export const BAR_WEIGHT: Record<WeightUnit, number> = { kg: 20, lb: 45 }
const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}

export type PlateLoad = {
  /** Discos para cada lado, de mayor a menor. */
  perSide: number[]
  /** Peso que queda sin poder cargar con los discos disponibles (0 si cuadra). */
  remainder: number
}

/**
 * Discos por lado para un peso total (en la unidad visible). null si el peso
 * no llega a la barra vacía.
 */
export function platesFor(total: number, unit: WeightUnit, bar = BAR_WEIGHT[unit]): PlateLoad | null {
  if (!Number.isFinite(total) || total < bar) return null
  let side = Math.round(((total - bar) / 2) * 1000) / 1000
  const perSide: number[] = []
  for (const plate of PLATES[unit]) {
    while (side + 1e-9 >= plate) {
      perSide.push(plate)
      side = Math.round((side - plate) * 1000) / 1000
    }
  }
  return { perSide, remainder: Math.round(side * 2 * 100) / 100 }
}
