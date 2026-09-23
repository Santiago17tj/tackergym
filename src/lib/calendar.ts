import { APP_NAME } from '@/config/app'

/** 0 = lunes … 6 = domingo */
const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const
export const DAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

export type ReminderPlan = {
  days: number[]
  /** "HH:MM" */
  time: string
  durationMinutes?: number
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha/hora local "flotante" (sin zona): el calendario la interpreta en la hora local del teléfono. */
function localStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Próxima fecha (hoy incluido si aún no pasó la hora) que cae en uno de los días elegidos. */
export function firstOccurrence(plan: ReminderPlan, now = new Date()): Date {
  const [h, m] = plan.time.split(':').map(Number)
  for (let i = 0; i < 8; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    d.setHours(h, m, 0, 0)
    const weekday = (d.getDay() + 6) % 7
    if (plan.days.includes(weekday) && d > now) return d
  }
  throw new Error('Sin días seleccionados')
}

function rrule(plan: ReminderPlan): string {
  const days = [...plan.days].sort().map((d) => ICS_DAYS[d])
  return `FREQ=WEEKLY;BYDAY=${days.join(',')}`
}

/** Escapa texto para iCalendar (RFC 5545). */
export const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** Archivo .ics con un evento semanal y alarma a la hora de entrenar. */
export function buildReminderIcs(plan: ReminderPlan, now = new Date()): string {
  const start = firstOccurrence(plan, now)
  const duration = plan.durationMinutes ?? 60
  const uid = `entreno-${plan.days.join('')}-${plan.time.replace(':', '')}@sobrecarga.app`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME}//Recordatorios//ES`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(start)}`,
    `DURATION:PT${duration}M`,
    `RRULE:${rrule(plan)}`,
    `SUMMARY:${icsText(`Entrenar 💪 · ${APP_NAME}`)}`,
    `DESCRIPTION:${icsText(`Abre ${APP_NAME} y empieza tu rutina.`)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText('Hora de entrenar')}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

/** Enlace para crear el mismo evento recurrente en Google Calendar. */
export function googleCalendarUrl(plan: ReminderPlan, now = new Date()): string {
  const start = firstOccurrence(plan, now)
  const end = new Date(start.getTime() + (plan.durationMinutes ?? 60) * 60_000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Entrenar · ${APP_NAME}`,
    details: `Abre ${APP_NAME} y empieza tu rutina.`,
    dates: `${localStamp(start)}/${localStamp(end)}`,
    recur: `RRULE:${rrule(plan)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function describePlan(plan: ReminderPlan): string {
  if (plan.days.length === 0) return 'Sin días elegidos'
  const days = [...plan.days].sort().map((d) => DAY_NAMES[d].slice(0, 3).toLowerCase())
  return `${days.join(', ')} a las ${plan.time}`
}
