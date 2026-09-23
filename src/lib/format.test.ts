import { describe, expect, it } from 'vitest'
import { formatClock, formatRelativeDay, formatRepRange, formatRest } from './format'

describe('formato', () => {
  it('reloj', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(75_000)).toBe('1:15')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-500)).toBe('0:00')
  })

  it('descanso', () => {
    expect(formatRest(45)).toBe('45 s')
    expect(formatRest(90)).toBe('1:30')
    expect(formatRest(120)).toBe('2 min')
  })

  it('rango de reps', () => {
    expect(formatRepRange(8, 12)).toBe('8–12')
    expect(formatRepRange(5, 5)).toBe('5')
    expect(formatRepRange(null, null)).toBeNull()
  })

  it('días relativos', () => {
    const now = new Date(2026, 8, 23, 18).getTime()
    expect(formatRelativeDay(new Date(2026, 8, 23, 7).getTime(), now)).toBe('hoy')
    expect(formatRelativeDay(new Date(2026, 8, 22, 23).getTime(), now)).toBe('ayer')
    expect(formatRelativeDay(new Date(2026, 8, 20).getTime(), now)).toBe('hace 3 días')
  })
})
