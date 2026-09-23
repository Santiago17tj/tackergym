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

## Entrenamiento en vivo

- Empieza desde una rutina o en modo libre; solo puede haber un entrenamiento activo y sobrevive a recargas.
- Tabla por ejercicio: **Serie · Anterior · Peso · Reps · ✓**. Los campos se **pre-llenan con la última
  vez** (sobrecarga progresiva) y tocar "Anterior" copia esos valores.
- Añadir/quitar series y ejercicios, reordenar, crear ejercicios desde el buscador.
- **Cronómetro de descanso** automático al marcar ✓ (descanso del ejercicio o el de Ajustes), con
  −15/+15 s, presets 30/60/90/120 s, pitido (Web Audio) y vibración (Android). Guarda la hora de fin,
  así que sigue siendo exacto aunque el móvil congele la app.
- La pantalla se mantiene encendida durante el entrenamiento (Wake Lock API).
- Al finalizar se descartan las series sin marcar y se muestra un resumen (duración, series, volumen).

## Rutinas e historial

- **Rutinas**: crear, editar (series, rango de reps y descanso por ejercicio con controles −/+), reordenar,
  duplicar y borrar. Avisa si sales del editor con cambios sin guardar.
- **Historial**: entrenamientos agrupados por mes con duración, series y volumen; detalle serie a serie.
- **Récords por ejercicio**: peso máximo, 1RM estimado (Epley), máximo de reps, mejor volumen por sesión,
  totales y gráfica de progreso (peso máximo / 1RM / volumen) con tooltip táctil.

## PWA

- `display: standalone`, orientación vertical, tema oscuro (`#09090b`).
- Iconos 64, 192, 512, maskable 512 y `apple-touch-icon` 180 (generados desde `public/logo.svg`).
- Metatags iOS (`apple-mobile-web-app-*`, `viewport-fit=cover`) para pantalla completa con safe areas.
- Actualizaciones en modo *prompt*: la app avisa cuando hay versión nueva y nunca se recarga sola
  en mitad de un entrenamiento.

Instalar: **iPhone** → Safari → Compartir → "Añadir a pantalla de inicio". **Android** → Chrome → ⋮ → "Instalar app".

## Compatibilidad y avisos

- **Requisitos**: iOS/iPadOS 16.4+ (Safari), Chrome/Edge/Samsung Internet recientes en Android.
- **iPhone: instala la app antes de empezar a usarla.** En iOS, Safari y la app instalada guardan los
  datos por separado; lo registrado en una pestaña de Safari no aparece en la app de la pantalla de inicio
  (y viceversa). Si ya tienes datos en Safari, expórtalos desde Ajustes e impórtalos en la app instalada.
- Safari puede borrar los datos de webs **no instaladas** tras 7 días sin uso; la app instalada está exenta.
- Con el teléfono bloqueado, iOS congela la web: el pitido del descanso no suena, por eso la app mantiene
  la pantalla encendida durante el entrenamiento. El tiempo siempre es correcto al volver.
- La vibración no está disponible en iOS (limitación de Safari).

## Seguridad

- CSP estricta sin `unsafe-inline` (`script-src 'self'`, `style-src 'self'`, `connect-src 'self'`,
  `frame-ancestors 'none'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` y `COOP`, definidas en `vercel.json`.
- Sin backend, sin analítica ni peticiones a terceros: nada sale del dispositivo.
- Los backups importados se validan campo a campo, se sanean (se descartan claves desconocidas),
  tienen un límite de 50 MB y se restauran en una única transacción.
- Nota: la barra de comentarios de Vercel en los *preview deployments* queda bloqueada por la CSP;
  no afecta a producción.

## Despliegue en Vercel

1. En [vercel.com/new](https://vercel.com/new) importa este repositorio (Vercel detecta Vite).
2. No hace falta configurar nada más: `vercel.json` ya define
   - build `npm run build` (typecheck + tests + build) y salida `dist/`,
   - fallback SPA para que los enlaces directos (`/historial/...`) funcionen,
   - cabeceras de caché: `sw.js` y el manifest nunca se cachean; los assets con hash son inmutables.
3. Cada push a `main` despliega producción; cada PR obtiene una URL de preview.

La CI de GitHub Actions (`.github/workflows/ci.yml`) ejecuta lint, typecheck, tests y build en cada PR.

## Roadmap

- [x] **Fase 1** — Proyecto base, Tailwind, UI móvil y configuración PWA.
- [x] **Fase 2** — Esquema Dexie, seed de ejercicios y rutinas, ajustes kg/lb, backup/restore JSON.
- [x] **Fase 3** — Entrenamiento en vivo y temporizador de descanso.
- [x] **Fase 4** — Rutinas, historial/récords y build final para Vercel.
