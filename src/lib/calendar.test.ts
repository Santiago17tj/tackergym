import { describe, expect, it } from 'vitest'
import { buildReminderIcs, describePlan, firstOccurrence, googleCalendarUrl, icsText } from './calendar'

// Miércoles 23 sept 2026, 19:00
const now = new Date(2026, 8, 23, 19, 0)

describe('recordatorios en calendario', () => {
  it('primera fecha: hoy si aún no pasó la hora, si no el siguiente día elegido', () => {
    expect(firstOccurrence({ days: [2], time: '20:00' }, now).getDate()).toBe(23) // hoy 20:00
    expect(firstOccurrence({ days: [2], time: '18:00' }, now).getDate()).toBe(30) // miércoles siguiente
    expect(firstOccurrence({ days: [0, 4], time: '07:30' }, now).getDate()).toBe(25) // viernes
  })

  it('genera un .ics semanal con alarma', () => {
    const ics = buildReminderIcs({ days: [4, 0, 2], time: '07:30' }, now)
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(ics).toContain('DTSTART:20260925T073000')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })

  it('enlace de Google Calendar con la misma recurrencia', () => {
    const url = new URL(googleCalendarUrl({ days: [0, 2], time: '18:30' }, now))
    expect(url.hostname).toBe('calendar.google.com')
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')
    expect(url.searchParams.get('dates')).toBe('20260928T183000/20260928T193000')
  })

  it('describe el plan', () => {
    expect(describePlan({ days: [4, 0], time: '07:00' })).toBe('lun, vie a las 07:00')
  })

  it('escapa texto para iCalendar', () => {
    expect(icsText('Pecho; hombros, tríceps\\ok\nfin')).toBe('Pecho\\; hombros\\, tríceps\\\\ok\\nfin')
  })
})
