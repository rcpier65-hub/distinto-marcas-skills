// app/app/api/v1/comentarios/pendientes/route.ts
//
// GET /api/v1/comentarios/pendientes
//
// Devuelve los comentarios pendientes (status='pending') que NO tienen
// respuesta sugerida todavía. Pensado para que una Routine externa
// (Anthropic Routine, Cowork, etc.) los lea, genere respuestas con
// IA y luego POSTee las sugerencias a /api/v1/comentarios/sugerencia.
//
// Query params opcionales:
//   - marca=<slug>           filtra por una marca puntual
//   - limit=<N>              max rows a devolver (default 50, max 200)
//   - sin_sugerencia=true    solo los que respuesta_sugerida IS NULL
//
// Auth: Bearer <CRON_SECRET> en header Authorization.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function GET(request: Request) {
  // ----- Auth -----
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const url = new URL(request.url)
  const marcaSlug = url.searchParams.get('marca')
  const sinSugerencia = url.searchParams.get('sin_sugerencia') === 'true'
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
      metricool_post_id,
      author_username,
      author_display_name,
      author_avatar_url,
      comment_text,
      comment_created_at,
      post_link,
      post_text_preview,
      post_media_url,
      categoria_sugerida,
      respuesta_sugerida,
      sugerencia_at,
      sugerencia_fuente,
      status,
      created_at,
      marca:marcas(id, slug, nombre, emoji_marca)
    `)
    .eq('status', 'pending')
    .order('comment_created_at', { ascending: false })
    .limit(limit)

  if (sinSugerencia) {
    q = q.or('respuesta_sugerida.is.null,respuesta_sugerida.eq.')
  }

  if (marcaSlug) {
    // Filtrar por marca via slug (necesita resolver id primero)
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

  // Flatten marca relation para JSON consumo más simple
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((r: any) => {
    const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
    return {
      id: r.id,
      marca: marca ? { slug: marca.slug, nombre: marca.nombre, emoji: marca.emoji_marca } : null,
      network: r.network,
      author: r.author_username,
      author_name: r.author_display_name,  // Migration 024 — humano-legible
      author_avatar: r.author_avatar_url,
      text: r.comment_text,
      created_at: r.comment_created_at,
      post: {
        link: r.post_link,
        text_preview: r.post_text_preview,
        media_url: r.post_media_url,
      },
      categoria_sugerida: r.categoria_sugerida,
      respuesta_sugerida: r.respuesta_sugerida,
      sugerencia_at: r.sugerencia_at,
      sugerencia_fuente: r.sugerencia_fuente,
      status: r.status,
    }
  })

  return NextResponse.json({
    ok: true,
    count: rows.length,
    filters: { marca: marcaSlug, sin_sugerencia: sinSugerencia, limit },
    rows,
  })
}
