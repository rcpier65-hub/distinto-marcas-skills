// app/app/cliente/_components/cliente-realtime.tsx
//
// Realtime del PORTAL DEL CLIENTE. Escucha cambios en `publicaciones` de SU
// marca vía Supabase Realtime y dispara router.refresh() para que el portal se
// actualice SOLO — sin recargar la página — cuando el equipo publica, agrega
// links, o cambia una pieza. Pedro 14-jul-2026: "que se actualice en tiempo
// real, sin abrir/cerrar ni recargar".
//
// Requiere la policy RLS `pub_cliente_marca_select` (migración
// 20260714120000): Realtime evalúa RLS como el usuario suscrito, así que sin
// esa policy el cliente no recibiría ningún evento.
//
// Extra de robustez: al volver a la pestaña (visibilitychange) refrescamos,
// por si el WebSocket estuvo dormido en el celular.

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ClienteRealtime({ marcaId, marcaSlug }: { marcaId: string; marcaSlug?: string }) {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Refrescar al volver a la app/pestaña (celular que estuvo en segundo plano).
    function onVisible() {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    const cleanupVis = () => document.removeEventListener('visibilitychange', onVisible)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return cleanupVis
    }
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch {
      return cleanupVis
    }

    // Debounce: si llegan varios cambios seguidos, un solo refresh.
    function scheduleRefresh() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => router.refresh(), 400)
    }

    const channel = supabase
      .channel(`cliente:marca:${marcaId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'publicaciones', filter: `marca_id=eq.${marcaId}` },
        () => scheduleRefresh(),
      )
      // Soporte y reuniones: el portal (Soporte / Agenda) se actualiza solo
      // cuando el equipo toma/resuelve un reporte o agenda una reunión.
      // (Antes escuchaba marca_observaciones — módulo reemplazado por Soporte.)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'soporte_reportes', filter: `marca_id=eq.${marcaId}` },
        () => scheduleRefresh(),
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'marca_reuniones', filter: `marca_id=eq.${marcaId}` },
        () => scheduleRefresh(),
      )
    // Tareas de la marca — el módulo de Tareas del portal se refresca cuando
    // el equipo crea/completa una tarea (filtra por marca_slug). Pedro 31-ago.
    if (marcaSlug) {
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'tareas', filter: `marca_slug=eq.${marcaSlug}` },
        () => scheduleRefresh(),
      )
    }
    channel.subscribe()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      cleanupVis()
      supabase.removeChannel(channel)
    }
  }, [router, marcaId])

  return null
}
