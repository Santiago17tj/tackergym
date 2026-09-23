import type { SubscriptionRecord } from './types.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Fecha, día de la semana (0 = lunes) y minuto del día en una zona horaria. */
export function localParts(date: Date, timeZone: string): { dateKey: string; weekday: number; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

/**
 * ¿Toca avisar ahora? Día de entreno, dentro de la ventana desde la hora
 * elegida (tolera un tic perdido del reloj) y aún no avisado hoy.
 */
export function isDue(record: SubscriptionRecord, now: Date, windowMinutes = 15): boolean {
  const { dateKey, weekday, minutes } = localParts(now, record.timeZone)
  if (!record.days.includes(weekday) || record.lastSentDate === dateKey) return false
  const [h, m] = record.time.split(':').map(Number)
  const target = h * 60 + m
  return minutes >= target && minutes < target + windowMinutes
}
