import { useEffect } from 'react'

/** Nº de diálogos abiertos a la vez (p. ej. una confirmación sobre una hoja). */
let locks = 0

/**
 * Bloquea el scroll de la página mientras `active`. Usa una clase explícita en
 * <html> con contador, en lugar de `html:has(dialog[open])`: WebKit no siempre
 * recalcula `:has()` al cerrar el diálogo y la página quedaba sin scroll.
 * El desmontaje siempre libera el bloqueo.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    locks++
    document.documentElement.classList.add('scroll-locked')
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks === 0) document.documentElement.classList.remove('scroll-locked')
    }
  }, [active])
}
