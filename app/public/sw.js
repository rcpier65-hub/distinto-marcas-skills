/* Service Worker mínimo para Distinto PWA.
 *
 * Estrategia:
 *  - Network-first para HTML/data (siempre fresco si hay red)
 *  - Cache-first para assets estáticos (Next.js /_next/static/*)
 *
 * Pedro pidió poder instalar la app en Mac. El SW no es estrictamente
 * necesario para "instalar" — alcanza con manifest — pero sin SW
 * algunos browsers (Safari macOS) muestran el icono más opaco en el
 * dock. Con SW + manifest se ve como app nativa. */

const CACHE_VERSION = 'distinto-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`

const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})  /* swallow si falla algún asset */
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('distinto-') && !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

/* El cliente (auto-update.tsx) puede pedir al SW en espera que se active YA
   cuando detecta una versión nueva publicada, para que la actualización sea
   inmediata sin cerrar/abrir la app. Pedro 06-ago-2026. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  /* Solo manejamos mismo origen — no interceptar Supabase / OpenAI / etc. */
  if (url.origin !== self.location.origin) return

  /* Assets estáticos de Next (con hash en el nombre) → cache-first */
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy))
          return res
        })
      )
    )
    return
  }

  /* HTML/data → network-first con fallback al cache si está offline */
  event.respondWith(
    fetch(req)
      .then((res) => {
        /* Guardamos la copia en cache solo para HTML */
        if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() =>
        caches.match(req).then((cached) =>
          cached ||
          /* Fallback final: el index si no hay nada */
          caches.match('/inicio')
        )
      )
  )
})

/* ===== Notificaciones push =====
 * El servidor envía un push cuando se confirma una publicación (aviso a
 * Pedro/Lorena). Mostramos la notificación con vibración; al tocarla, abrimos
 * (o enfocamos) la app en la pantalla correspondiente. */
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = { body: event.data ? event.data.text() : '' } }
  const title = data.title || 'Distinto Agencia'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/favicon-32.png',
    vibrate: [200, 100, 200],
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/publicaciones/publicar-hoy' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/inicio'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { if (w.navigate) { try { w.navigate(url) } catch (e) {} } return w.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
