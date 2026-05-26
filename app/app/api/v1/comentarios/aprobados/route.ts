// app/app/api/v1/comentarios/aprobados/route.ts
//
// GET /api/v1/comentarios/aprobados
//
// Lista comentarios con status='approved' que tienen respuesta_sugerida
// lista y todavía no se postearon a Metricool. La Routine externa los
// consume, postea cada uno via Metricool API, y luego marca como sent
// via POST /api/v1/comentarios/[id]/marcar-enviado.
//
// Query params opcionales:
//   - marca=<slug>    filtra por marca
//   - limit=<N>       max rows (default 50, max 200)
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const url = new URL(request.url)
  const marcaSlug = url.searchParams.get('marca')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  let q = service
    .from('comentarios_inbox')
    .select(`
      id,
      marca_id,
      network,
      metricool_comment_id,
      metricool_thread_id,
      author_username,
      comment_text,
      post_link,
      respuesta_sugerida,
      respuesta_editada,
      categoria_sugerida,
      status,
      approved_at,
      marca:marcas(id, slug, nombre, emoji_marca, metricool_blog_id)
    `)
    .eq('status', 'approved')
    .not('respuesta_sugerida', 'is', null)
    .order('approved_at', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (marcaSlug) {
    const { data: marca } = await service
      .from('marcas')
      .select('id')
      .eq('slug', marcaSlug)
      .maybeSingle()
    if (!marca) {
      return NextResponse.json({ ok: false, error: `marca '${marcaSlug}' no existe` }, { status: 404 })
    }
    q = q.eq('marca_id', marca.id)
  }

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((r: any) => {
    const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
    /* La respuesta editada (si Pedro editó) tiene prioridad sobre la sugerida.
       Si no editó nada, se postea la sugerencia original tal cual. */
    const respuesta_final = r.respuesta_editada ?? r.respuesta_sugerida ?? ''
    return {
      id: r.id,
      marca: marca ? {
        slug: marca.slug,
        nombre: marca.nombre,
        emoji: marca.emoji_marca,
        metricool_blog_id: marca.metricool_blog_id,
      } : null,
      network: r.network,
      metricool_comment_id: r.metricool_comment_id,
      metricool_thread_id: r.metricool_thread_id,
      author: r.author_username,
      original_text: r.comment_text,
      post_link: r.post_link,
      respuesta_final,
      categoria_sugerida: r.categoria_sugerida,
      approved_at: r.approved_at,
    }
  })

  return NextResponse.json({
    ok: true,
    count: rows.length,
    filters: { marca: marcaSlug, limit },
    rows,
  })
}
