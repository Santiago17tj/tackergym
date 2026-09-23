import { useSyncExternalStore } from 'react'
import { unlockAudio } from '@/lib/alerts'

export type RestTimerState = {
  startedAt: number
  endsAt: number
  /** Duración total (ms), para la barra de progreso. */
  durationMs: number
  /** Ejercicio al que corresponde el descanso. */
  label: string | null
}

const STORAGE_KEY = 'rest-timer'

/**
 * El cronómetro guarda la hora de fin (no un contador): así sigue siendo exacto
 * aunque iOS congele la app o se recargue la página. Se persiste en
 * localStorage solo como comodidad; si no está disponible, funciona igual.
 */
function load(): RestTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RestTimerState
    // Un descanso que terminó hace rato ya no es relevante.
    return typeof parsed.endsAt === 'number' && parsed.endsAt > Date.now() - 5_000 ? parsed : null
  } catch {
    return null
  }
}

function save(value: RestTimerState | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Almacenamiento bloqueado: el cronómetro sigue funcionando en memoria.
  }
}

let state: RestTimerState | null = typeof window === 'undefined' ? null : load()
const listeners = new Set<() => void>()

function set(next: RestTimerState | null) {
  state = next
  save(next)
  for (const listener of listeners) listener()
}

export const restTimer = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /** Llamar desde un gesto del usuario: así iOS permite que suene el aviso final. */
  start(seconds: number, label: string | null = null) {
    unlockAudio()
    const now = Date.now()
    set({ startedAt: now, endsAt: now + seconds * 1000, durationMs: seconds * 1000, label })
  },
  /** Suma o resta segundos al descanso en curso. */
  adjust(deltaSeconds: number) {
    if (!state) return
    const now = Date.now()
    const endsAt = Math.max(now, state.endsAt + deltaSeconds * 1000)
    set({ ...state, endsAt, durationMs: Math.max(1000, endsAt - state.startedAt) })
  },
  stop() {
    set(null)
  },
}

export function useRestTimer(): RestTimerState | null {
  return useSyncExternalStore(restTimer.subscribe, restTimer.get, () => null)
}
