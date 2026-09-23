/**
 * Color de acento elegido por el usuario. Se aplica con variables CSS vía
 * CSSOM (compatible con la CSP, sin estilos inline) y se cachea en
 * localStorage para pintarlo antes de que responda IndexedDB.
 */

export const DEFAULT_ACCENT = '#a3e635'

export const ACCENT_PRESETS = [
  { name: 'Lima', hex: '#a3e635' },
  { name: 'Amarillo', hex: '#facc15' },
  { name: 'Naranja', hex: '#fb923c' },
  { name: 'Rojo', hex: '#f87171' },
  { name: 'Rosa', hex: '#f472b6' },
  { name: 'Violeta', hex: '#a78bfa' },
  { name: 'Azul', hex: '#60a5fa' },
  { name: 'Turquesa', hex: '#2dd4bf' },
  { name: 'Hielo', hex: '#e4e4e7' },
] as const

const BACKGROUND = '#09090b'
const CACHE_KEY = 'accent-color'
/** Contraste mínimo del acento como texto sobre el fondo (WCAG AA texto normal). */
const MIN_CONTRAST = 4.5

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

function toRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Aclara un color (mezcla con blanco) hasta que se lea bien sobre el fondo oscuro. */
export function ensureReadable(hex: string): string {
  let rgb = toRgb(hex)
  for (let i = 0; i < 20 && contrastRatio(toHex(rgb), BACKGROUND) < MIN_CONTRAST; i++) {
    rgb = rgb.map((c) => c + (255 - c) * 0.1) as [number, number, number]
  }
  return toHex(rgb)
}

/** Texto negro o blanco, el que más contraste tenga sobre el acento. */
export function foregroundFor(hex: string): string {
  return contrastRatio(hex, '#0a0a0a') >= contrastRatio(hex, '#ffffff') ? '#0a0a0a' : '#ffffff'
}

export function applyAccent(hex: string | undefined): void {
  const accent = ensureReadable(isHexColor(hex) ? hex.toLowerCase() : DEFAULT_ACCENT)
  const root = document.documentElement.style
  root.setProperty('--primary', accent)
  root.setProperty('--primary-foreground', foregroundFor(accent))
  root.setProperty('--ring', accent)
  root.setProperty('--chart-1', accent)
  try {
    localStorage.setItem(CACHE_KEY, accent)
  } catch {
    // sin almacenamiento: se aplicará cuando cargue IndexedDB
  }
}

/** Aplica el último acento conocido de forma síncrona (antes del primer render). */
export function applyCachedAccent(): void {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (isHexColor(cached)) applyAccent(cached)
  } catch {
    // ignorado
  }
}
