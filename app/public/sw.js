/* Service Worker mínimo para Distinto PWA.
 *
 * Estrategia:
 *  - Network-only para APIs, iframes y datos de Next
 *  - Network-first para documentos, sin sustituirlos por otra página
 *  - Cache-first para assets estáticos (Next.js /_next/static/*)
 *
 * Pedro pidió poder instalar la app en Mac. El SW no es estrictamente
 * necesario para "instalar" — alcanza con manifest — pero sin SW
 * algunos browsers (Safari macOS) muestran el icono más opaco en el
 * dock. Con SW + manifest se ve como app nativa. */

/* v2 (24-sep-2026): se descartan las cachés viejas, que podían tener guardado
   un CSS/JS FALLIDO (404 en pleno cambio de versión) → la app salía sin
   estilos ("pantalla en blanco con letras") hasta borrar la caché. */
// v3: purgar HTML que pudo guardarse bajo URLs de imágenes o APIs.
const CACHE_VERSION = 'distinto-v3'
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
    ).then(() => self.clients.claim())
  )
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

  // Una API nunca puede recibir el HTML de Inicio como respuesta de respaldo.
  // También excluimos las peticiones RSC/iframe y las que piden no almacenar.
  if (url.pathname === '/api' || url.pathname.startsWith('/api/') ||
      req.headers.get('rsc') === '1' || url.searchParams.has('_rsc') ||
      req.destination === 'iframe' || req.cache === 'no-store') return

  /* Assets estáticos de Next (con hash en el nombre) → cache-first */
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          /* Solo guardamos respuestas BUENAS: nunca un 404/500. */
          if (res.ok) {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
      )
    )
    return
  }

  // Imágenes, fetch de datos y otros recursos siguen su petición original.
  if (req.mode !== 'navigate' || req.destination !== 'document') return

  /* Documentos: como respaldo solo vale la misma URL. */
  event.respondWith(
    fetch(req)
      .then((res) => {
        /* Guardamos la copia en cache solo para HTML */
        if (res.ok && !res.redirected && res.headers.get('content-type')?.includes('text/html') &&
            !/no-store|private/i.test(res.headers.get('cache-control') || '')) {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() =>
        caches.open(STATIC_CACHE).then((cache) => cache.match(req)).then((cached) => cached || new Response(
          '<!DOCTYPE html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Distinto</title><body style="font:16px system-ui;padding:40px;color:#334155;background:#f1f5f9"><h1>Sin conexión</h1><p>No pudimos cargar esta página. Revisa tu conexión y vuelve a intentar.</p><a href="">Reintentar</a></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
        ))
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
    /* Con sonido del sistema (celular y Mac). */
    silent: false,
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/publicaciones/publicar-hoy' },
  }
  /* Avisar a las ventanas abiertas de la app para que suenen (SonidosBridge).
     Pedro 24-sep-2026: "quiero que suene cuando llega una notificación". */
  const avisarVentanas = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    for (const w of wins) w.postMessage({ type: 'push-recibido', tag: data.tag || null })
  })
  event.waitUntil(Promise.all([self.registration.showNotification(title, options), avisarVentanas]))
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
