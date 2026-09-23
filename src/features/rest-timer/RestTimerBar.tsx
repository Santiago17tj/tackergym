import { BellRing, Minus, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { REST_PRESETS, type AppSettings } from '@/db'
import { useSettings } from '@/hooks/useDb'
import { useNow } from '@/hooks/useNow'
import { playRestFinishedSound, vibrate } from '@/lib/alerts'
import { formatClock, formatRest } from '@/lib/format'
import { cn } from '@/lib/utils'
import { restTimer, useRestTimer } from './store'

/** Si el aviso llega tarde (app en segundo plano), no suena pasado este margen. */
const LATE_ALERT_TOLERANCE_MS = 30_000
/** Tiempo que se muestra "¡Descanso terminado!" antes de ocultarse. */
const FINISHED_VISIBLE_MS = 6_000

/**
 * Cronómetro de descanso flotante sobre la barra de navegación. Visible en
 * todas las pantallas mientras hay un descanso en curso.
 */
export function RestTimerBar() {
  const timer = useRestTimer()
  const settings = useSettings()
  const now = useNow(timer ? 250 : null)
  const [expanded, setExpanded] = useState(false)

  // Ref para que el setTimeout use siempre los ajustes más recientes.
  const settingsRef = useRef<AppSettings | undefined>(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const endsAt = timer?.endsAt

  // Alerta exacta al terminar (independiente del refresco visual).
  useEffect(() => {
    if (endsAt === undefined) return
    const delay = endsAt - Date.now()
    if (delay <= 0) return
    const id = setTimeout(() => {
      if (Date.now() - endsAt > LATE_ALERT_TOLERANCE_MS) return
      const s = settingsRef.current
      if (s?.restSound ?? true) playRestFinishedSound()
      if (s?.restVibration ?? true) vibrate([250, 120, 250, 120, 400])
    }, delay)
    return () => clearTimeout(id)
  }, [endsAt])

  // Se oculta sola un rato después de terminar.
  useEffect(() => {
    if (endsAt === undefined) return
    const delay = endsAt + FINISHED_VISIBLE_MS - Date.now()
    if (delay <= 0) {
      restTimer.stop()
      return
    }
    const id = setTimeout(() => restTimer.stop(), delay)
    return () => clearTimeout(id)
  }, [endsAt])

  if (!timer) return null

  const remaining = Math.max(0, timer.endsAt - now)
  const finished = remaining === 0
  const progress = finished ? 1 : 1 - remaining / timer.durationMs

  return (
    <div
      role="timer"
      aria-live="off"
      className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-bottom)+0.5rem)] z-40 mx-auto w-[calc(100%-1rem)] max-w-lg px-safe"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border shadow-2xl shadow-black/60 transition-colors',
          finished ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
        )}
      >
        {!finished && (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-300 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        )}

        <div className="relative flex items-center gap-2 p-2 pl-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 flex-1 flex-col items-start text-left"
            aria-expanded={expanded}
            aria-label="Opciones de descanso"
          >
            {finished ? (
              <span className="flex items-center gap-2 text-xl font-extrabold">
                <BellRing className="size-6 animate-bounce" /> ¡A por la siguiente!
              </span>
            ) : (
              <>
                <span className="tabular text-3xl leading-none font-extrabold">{formatClock(remaining)}</span>
                <span className="mt-1 max-w-full truncate text-xs text-muted-foreground">
                  Descanso{timer.label ? ` · ${timer.label}` : ''}
                </span>
              </>
            )}
          </button>

          {!finished && (
            <>
              <TimerButton label="Restar 15 segundos" onClick={() => restTimer.adjust(-15)}>
                <Minus />
                <span className="text-xs">15</span>
              </TimerButton>
              <TimerButton label="Sumar 15 segundos" onClick={() => restTimer.adjust(15)}>
                <Plus />
                <span className="text-xs">15</span>
              </TimerButton>
            </>
          )}
          <TimerButton
            label={finished ? 'Cerrar' : 'Saltar descanso'}
            onClick={() => restTimer.stop()}
            className={finished ? 'bg-black/15 text-primary-foreground' : undefined}
          >
            <X />
          </TimerButton>
        </div>

        {expanded && !finished && (
          <div className="relative grid grid-cols-4 gap-2 border-t p-2">
            {REST_PRESETS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => {
                  restTimer.start(seconds, timer.label)
                  setExpanded(false)
                }}
                className="h-11 rounded-lg bg-secondary text-sm font-semibold active:bg-accent"
              >
                {formatRest(seconds)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TimerButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex size-12 shrink-0 items-center justify-center gap-0.5 rounded-xl bg-secondary font-semibold active:scale-95 [&_svg]:size-4',
        className,
      )}
    >
      {children}
    </button>
  )
}
