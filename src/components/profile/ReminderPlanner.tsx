import { BellRing, CalendarPlus, Download } from 'lucide-react'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildReminderIcs, DAY_INITIALS, DAY_NAMES, describePlan, googleCalendarUrl } from '@/lib/calendar'
import { notificationPermission, requestNotificationPermission } from '@/lib/notify'
import { PushToggle } from './PushToggle'
import { shareOrDownloadFile } from '@/lib/share'
import { cn } from '@/lib/utils'

type ReminderPlannerProps = {
  days: number[]
  time: string
  onChange: (plan: { days: number[]; time: string }) => void
}

/** Días y hora de entreno + botones para llevarlos al calendario del teléfono. */
export function ReminderPlanner({ days, time, onChange }: ReminderPlannerProps) {
  const [calendarDone, setCalendarDone] = useState<string | null>(null)
  const [permission, setPermission] = useState(notificationPermission)
  const plan = { days, time }
  const hasDays = days.length > 0

  const toggleDay = (day: number) =>
    onChange({ days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(), time })

  async function downloadIcs() {
    const file = new File([buildReminderIcs(plan)], 'recordatorio-entreno.ics', { type: 'text/calendar' })
    const result = await shareOrDownloadFile(file)
    if (result.status !== 'cancelled') setCalendarDone('Abre el archivo y elige «Añadir» para crear el recordatorio.')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">¿Qué días entrenas?</p>
        <div className="mt-2 grid grid-cols-7 gap-1.5" role="group" aria-label="Días de entreno">
          {DAY_INITIALS.map((initial, i) => {
            const selected = days.includes(i)
            return (
              <button
                key={initial}
                type="button"
                aria-pressed={selected}
                aria-label={DAY_NAMES[i]}
                onClick={() => toggleDay(i)}
                className={cn(
                  'h-12 rounded-lg font-display text-xl font-bold transition-colors',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                {initial}
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="font-semibold">¿A qué hora?</span>
        <Input
          type="time"
          value={time}
          onChange={(e) => e.target.value && onChange({ days, time: e.target.value })}
          className="w-40 text-center font-display text-2xl"
        />
      </label>

      <PushToggle plan={plan} />

      <details className="group rounded-lg bg-secondary/60 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold select-none">
          También en tu calendario
          <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <p className="mt-2 text-sm">
          Crea un evento semanal ({hasDays ? describePlan(plan) : 'elige al menos un día'}) con alarma en tu calendario.
        </p>
        <div className="mt-3 grid gap-2">
          <a
            href={hasDays ? googleCalendarUrl(plan) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!hasDays}
            onClick={() => hasDays && setCalendarDone('Guarda el evento en Google Calendar para activar el aviso.')}
            className={cn(buttonVariants({ variant: 'secondary' }), !hasDays && 'pointer-events-none opacity-50')}
          >
            <CalendarPlus /> Google Calendar
          </a>
          <Button variant="secondary" onClick={downloadIcs} disabled={!hasDays}>
            <Download /> Calendario del iPhone u otro
          </Button>
        </div>
        {calendarDone && <p className="mt-2 text-xs text-muted-foreground">{calendarDone}</p>}
      </details>

      {permission !== 'unsupported' && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">
            <span className="block font-semibold">Avisos del descanso</span>
            <span className="block text-muted-foreground">
              {permission === 'granted'
                ? 'Activados: te avisamos si sales de la app durante el descanso.'
                : permission === 'denied'
                  ? 'Bloqueados en los ajustes del navegador.'
                  : 'Un aviso cuando termine el descanso y tengas la app en segundo plano.'}
            </span>
          </span>
          {permission === 'default' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => setPermission(await requestNotificationPermission())}
            >
              <BellRing /> Activar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
