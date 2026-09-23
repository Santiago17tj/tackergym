import { afterEach, describe, expect, it, vi } from 'vitest'
import { restTimer } from './store'

describe('cronómetro de descanso', () => {
  afterEach(() => {
    restTimer.stop()
    vi.useRealTimers()
  })

  it('arranca, ajusta y se detiene', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    restTimer.start(90, 'Press de banca')
    expect(restTimer.get()).toMatchObject({ endsAt: 1_090_000, durationMs: 90_000, label: 'Press de banca' })

    restTimer.adjust(15)
    expect(restTimer.get()).toMatchObject({ endsAt: 1_105_000, durationMs: 105_000 })

    vi.setSystemTime(1_100_000)
    restTimer.adjust(-30) // no puede terminar en el pasado
    expect(restTimer.get()?.endsAt).toBe(1_100_000)

    restTimer.stop()
    expect(restTimer.get()).toBeNull()
  })

  it('notifica a los suscriptores', () => {
    const listener = vi.fn()
    const unsubscribe = restTimer.subscribe(listener)
    restTimer.start(30)
    restTimer.stop()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })
})
