const pad = (n: number) => String(n).padStart(2, '0')

/** 75_000 → "1:15"; 3_725_000 → "1:02:05". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Segundos de descanso: 45 → "45 s", 90 → "1:30", 120 → "2 min". */
export function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  if (seconds % 60 === 0) return `${seconds / 60} min`
  return formatClock(seconds * 1000)
}

export function formatRepRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min === null || max === null || min === max) return String(min ?? max)
  return `${min}–${max}`
}

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hoy", "ayer", "hace 3 días", "hace 2 semanas"… */
export function formatRelativeDay(timestamp: number, now = Date.now()): string {
  const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)
  const days = Math.round((startOfDay(timestamp) - startOfDay(now)) / 86_400_000)
  if (days > -7) return relative.format(days, 'day')
  if (days > -30) return relative.format(Math.round(days / 7), 'week')
  return relative.format(Math.round(days / 30), 'month')
}
