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

export function useRealtimeRefresh() {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    /* Una channel por tabla. Supabase permite muchas channels por
       conexión WebSocket — no abre N sockets. */
    const channels = TABLAS_REACTIVAS.map((tabla) =>
      supabase
        .channel(`realtime:${tabla}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: tabla },
          () => {
            /* Cancelar refresh pendiente; programar uno nuevo. */
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => {
              router.refresh()
            }, REFRESH_DEBOUNCE_MS)
          }
        )
        .subscribe()
    )

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [router])
}
