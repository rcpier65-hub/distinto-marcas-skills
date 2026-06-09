'use client'

/* SwRegister — registra el service worker después del primer paint.
 * Lo monta el layout para que se ejecute en TODAS las rutas. Si el
 * browser no soporta SW (Safari muy viejo o privacy mode) falla silente
 * y la app sigue funcionando online normal.
 *
 * Sin SW la app sigue siendo PWA instalable (alcanza con manifest), pero
 * con SW:
 *   - El icono se muestra full color en el Dock de macOS
 *   - Funciona offline con la última versión cacheada de los assets
 *   - Carga más rápido la segunda vez */

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    /* Esperamos al 'load' para no competir con el TTI inicial */
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          /* No tirar — la app funciona sin SW. */
          // eslint-disable-next-line no-console
          console.warn('[SW] register failed:', err)
        })
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
  }, [])

  return null
}
