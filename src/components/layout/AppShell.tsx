import { Dumbbell, History, ListChecks, Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt'
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
  return (
    <div className="flex min-h-dvh flex-col px-safe">
      <main className="flex-1 pt-safe pb-[calc(var(--nav-h)+var(--safe-bottom))]">
        <Outlet />
      </main>

      <UpdatePrompt />

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
                <Icon className="size-6" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
