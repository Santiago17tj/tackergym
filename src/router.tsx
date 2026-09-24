import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorPage } from '@/pages/ErrorPage'
import { WorkoutPage } from '@/pages/WorkoutPage'

/*
 * "Entrenar" va en el bundle principal (es lo primero que se abre en el gimnasio);
 * el resto se carga bajo demanda. El service worker precachea todos los chunks,
 * así que siguen funcionando sin conexión.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    // Mientras carga la pantalla diferida inicial no se pinta nada (es instantáneo: está precacheada).
    HydrateFallback: () => null,
    children: [
      { index: true, element: <WorkoutPage /> },
      {
        path: 'rutinas',
        lazy: async () => ({ Component: (await import('@/pages/RoutinesPage')).RoutinesPage }),
      },
      {
        path: 'rutinas/programas',
        lazy: async () => ({ Component: (await import('@/pages/ProgramsPage')).ProgramsPage }),
      },
      {
        path: 'rutinas/ejercicios',
        lazy: async () => ({ Component: (await import('@/pages/ExercisesPage')).ExercisesPage }),
      },
      {
        path: 'rutinas/nueva',
        lazy: async () => ({ Component: (await import('@/pages/RoutineEditorPage')).RoutineEditorPage }),
      },
      {
        path: 'rutinas/:id',
        lazy: async () => ({ Component: (await import('@/pages/RoutineEditorPage')).RoutineEditorPage }),
      },
      {
        path: 'historial',
        lazy: async () => ({ Component: (await import('@/pages/HistoryPage')).HistoryPage }),
      },
      {
        path: 'historial/entreno/:id',
        lazy: async () => ({ Component: (await import('@/pages/WorkoutDetailPage')).WorkoutDetailPage }),
      },
      {
        path: 'historial/ejercicio/:id',
        lazy: async () => ({ Component: (await import('@/pages/ExerciseDetailPage')).ExerciseDetailPage }),
      },
      {
        path: 'ajustes',
        lazy: async () => ({ Component: (await import('@/pages/SettingsPage')).SettingsPage }),
      },
      { path: '*', element: <WorkoutPage /> },
    ],
  },
])
