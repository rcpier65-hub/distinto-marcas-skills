// app/lib/realtime/use-realtime-refresh.ts
//
// Hook que escucha cambios en las tablas core de Supabase y dispara
// router.refresh() para que los Server Components se vuelvan a
// renderizar SIN perder el estado de inputs/scroll/forms del cliente.
//
// Pedro lo pidió: "cuando Ailyn añade una tarea, Lorena debe verla en
// vivo sin recargar". Esto resuelve eso a nivel app: cualquier
// INSERT/UPDATE/DELETE en las tablas suscriptas → todos los browsers
// conectados reciben el evento por WebSocket y triggean un refresh.
//
// ⚠️ GUARDA DE EDICIÓN (15-jun-2026 — bug crítico que reportó Pedro:
//    "el sistema se actualiza solito y borra todo lo que escribo en la
//    grilla"). Causa: si llega un evento realtime MIENTRAS Pedro está
//    escribiendo en un campo (copy, guion, caption…), el router.refresh()
//    re-renderiza el Server Component; si ese render falla o remonta el
//    form (p.ej. PubNotFound por un error transitorio de query), se
//    pierde TODO lo no guardado.
//    Fix: NO refrescar mientras haya un elemento editable enfocado.
//    El refresh queda PENDIENTE y se aplica cuando Pedro sale del campo
//    (focusout). Así nunca interrumpimos la escritura, pero igual nos
//    enteramos de los cambios apenas termina de editar.
//
// Debouncing: si llegan 10 eventos en 500ms (ej. Lorena marca 10
// comentarios), solo hacemos UN refresh al final — evita storm de
// re-renders.

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* Lista de tablas que dispararán refresh. Mantener esta lista
   sincronizada con scripts/enable-realtime.mjs. */
const TABLAS_REACTIVAS = [
  'publicaciones',
  'comentarios_inbox',
  'grabaciones',
  'habitos',
  'habitos_completados',
  'team_members',
  'marcas',
]

/* Tiempo de espera para agrupar eventos consecutivos.
   500ms es suficiente para captar un batch de N inserts (ej. import
   masivo) sin que el user perciba lag. */
const REFRESH_DEBOUNCE_MS = 500

/* ¿El usuario está editando ahora mismo? True si el foco está en un
   input/textarea/select o en un contenteditable. Mientras esto sea true
   NO refrescamos — el refresh queda pendiente. */
function isEditingActive(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function useRealtimeRefresh() {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* Hay un refresh esperando a que el usuario termine de escribir. */
  const pendingRef = useRef(false)

  useEffect(() => {
    /* Resiliencia: si faltan las env vars de Supabase (dev sin .env poblado,
       o un deploy mal configurado), NO crear el client — antes `createClient()`
       LANZABA y tumbaba TODA la app ("Your project's URL and API key are
       required"). Mejor que el realtime sea no-op a que se caiga la app. */
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch {
      return
    }

    /* Programa un refresh respetando la guarda de edición. Si el usuario
       está escribiendo, marca pendiente y se aplicará en el focusout. */
    function scheduleRefresh() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        if (isEditingActive()) {
          pendingRef.current = true // diferir: no interrumpir la escritura
          return
        }
        pendingRef.current = false
        router.refresh()
      }, REFRESH_DEBOUNCE_MS)
    }

    /* Cuando el usuario sale de un campo editable, si había un refresh
       pendiente lo aplicamos — pero con un pequeño delay para no disparar
       si el foco salta a OTRO campo editable (ej. tabular entre celdas). */
    function onFocusOut() {
      if (!pendingRef.current) return
      setTimeout(() => {
        if (pendingRef.current && !isEditingActive()) {
          pendingRef.current = false
          router.refresh()
        }
      }, 200)
    }
    document.addEventListener('focusout', onFocusOut)

    /* Una channel por tabla. Supabase permite muchas channels por
       conexión WebSocket — no abre N sockets. */
    const channels = TABLAS_REACTIVAS.map((tabla) =>
      supabase
        .channel(`realtime:${tabla}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: tabla },
          () => scheduleRefresh()
        )
        .subscribe()
    )

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      document.removeEventListener('focusout', onFocusOut)
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [router])
}
