import { describe, expect, it } from 'vitest'
import { platesFor } from './plates'

describe('calculadora de discos', () => {
  it('kg con barra de 20', () => {
    expect(platesFor(100, 'kg')).toEqual({ perSide: [25, 15], remainder: 0 })
    expect(platesFor(62.5, 'kg')).toEqual({ perSide: [20, 1.25], remainder: 0 })
    expect(platesFor(20, 'kg')).toEqual({ perSide: [], remainder: 0 })
    expect(platesFor(142.5, 'kg')).toEqual({ perSide: [25, 25, 10, 1.25], remainder: 0 })
  })

  it('lb con barra de 45', () => {
    expect(platesFor(225, 'lb')).toEqual({ perSide: [45, 45], remainder: 0 })
    expect(platesFor(135, 'lb')).toEqual({ perSide: [45], remainder: 0 })
  })

  it('pesos que no cuadran o por debajo de la barra', () => {
    expect(platesFor(21, 'kg')).toEqual({ perSide: [], remainder: 1 })
    expect(platesFor(15, 'kg')).toBeNull()
  })
})
