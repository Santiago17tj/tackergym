import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { HistoryPage } from '@/pages/HistoryPage'
import { RoutinesPage } from '@/pages/RoutinesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WorkoutPage } from '@/pages/WorkoutPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <WorkoutPage /> },
      { path: 'rutinas', element: <RoutinesPage /> },
      { path: 'historial', element: <HistoryPage /> },
      { path: 'ajustes', element: <SettingsPage /> },
      { path: '*', element: <WorkoutPage /> },
    ],
  },
])
