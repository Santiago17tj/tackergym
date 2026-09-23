import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, THEME_COLOR } from './src/config/app.ts'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      // Sustituye %APP_NAME%, %APP_DESCRIPTION%... en index.html
      name: 'app-identity-html',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          html
            .replaceAll('%APP_NAME%', APP_NAME)
            .replaceAll('%APP_SHORT_NAME%', APP_SHORT_NAME)
            .replaceAll('%APP_DESCRIPTION%', APP_DESCRIPTION)
            .replaceAll('%THEME_COLOR%', THEME_COLOR),
      },
    },
    VitePWA({
      // 'prompt': el usuario decide cuándo recargar, así una actualización
      // nunca interrumpe un entrenamiento en curso.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'portrait',
        background_color: THEME_COLOR,
        theme_color: THEME_COLOR,
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest,mp3,wav}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Manejador de clic en notificaciones (public/sw-notifications.js)
        importScripts: ['/sw-notifications.js'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
