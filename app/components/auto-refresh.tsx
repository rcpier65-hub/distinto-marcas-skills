'use client'

/* AutoRefresh — mantiene la pantalla al día SOLA, sin recargar ni cerrar/abrir.
 *
 * Pedro 06-ago-2026: "quiero que los cambios que pida se refresquen automático
 * sin abrir/cerrar la app". Distinto de components/pwa/auto-update.tsx: aquel
 * recarga cuando hay una VERSIÓN nueva publicada; este re-consulta los DATOS de
 * la pantalla actual (tareas, publicaciones, etc.) cada pocos segundos.
 *
 * Cómo funciona: llama a router.refresh() de Next, que vuelve a correr el
 * componente de servidor y trae los datos frescos SIN recargar la página — el
 * estado del cliente (menús abiertos, lo que escribes) se conserva.
 *
 * Guardas para no molestar:
 *  - Solo cuando la pestaña está VISIBLE (no gasta datos en segundo plano).
 *  - Solo si hay conexión.
 *  - NO refresca mientras alguien ESCRIBE en un campo (para no cortar el texto).
 *  - Al volver a la app/pestaña, refresca al instante.
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

function estaEscribiendo(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const t = el.tagName
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable
}

export function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter()
  const refreshing = useRef(false)

  useEffect(() => {
    let cancelado = false

    function refrescar(force = false) {
      if (cancelado || refreshing.current) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      if (!force && estaEscribiendo()) return
      refreshing.current = true
      try { router.refresh() } finally {
        // pequeño margen para que el refresh anterior termine
        setTimeout(() => { refreshing.current = false }, 800)
      }
    }

    const intervalo = setInterval(() => refrescar(false), intervalMs)
    function alVolver() { if (document.visibilityState === 'visible') refrescar(false) }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', () => refrescar(false))

    return () => {
      cancelado = true
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [router, intervalMs])

  return null
}
