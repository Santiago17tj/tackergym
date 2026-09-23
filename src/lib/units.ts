import type { WeightUnit } from '@/db/types'

export const KG_PER_LB = 0.45359237

/** kg (almacenado) → valor en la unidad de visualización, redondeado a 2 decimales. */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const value = unit === 'kg' ? kg : kg / KG_PER_LB
  return Math.round(value * 100) / 100
}

/** Valor introducido por el usuario en su unidad → kg para almacenar. */
export function toStoredWeight(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB
}

/**
 * Parsea lo que escribe el usuario en un input numérico. Acepta coma o punto
 * decimal (teclados en español). Devuelve null si está vacío o no es válido.
 */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.')
  if (normalized === '' || !/^\d*\.?\d*$/.test(normalized) || normalized === '.') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${numberFormat.format(toDisplayWeight(kg, unit))} ${unit}`
}
