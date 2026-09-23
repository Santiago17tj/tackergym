import { Dumbbell, History, ListChecks, Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt'
import { RestTimerBar } from '@/features/rest-timer/RestTimerBar'
import { useRestTimer } from '@/features/rest-timer/store'
import { useHasActiveWorkout } from '@/hooks/useDb'
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

  return (
    <div className="flex min-h-dvh flex-col px-safe">
      <main
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

      <nav
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
                    isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                  )
                }
              >
                <span className="relative">
                  <Icon className="size-6" aria-hidden />
                  {to === '/' && hasActiveWorkout && (
                    <span className="absolute -top-0.5 -right-1 size-2.5 animate-pulse rounded-full bg-primary ring-2 ring-background">
                      <span className="sr-only">Entrenamiento en curso</span>
                    </span>
                  )}
                </span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
