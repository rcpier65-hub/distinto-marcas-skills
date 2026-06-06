// app/app/comentarios/page.tsx
// Sistema de respuesta de comentarios (Metricool integration).
// Server component que carga marcas + comentarios pendientes + KPIs y los pasa al client.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { listInbox, getResumenInbox } from './_actions'
import { ComentariosClient } from './_components/comentarios-client'
import { MessagesSquare } from 'lucide-react'
import { getCurrentMemberPermisos, getLandingRoute } from '@/lib/team/permisos-helper'
import { tieneAcceso } from '@/lib/team/types'

export const dynamic = 'force-dynamic'
// Las server actions de esta página (cargar comentarios + generar borradores IA)
// pueden tomar varios segundos por la llamada a OpenAI. Subimos el límite.
export const maxDuration = 60

type SP = { marca?: string }

export default async function ComentariosPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()

  /* Route guard: si el usuario tiene team_member, chequear permiso
     inbox o comentarios. Sin team_member (= admin) → pasa directo. */
  const p = await getCurrentMemberPermisos()
  if (p && !tieneAcceso(p.permisos, 'inbox') && !tieneAcceso(p.permisos, 'comentarios')) {
    redirect(await getLandingRoute())
  }

  const sp = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Cargar todas las marcas activas con metricool_blog_id (las que no tengan
  // aparecen disabled en el selector — defensive con columnas pre-migration).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let marcas: any[] = []
  {
    const r1 = await service
      .from('marcas')
      .select('slug, nombre, emoji_marca, metricool_blog_id, reporte_comentarios_grupo')
      .eq('activa', true)
      .order('slug')
    if (r1.error && (r1.error.message ?? '').includes('does not exist')) {
      // Fallback pre-migration 019: sin las columnas nuevas
      const r2 = await service
        .from('marcas')
        .select('slug, nombre, emoji_marca')
        .eq('activa', true)
        .order('slug')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marcas = (r2.data ?? []).map((m: any) => ({
        ...m,
        metricool_blog_id: null,
        reporte_comentarios_grupo: 'interno',
      }))
    } else {
      marcas = r1.data ?? []
    }
  }

  // Marca seleccionada: querystring o primera con metricool_blog_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcaActual: string =
    sp.marca ?? marcas.find((m: any) => m.metricool_blog_id)?.slug ?? marcas[0]?.slug ?? 'manrique'

  // Cargar inbox + resumen en paralelo
  const [inboxResult, resumenResult] = await Promise.all([
    listInbox(marcaActual, 'pending'),
    getResumenInbox(marcaActual),
  ])

  const rows = inboxResult.ok ? inboxResult.rows : []
  const resumen = resumenResult.ok
    ? resumenResult
    : { pending: 0, approved: 0, responded_today: 0, failed: 0, ok: true as const }
  const error = !inboxResult.ok
    ? inboxResult.error
    : !resumenResult.ok
    ? resumenResult.error
    : null

  return (
    <main className="container mx-auto p-6 max-w-6xl space-y-4">
      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#ba41f7]/10 flex items-center justify-center shrink-0">
          <MessagesSquare className="w-6 h-6 text-[#ba41f7]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Comentarios</h1>
          <p className="text-sm text-muted-foreground">
            Inbox unificado de comentarios públicos en Instagram / Facebook / TikTok.
            Carga desde Metricool, genera borradores con IA y responde en lote.
          </p>
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          ⚠️ {error}
          {error.includes('does not exist') && (
            <p className="text-muted-foreground text-xs mt-1">
              Migration 019 pendiente — pegá el SQL en Supabase Studio.
            </p>
          )}
        </div>
      )}

      <ComentariosClient
        marcas={marcas}
        marcaActual={marcaActual}
        rowsIniciales={rows}
        resumen={{
          pending: resumen.pending ?? 0,
          approved: resumen.approved ?? 0,
          responded_today: resumen.responded_today ?? 0,
          failed: resumen.failed ?? 0,
        }}
      />
    </main>
  )
}
