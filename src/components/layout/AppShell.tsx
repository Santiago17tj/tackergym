import { Dumbbell, History, ListChecks, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt'
import { RestTimerBar } from '@/features/rest-timer/RestTimerBar'
import { useRestTimer } from '@/features/rest-timer/store'
import { Toaster } from '@/features/toast/Toaster'
import { useHasActiveWorkout, useRoutines, useSettings } from '@/hooks/useDb'
import { useWakeLock } from '@/hooks/useWakeLock'
import { applyAccent } from '@/lib/accent'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Entrenar', icon: Dumbbell, end: true },
  { to: '/rutinas', label: 'Rutinas', icon: ListChecks },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
] as const

/**
 * Layout principal: contenido desplazable + barra de navegación inferior fija
 * (zona del pulgar), respetando las safe areas del notch y la barra de gestos.
 */
export function AppShell() {
  const hasActiveWorkout = useHasActiveWorkout()
  const restActive = useRestTimer() !== null
  // Pantalla encendida durante todo el entrenamiento, aunque se cambie de pestaña.
  useWakeLock(hasActiveWorkout)

  const settings = useSettings()
  const routines = useRoutines()
  const accentColor = settings?.accentColor
  useEffect(() => {
    if (accentColor) applyAccent(accentColor)
  }, [accentColor])

  const showOnboarding = Boolean(settings && routines && !settings.onboarded)

  return (
    <div className="flex min-h-dvh flex-col px-safe">
      <main
        inert={showOnboarding}
        className={cn(
          'flex-1 pt-safe',
          // Deja hueco para la barra del cronómetro cuando está visible.
          restActive ? 'pb-[calc(var(--nav-h)+var(--safe-bottom)+6rem)]' : 'pb-[calc(var(--nav-h)+var(--safe-bottom))]',
        )}
      >
        <Outlet />
      </main>

      <UpdatePrompt />
      <RestTimerBar />
      <Toaster />
      {showOnboarding && settings && routines && (
        <Onboarding settings={settings} existingRoutineNames={routines.map((r) => r.name)} />
      )}

      <nav
        inert={showOnboarding}
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe px-safe backdrop-blur-lg"
      >
        <ul className="mx-auto grid h-(--nav-h) max-w-lg grid-cols-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={'end' in rest ? rest.end : false}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                    'relative',
                    isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 bg-primary" />}
                    <span className="relative flex h-8 w-14 items-center justify-center">
                      <Icon className="size-6" aria-hidden />
                      {to === '/' && hasActiveWorkout && (
                        <span className="absolute top-0 right-2.5 size-2.5 animate-pulse rounded-full bg-primary ring-2 ring-background">
                          <span className="sr-only">Entrenamiento en curso</span>
                        </span>
                      )}
                    </span>
                    <span className={cn(isActive && 'font-bold')}>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
