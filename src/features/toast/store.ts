import { useSyncExternalStore } from 'react'

export type Toast = {
  id: number
  title: string
  description?: string
  tone: 'success' | 'record'
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Avisos breves no bloqueantes (p. ej. "¡Nuevo récord!"). */
export const toast = {
  show(title: string, options: { description?: string; tone?: Toast['tone']; durationMs?: number } = {}) {
    const tone = options.tone ?? 'success'
    const item: Toast = { id: nextId++, title, description: options.description, tone }
    // Un aviso nuevo del mismo tipo sustituye al anterior (p. ej. récords seguidos).
    toasts = [...toasts.filter((t) => t.tone !== tone).slice(-1), item]
    emit()
    setTimeout(() => toast.dismiss(item.id), options.durationMs ?? 3000)
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  },
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, () => toasts, () => toasts)
}
