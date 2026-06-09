// app/app/manifest.ts
//
// PWA manifest para que la app se pueda instalar como app nativa
// en macOS (Safari → "Agregar al Dock"), iOS, Android y Chrome
// desktop ("Instalar Distinto").
//
// Pedro pidió que se pueda instalar como app en su Mac. Con esto:
//   - Aparece en el Dock con icono Distinto
//   - Se abre en ventana standalone (sin barra de navegación)
//   - Cmd+Tab la trata como app nativa
//   - Tiene su propio entry en Launchpad / Spotlight

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Distinto Agencia',
    short_name: 'Distinto',
    description: 'Sistema operativo de Agencia Distinto — cockpit, marcas, contenido, métricas',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ba41f7',  // violeta Distinto
    lang: 'es-PE',
    categories: ['productivity', 'business', 'social'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Inicio',
        short_name: 'Inicio',
        description: 'Dashboard ejecutivo',
        url: '/inicio',
      },
      {
        name: 'Publicaciones',
        short_name: 'Pubs',
        description: 'Calendario de publicaciones',
        url: '/publicaciones',
      },
      {
        name: 'Comentarios',
        short_name: 'Inbox',
        description: 'Atender comentarios pendientes',
        url: '/comentarios',
      },
      {
        name: 'Hábitos',
        short_name: 'Hábitos',
        description: 'Tus rutinas del día',
        url: '/habitos',
      },
    ],
  }
}
