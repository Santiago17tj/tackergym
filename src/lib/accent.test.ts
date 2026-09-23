import { describe, expect, it } from 'vitest'
import { ACCENT_PRESETS, contrastRatio, ensureReadable, foregroundFor, isHexColor } from './accent'

describe('color de acento', () => {
  it('valida hex', () => {
    expect(isHexColor('#a3e635')).toBe(true)
    expect(isHexColor('a3e635')).toBe(false)
    expect(isHexColor('#fff')).toBe(false)
    expect(isHexColor('red')).toBe(false)
  })

  it('todos los presets se leen sobre el fondo y tienen texto legible encima', () => {
    for (const { hex } of ACCENT_PRESETS) {
      expect(contrastRatio(hex, '#09090b')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(hex, foregroundFor(hex))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('aclara colores demasiado oscuros', () => {
    const fixed = ensureReadable('#1e3a8a') // azul marino
    expect(contrastRatio(fixed, '#09090b')).toBeGreaterThanOrEqual(4.5)
    expect(ensureReadable('#a3e635')).toBe('#a3e635') // ya legible: sin cambios
  })
})
