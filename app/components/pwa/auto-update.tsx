'use client'

/* AutoUpdate — hace que la app se actualice SOLA cuando publico una versión
 * nueva, sin que nadie tenga que cerrar y volver a abrir la app.
 *
 * Pedro 14-jul-2026: "los cambios que te pida se actualicen en automático en el
 * sistema, sin necesidad de estar reiniciando, saliendo y entrando a la app".
 *
 * Cómo funciona:
 *  - Cada build lleva un id único (NEXT_PUBLIC_BUILD_ID, inyectado en next.config).
 *  - Cada ~60s, al volver a la pestaña/app, y al enfocar la ventana, consultamos
 *    /api/version (que corre en el deploy más nuevo, detrás del alias).
 *  - Si el id publicado difiere del que tenemos cargado → recargamos la app.
 *
 * Guarda: NO recargamos mientras alguien está escribiendo (input/textarea/
 * select/contenteditable) para no perder texto sin guardar; la recarga queda
 * pendiente y se aplica al salir del campo. */

import { useEffect, useRef } from 'react'

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'
const CHECK_MS = 30_000

function estaEscribiendo(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const t = el.tagName
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable
}

export function AutoUpdate() {
  const pendiente = useRef(false)
  const recargando = useRef(false)

  useEffect(() => {
    // En local (o si no se inyectó el id) no auto-recargamos.
    if (!CURRENT || CURRENT === 'dev') return
    let cancelado = false

    /* Aplica la actualización de VERDAD: borra las cachés del service worker
       (si no, el SW sigue sirviendo el bundle viejo y por eso antes había que
       cerrar y abrir la app), fuerza la activación del SW nuevo, y recién
       recarga → la app arranca 100% fresca. Pedro 06-ago-2026. */
    async function aplicarActualizacion() {
      if (recargando.current) return
      recargando.current = true
      /* ⚠️ GUARDA CRÍTICA (Pedro 11-ago-2026: "This page couldn't load"):
         antes borrábamos TODAS las cachés y recién recargábamos. Si la recarga
         caía con mala señal o en pleno cambio de deploy, el equipo quedaba SIN
         caché y SIN red → pantalla de error del webview/PWA. Ahora primero
         verificamos que la red pueda servir la app nueva; si no puede, NO
         tocamos la caché y lo reintentamos en el próximo ciclo. */
      try {
        const alcanzable = await fetch('/api/version', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
          .then((r) => r.ok)
          .catch(() => false)
        if (!alcanzable) {
          recargando.current = false
          pendiente.current = true
          return
        }
        if (typeof caches !== 'undefined') {
          /* Solo las cachés PROPIAS del SW (prefijo 'distinto-'), no todo. */
          const keys = await caches.keys()
          await Promise.all(keys.filter((k) => k.startsWith('distinto-')).map((k) => caches.delete(k)))
        }
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) {
            try { await reg.update() } catch { /* ignora */ }
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
          }
        }
      } catch { /* si algo falla, igual recargamos (la red ya respondió arriba) */ }
      window.location.reload()
    }

    function recargarSiSeguro() {
      if (recargando.current) return
      if (estaEscribiendo()) { pendiente.current = true; return }
      void aplicarActualizacion()
    }

    async function chequear() {
      if (cancelado || recargando.current) return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const ultimo = typeof data?.id === 'string' ? data.id : null
        if (ultimo && ultimo !== 'dev' && ultimo !== CURRENT) recargarSiSeguro()
      } catch {
        /* sin conexión: reintentamos en el próximo ciclo */
      }
    }

    const intervalo = setInterval(chequear, CHECK_MS)

    function alVolver() { if (document.visibilityState === 'visible') chequear() }
    function alSalirDeCampo() {
      if (!pendiente.current) return
      setTimeout(() => {
        if (pendiente.current && !estaEscribiendo()) {
          pendiente.current = false
          void aplicarActualizacion()
        }
      }, 200)
    }

    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    window.addEventListener('online', chequear)
    document.addEventListener('focusout', alSalirDeCampo)

    // Chequeo inicial: por si abrió una versión vieja que quedó en caché.
    chequear()

    return () => {
      cancelado = true
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
      window.removeEventListener('online', chequear)
      document.removeEventListener('focusout', alSalirDeCampo)
    }
  }, [])

  return null
}
