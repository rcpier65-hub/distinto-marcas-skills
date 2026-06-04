// app/app/api/v1/admin/sync-publicaciones/[slug]/route.ts
//
// POST /api/v1/admin/sync-publicaciones/[slug]
//
// Sincroniza publicaciones desde Notion ("📅 GRILLA DE CONTENIDO")
// hacia la tabla `publicaciones` de Supabase.
//
// Body (opcional):
//   {
//     "from": "2026-05-01",   // ISO YYYY-MM-DD, default 2026-05-01
//     "to":   "2026-06-30"    // ISO YYYY-MM-DD, default 2026-06-30
//   }
//
// Decisiones de producto (Pedro 2026-06-01):
//   - Alcance default: mayo + junio 2026 completos
//   - Notion siempre gana: sobrescribe los campos mapeados en BD
//   - Publicaciones ausentes en Notion: NO se tocan (no se borran ni archivan)
//
// Campos que pisa de Notion:
//   - nombre, fecha_publicacion, plataformas, tipo_contenido,
//     estado (mapeado al ENUM local), notion_url
//
// Campos que preserva (no presentes en queryGrillaForBrand):
//   - copy, guion, enlace_tomas, enlace_musica, portada_*,
//     copy_listo, musica_lista, portada_lista, disenado, editado,
//     video_aprobado, editor_nombre, notas
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queryGrillaForBrand, type GrillaPublicacion } from '@/lib/integrations/notion'

export const dynamic = 'force-dynamic'
export const maxDuration = 120  // hasta 2 min — múltiples páginas Notion + upserts

// ──────────────────────────────────────────────────────────────────────
// Mapeo de estado Notion → ENUM estado_publicacion en Postgres
// ──────────────────────────────────────────────────────────────────────
// ENUM Postgres: 'tareas', 'idear', 'editando', 'editar', 'disenar',
//                'enviado', 'aprobar', 'programar', 'programar_anuncios',
//                'archivado'
//
// Normalizamos a lowercase + sin acentos antes de buscar en el map.
// Si un estado de Notion NO matchea, se reporta en `estados_no_mapeados`
// y el campo estado NO se actualiza (preserva el valor en BD).
const ESTADO_MAP: Record<string, string> = {
  // Variantes directas
  'tareas': 'tareas',
  'idear': 'idear',
  'editando': 'editando',
  'editar': 'editar',
  'disenar': 'disenar',
  'enviado': 'enviado',
  'aprobar': 'aprobar',
  'programar': 'programar',
  'programar anuncios': 'programar_anuncios',
  'programar_anuncios': 'programar_anuncios',
  'archivado': 'archivado',
  // Sinónimos comunes en el flujo de Pedro
  'idea': 'idear',
  'ideando': 'idear',
  'edicion': 'editando',
  'en edicion': 'editando',
  'por editar': 'editar',
  'diseno': 'disenar',
  'diseñando': 'disenar',
  'por disenar': 'disenar',
  'por diseñar': 'disenar',
  'enviado al cliente': 'enviado',
  'por aprobar': 'aprobar',
  'aprobado': 'aprobar',
  'programado': 'programar',
  'archivar': 'archivado',
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacritics
    .trim()
    .replace(/\s+/g, ' ')
}

function mapEstado(notionEstado: string | null): string | null {
  if (!notionEstado) return null
  const key = normalizeKey(notionEstado)
  return ESTADO_MAP[key] ?? null
}

// ──────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const { slug } = await params

  // Parse body opcional para overrides de fecha
  let from = '2026-05-01'
  let to = '2026-06-30'
  try {
    const body = await request.json()
    if (body && typeof body === 'object') {
      if (typeof body.from === 'string') from = body.from
      if (typeof body.to === 'string') to = body.to
    }
  } catch {
    // body vacío es OK, usa defaults
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Resolver marca + notion_proyecto_id
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

  // 2. Fetch desde Notion
  let pubs: GrillaPublicacion[] = []
  try {
    pubs = await queryGrillaForBrand({
      notionProyectoId: marca.notion_proyecto_id,
      semanaInicio: from,
      semanaFin: to,
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Notion query falló: ${e instanceof Error ? e.message : 'unknown'}`,
      },
      { status: 502 },
    )
  }

  // 3. Upsert por notion_original_id
  let inserted = 0
  let updated = 0
  let failed = 0
  const estadosNoMapeados = new Set<string>()
  const errors: string[] = []

  for (const pub of pubs) {
    const notionId = pub.notion_id.replace(/-/g, '') // formato sin dashes como en BD

    const estadoMapeado = mapEstado(pub.estado)
    if (pub.estado && !estadoMapeado) {
      estadosNoMapeados.add(pub.estado)
    }

    // Patch base — Notion sobrescribe todos estos campos
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

    // Check if exists para distinguir insert vs update en el response
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
      if (error) {
        failed++
        errors.push(`update ${pub.notion_id}: ${error.message}`)
      } else {
        updated++
      }
    } else {
      const { error } = await service.from('publicaciones').insert(patch)
      if (error) {
        failed++
        errors.push(`insert ${pub.notion_id}: ${error.message}`)
      } else {
        inserted++
      }
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    marca: { slug, nombre: marca.nombre },
    rango: { from, to },
    fetched: pubs.length,
    inserted,
    updated,
    failed,
    estados_no_mapeados: [...estadosNoMapeados],
    errors: errors.slice(0, 10),
  })
}
