// app/app/api/v1/admin/sync-publicaciones-all/route.ts
//
// POST /api/v1/admin/sync-publicaciones-all
//
// Sincroniza Notion → publicaciones para TODAS las marcas activas
// que tengan notion_proyecto_id. Las que no tienen (ej. warrior-supps)
// se marcan como "skipped" — NO como failed, porque es comportamiento
// esperado.
//
// Body (opcional):
//   {
//     "from": "2026-05-01",   // default mayo 2026
//     "to":   "2026-06-30"    // default junio 2026
//   }
//
// Devuelve resumen consolidado + breakdown por marca.
//
// Auth: Bearer <CRON_SECRET>. Llamado desde server action del cockpit/publicaciones.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queryGrillaForBrand, type GrillaPublicacion } from '@/lib/integrations/notion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // hasta 5 min — 7 marcas × ~30s en peor caso

// Mismo mapeo que sync-publicaciones/[slug] — duplicado en este file por
// simplicidad. Si crece, conviene moverlo a lib/publicaciones/estado-map.ts.
const ESTADO_MAP: Record<string, string> = {
  tareas: 'tareas',
  idear: 'idear',
  editando: 'editando',
  editar: 'editar',
  disenar: 'disenar',
  enviado: 'enviado',
  aprobar: 'aprobar',
  programar: 'programar',
  'programar anuncios': 'programar_anuncios',
  programar_anuncios: 'programar_anuncios',
  archivado: 'archivado',
  idea: 'idear',
  ideando: 'idear',
  edicion: 'editando',
  'en edicion': 'editando',
  'por editar': 'editar',
  diseno: 'disenar',
  'diseñando': 'disenar',
  'por disenar': 'disenar',
  'por diseñar': 'disenar',
  'enviado al cliente': 'enviado',
  'por aprobar': 'aprobar',
  aprobado: 'aprobar',
  programado: 'programar',
  archivar: 'archivado',
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function mapEstado(notionEstado: string | null): string | null {
  if (!notionEstado) return null
  return ESTADO_MAP[normalizeKey(notionEstado)] ?? null
}

type MarcaResult =
  | {
      slug: string
      status: 'ok'
      fetched: number
      inserted: number
      updated: number
      failed: number
      estados_no_mapeados: string[]
    }
  | { slug: string; status: 'skipped'; reason: string }
  | { slug: string; status: 'error'; error: string }

async function syncMarca(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  marca: { id: string; slug: string; notion_proyecto_id: string },
  from: string,
  to: string,
): Promise<MarcaResult> {
  let pubs: GrillaPublicacion[] = []
  try {
    pubs = await queryGrillaForBrand({
      notionProyectoId: marca.notion_proyecto_id,
      semanaInicio: from,
      semanaFin: to,
    })
  } catch (e) {
    return {
      slug: marca.slug,
      status: 'error',
      error: e instanceof Error ? e.message : 'unknown',
    }
  }

  let inserted = 0
  let updated = 0
  let failed = 0
  const estadosNoMapeados = new Set<string>()

  for (const pub of pubs) {
    const notionId = pub.notion_id.replace(/-/g, '')
    const estadoMapeado = mapEstado(pub.estado)
    if (pub.estado && !estadoMapeado) estadosNoMapeados.add(pub.estado)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = {
      marca_id: marca.id,
      nombre: pub.titulo,
      fecha_publicacion: pub.fecha,
      plataformas: pub.plataformas,
      tipo_contenido: pub.tipo_contenido,
      notion_original_id: notionId,
      notion_url: pub.url,
    }
    if (estadoMapeado) patch.estado = estadoMapeado

    const { data: existing } = await service
      .from('publicaciones')
      .select('id')
      .eq('notion_original_id', notionId)
      .maybeSingle()

    if (existing) {
      const { error } = await service
        .from('publicaciones')
        .update(patch)
        .eq('id', existing.id)
      if (error) failed++
      else updated++
    } else {
      const { error } = await service.from('publicaciones').insert(patch)
      if (error) failed++
      else inserted++
    }
  }

  return {
    slug: marca.slug,
    status: 'ok',
    fetched: pubs.length,
    inserted,
    updated,
    failed,
    estados_no_mapeados: [...estadosNoMapeados],
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Parse body opcional
  let from = '2026-05-01'
  let to = '2026-06-30'
  try {
    const body = await request.json()
    if (body && typeof body === 'object') {
      if (typeof body.from === 'string') from = body.from
      if (typeof body.to === 'string') to = body.to
    }
  } catch {
    // body vacío ok
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Listar marcas activas
  const { data: marcas, error } = await service
    .from('marcas')
    .select('id, slug, nombre, notion_proyecto_id, activa')
    .eq('activa', true)
    .order('slug')
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const startedAt = Date.now()

  // Separar marcas con proyecto vs sin proyecto
  const conProyecto: Array<{ id: string; slug: string; notion_proyecto_id: string }> = []
  const sinProyecto: MarcaResult[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (marcas ?? []) as any[]) {
    if (m.notion_proyecto_id) {
      conProyecto.push({ id: m.id, slug: m.slug, notion_proyecto_id: m.notion_proyecto_id })
    } else {
      sinProyecto.push({
        slug: m.slug,
        status: 'skipped',
        reason: 'sin notion_proyecto_id',
      })
    }
  }

  // Sync en paralelo (Promise.all — Node es single-threaded pero
  // el bottleneck es HTTP a Notion + Supabase, así que paralelizar
  // ahorra tiempo significativo)
  const results = await Promise.all(
    conProyecto.map(m => syncMarca(service, m, from, to)),
  )

  const allResults: MarcaResult[] = [...results, ...sinProyecto]

  // Totales
  const totals = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    ok: 0,
    skipped: 0,
    errored: 0,
  }
  for (const r of allResults) {
    if (r.status === 'ok') {
      totals.fetched += r.fetched
      totals.inserted += r.inserted
      totals.updated += r.updated
      totals.failed += r.failed
      totals.ok++
    } else if (r.status === 'skipped') {
      totals.skipped++
    } else {
      totals.errored++
    }
  }

  return NextResponse.json({
    ok: totals.errored === 0,
    duration_ms: Date.now() - startedAt,
    rango: { from, to },
    totals,
    por_marca: allResults,
  })
}
