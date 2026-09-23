import { describe, expect, it } from 'vitest'
import { parseDecimal, toDisplayWeight, toStoredWeight } from './units'

describe('unidades de peso', () => {
  it('kg se muestra tal cual', () => {
    expect(toDisplayWeight(82.5, 'kg')).toBe(82.5)
    expect(toStoredWeight(82.5, 'kg')).toBe(82.5)
  })

  it('lb ida y vuelta sin deriva', () => {
    for (const lb of [45, 135, 225, 2.5, 17.5]) {
      expect(toDisplayWeight(toStoredWeight(lb, 'lb'), 'lb')).toBe(lb)
    }
    expect(toDisplayWeight(100, 'lb')).toBe(220.46)
  })

  it('parsea coma y punto decimal', () => {
    expect(parseDecimal('82,5')).toBe(82.5)
    expect(parseDecimal(' 82.5 ')).toBe(82.5)
    expect(parseDecimal('100')).toBe(100)
    expect(parseDecimal('.5')).toBe(0.5)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('.')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('-5')).toBeNull()
    expect(parseDecimal('1.2.3')).toBeNull()
  })
})
