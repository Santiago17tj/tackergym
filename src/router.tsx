import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorPage } from '@/pages/ErrorPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { RoutinesPage } from '@/pages/RoutinesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WorkoutPage } from '@/pages/WorkoutPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <WorkoutPage /> },
      { path: 'rutinas', element: <RoutinesPage /> },
      { path: 'historial', element: <HistoryPage /> },
      { path: 'ajustes', element: <SettingsPage /> },
      { path: '*', element: <WorkoutPage /> },
    ],
  },
])
