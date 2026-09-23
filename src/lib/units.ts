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

const numberFormats = new Map<number, Intl.NumberFormat>()

/** Número con el separador decimal del idioma del dispositivo (82,5 / 82.5). */
export function formatNumber(value: number, maxDecimals = 2): string {
  let format = numberFormats.get(maxDecimals)
  if (!format) {
    format = new Intl.NumberFormat(undefined, { maximumFractionDigits: maxDecimals })
    numberFormats.set(maxDecimals, format)
  }
  return format.format(value)
}

export function formatWeight(kg: number, unit: WeightUnit, maxDecimals = 2): string {
  return `${formatNumber(toDisplayWeight(kg, unit), maxDecimals)} ${unit}`
}

/** "82,5 kg × 8", "Peso corporal × 12"; null si aún no hay repeticiones. */
export function formatSet(weightKg: number | null, reps: number | null, unit: WeightUnit): string | null {
  if (reps === null) return null
  const weight = weightKg ? `${formatNumber(toDisplayWeight(weightKg, unit))} ${unit}` : 'Peso corporal'
  return `${weight} × ${reps}`
}
