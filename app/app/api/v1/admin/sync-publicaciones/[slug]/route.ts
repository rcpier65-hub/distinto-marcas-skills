// app/app/api/v1/admin/sync-publicaciones/[slug]/route.ts
//
// POST /api/v1/admin/sync-publicaciones/[slug]
//
// Sincroniza una marca individual: properties + copy + guion del body
// markdown de cada página de Notion.
//
// Body opcional: { from, to } — default mayo + junio 2026.
//
// Auth: Bearer CRON_SECRET.
//
// La lógica vive en lib/publicaciones/sync.ts para evitar duplicar
// con sync-publicaciones-all.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncMarcaPublicaciones } from '@/lib/publicaciones/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // hasta 5 min — fetches paralelos del body suman tiempo

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  /* Default: SIN rango → trae todas las tareas de esta marca en Notion.
     Pedro pidió que el botón sincronice "todo en absoluto". El body
     puede pasar from/to si en algún caso se quiere acotar (CRON, etc). */
  let from: string | null = null
  let to: string | null = null
  try {
    const body = await request.json()
    if (body && typeof body === 'object') {
      if (typeof body.from === 'string') from = body.from
      if (typeof body.to === 'string') to = body.to
    }
  } catch {
    // body vacío OK
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: marca } = await service
    .from('marcas')
    .select('id, slug, nombre, notion_proyecto_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!marca) {
    return NextResponse.json({ ok: false, error: `marca '${slug}' no existe` }, { status: 404 })
  }
  if (!marca.notion_proyecto_id) {
    return NextResponse.json(
      {
        ok: false,
        error: `marca '${slug}' sin notion_proyecto_id. Configurar en BD para habilitar sync.`,
      },
      { status: 400 },
    )
  }

  const startedAt = Date.now()
  try {
    const result = await syncMarcaPublicaciones({
      service,
      marca: { id: marca.id, notion_proyecto_id: marca.notion_proyecto_id },
      from,
      to,
    })
    return NextResponse.json({
      ok: result.failed === 0,
      marca: { slug, nombre: marca.nombre },
      rango: { from, to },
      duration_ms: Date.now() - startedAt,
      ...result,
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `sync falló: ${e instanceof Error ? e.message : 'unknown'}`,
        duration_ms: Date.now() - startedAt,
      },
      { status: 502 },
    )
  }
}
