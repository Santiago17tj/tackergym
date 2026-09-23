# Sobrecarga 🏋️

> *Sobrecarga progresiva, sin conexión.*

PWA **local-first** para registrar entrenamientos del gimnasio desde el móvil. Funciona 100 % offline:
todos los datos viven en el dispositivo (IndexedDB) y no hay backend ni servicios en la nube.

## Stack

- **Vite + React 19 + TypeScript** — SPA estática (sin SSR, así que no hay problemas de hidratación con IndexedDB).
- **Tailwind CSS v4** + componentes estilo **shadcn/ui** (`src/components/ui`) + **Lucide** icons.
- **Dexie.js** (`dexie`, `dexie-react-hooks`) para IndexedDB, con hooks reactivos `useLiveQuery`.
- **Vitest** + `fake-indexeddb` para probar la capa de datos.
- **vite-plugin-pwa** (Workbox) — manifest, service worker con precache completo e iconos.
- **React Router** para la navegación (Entrenar · Rutinas · Historial · Ajustes).

## Scripts

```bash
npm install
npm run dev                  # servidor de desarrollo
npm run build                # typecheck + tests + build de producción en dist/
npm test                     # tests de la capa de datos (Vitest)
npm run preview              # sirve dist/ (el service worker solo funciona aquí o en producción)
npm run lint                 # oxlint
npm run typecheck            # tsc
npm run generate-pwa-assets  # regenera los iconos PNG desde public/logo.svg
```

## Datos locales (`src/db`)

| Tabla | Contenido |
| --- | --- |
| `exercises` | Catálogo (53 ejercicios base en 6 grupos musculares) + ejercicios personalizados |
| `routines` | Rutinas ordenables con sus ejercicios, series y rango de reps objetivo |
| `workoutSessions` | Entrenamientos (activo / completado) |
| `sets` | Series: peso (siempre en kg), reps y `completedAt` |
| `settings` | Ajustes clave/valor (unidad kg/lb, descanso por defecto) |

- El **seed** (catálogo + rutinas Push/Pull/Legs) se carga solo la primera vez que se crea la base de datos.
- El peso se guarda siempre en kg; la unidad de Ajustes solo cambia cómo se muestra.
- **Backup/Restore** en Ajustes: exporta un `.json` (hoja de compartir nativa en móvil) y lo restaura con
  validación completa y en una sola transacción (si falla, no se toca nada).
- Al arrancar se pide *almacenamiento persistente* para que el navegador no borre los datos.
- El nombre de la app está centralizado en `src/config/app.ts`.

## PWA

- `display: standalone`, orientación vertical, tema oscuro (`#09090b`).
- Iconos 64, 192, 512, maskable 512 y `apple-touch-icon` 180 (generados desde `public/logo.svg`).
- Metatags iOS (`apple-mobile-web-app-*`, `viewport-fit=cover`) para pantalla completa con safe areas.
- Actualizaciones en modo *prompt*: la app avisa cuando hay versión nueva y nunca se recarga sola
  en mitad de un entrenamiento.

Instalar: **iPhone** → Safari → Compartir → "Añadir a pantalla de inicio". **Android** → Chrome → ⋮ → "Instalar app".

## Despliegue en Vercel

Importa el repo en Vercel; `vercel.json` ya define el build (`npm run build` → `dist/`), el fallback SPA
y las cabeceras de caché (el `sw.js` y el manifest nunca se cachean; los assets con hash son inmutables).

## Roadmap

- [x] **Fase 1** — Proyecto base, Tailwind, UI móvil y configuración PWA.
- [x] **Fase 2** — Esquema Dexie, seed de ejercicios y rutinas, ajustes kg/lb, backup/restore JSON.
- [ ] **Fase 3** — Entrenamiento en vivo y temporizador de descanso.
- [ ] **Fase 4** — Rutinas, historial/récords y build final para Vercel.
