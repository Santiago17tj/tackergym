import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { requestPersistentStorage } from '@/db/persist'
import { router } from '@/router'
import './index.css'

// Evita que el navegador borre IndexedDB bajo presión de espacio (iOS sobre todo).
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
