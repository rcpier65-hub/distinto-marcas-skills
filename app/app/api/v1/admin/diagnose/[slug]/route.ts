// app/app/api/v1/admin/diagnose/[slug]/route.ts
//
// GET /api/v1/admin/diagnose/[slug]
//
// Devuelve el snapshot completo de una marca para debug operacional:
//   - counts por status (pending | approved | responded | failed)
//   - lista de fallidos con failed_reason (los más recientes)
//   - lista de respondidos exitosos hoy
//   - lista de pendientes
//
// Pensado para que Pedro vea de un saque qué pasó con cada comentario
// de una marca, sin tener que abrir 4 vistas distintas en la UI.
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const { slug } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Resolver marca
  const { data: marca } = await service
    .from('marcas')
    .select('id, nombre, metricool_blog_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!marca) {
    return NextResponse.json({ ok: false, error: `marca '${slug}' no existe` }, { status: 404 })
  }

  // 2. Counts por status
  const counts: Record<string, number> = {
    pending: 0,
    approved: 0,
    responded: 0,
    failed: 0,
  }
  for (const status of Object.keys(counts)) {
    const { count } = await service
      .from('comentarios_inbox')
      .select('id', { count: 'exact', head: true })
      .eq('marca_id', marca.id)
      .eq('status', status)
    counts[status] = count ?? 0
  }

  // 3. Fallidos: TODOS, con razón
  const { data: failedRows } = await service
    .from('comentarios_inbox')
    .select(
      'id, network, author_username, author_display_name, comment_text, failed_reason, respuesta_final, respuesta_sugerida, metricool_comment_id, updated_at',
    )
    .eq('marca_id', marca.id)
    .eq('status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(50)

  const failed = (failedRows ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      id: r.id,
      network: r.network,
      author: r.author_display_name || r.author_username,
      texto: (r.comment_text ?? '').slice(0, 120),
      reason: r.failed_reason,
      respuesta_usada: (r.respuesta_final || r.respuesta_sugerida || '').slice(0, 120),
      metricool_comment_id: r.metricool_comment_id,
      updated_at: r.updated_at,
    }),
  )

  // 4. Pendientes (resumen)
  const { data: pendingRows } = await service
    .from('comentarios_inbox')
    .select('id, network, author_display_name, comment_text, categoria_sugerida, respuesta_sugerida')
    .eq('marca_id', marca.id)
    .eq('status', 'pending')
    .order('comment_created_at', { ascending: false })
    .limit(20)

  // 5. Responded hoy
  const hoyStart = new Date()
  hoyStart.setHours(0, 0, 0, 0)
  const { data: respondedRows } = await service
    .from('comentarios_inbox')
    .select('id, network, author_display_name, comment_text, respuesta_final, responded_at')
    .eq('marca_id', marca.id)
    .eq('status', 'responded')
    .gte('responded_at', hoyStart.toISOString())
    .order('responded_at', { ascending: false })
    .limit(20)

  // 6. Razones más comunes (histogram)
  const reasonStats: Record<string, number> = {}
  for (const r of failedRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reason = (r as any).failed_reason ?? '(sin razón)'
    const key = reason.slice(0, 80)
    reasonStats[key] = (reasonStats[key] ?? 0) + 1
  }

  return NextResponse.json({
    ok: true,
    marca: { slug, nombre: marca.nombre, metricool_blog_id: marca.metricool_blog_id },
    counts,
    failed_reason_histogram: reasonStats,
    failed,
    pending_count_returned: pendingRows?.length ?? 0,
    pending_sample: pendingRows ?? [],
    responded_hoy: respondedRows ?? [],
  })
}
