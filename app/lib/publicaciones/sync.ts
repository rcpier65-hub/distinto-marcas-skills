// app/lib/publicaciones/sync.ts
//
// Orquesta el sync Notion → publicaciones para UNA marca. Lo usan
// los endpoints sync-publicaciones/[slug] y sync-publicaciones-all
// para evitar duplicar la lógica.
//
// Flow:
//   1. queryGrillaForBrandExtended → properties bulk
//   2. fetchPageContent por cada pub (concurrency 5) → copy + guión del body
//   3. Upsert por notion_original_id en tabla publicaciones
//
// Decisiones de diseño:
//   - Notion sobrescribe todos los campos mapeados.
//   - Si el fetch del body de UNA página falla, copy/guion quedan null
//     y NO falla el sync entero.
//   - Concurrency configurable (default 5) para respetar rate limit Notion.

import {
  queryGrillaForBrandExtended,
  fetchPageContent,
} from '@/lib/integrations/notion'

// ──────────────────────────────────────────────────────────────────────
// Mapeo estado Notion → ENUM Postgres estado_publicacion
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// Worker pool: limita las requests paralelas a Notion
// ──────────────────────────────────────────────────────────────────────

async function fetchContentsWithLimit<T>(
  items: T[],
  fn: (item: T) => Promise<{ copy: string | null; guion: string | null }>,
  concurrency: number,
): Promise<Map<T, { copy: string | null; guion: string | null }>> {
  const results = new Map<T, { copy: string | null; guion: string | null }>()
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      const item = items[idx]
      try {
        const content = await fn(item)
        results.set(item, content)
      } catch {
        results.set(item, { copy: null, guion: null })
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    worker(),
  )
  await Promise.all(workers)
  return results
}

// ──────────────────────────────────────────────────────────────────────
// Main: sync una marca
// ──────────────────────────────────────────────────────────────────────

export type SyncResult = {
  fetched: number
  inserted: number
  updated: number
  failed: number
  estados_no_mapeados: string[]
  errors: string[]
}

export async function syncMarcaPublicaciones(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any
  marca: { id: string; notion_proyecto_id: string }
  from: string
  to: string
  concurrency?: number
}): Promise<SyncResult> {
  const concurrency = args.concurrency ?? 5

  // 1. Fetch properties bulk
  const pubs = await queryGrillaForBrandExtended({
    notionProyectoId: args.marca.notion_proyecto_id,
    semanaInicio: args.from,
    semanaFin: args.to,
  })

  // 2. Fetch body content (copy + guion) en paralelo
  const contents = await fetchContentsWithLimit(
    pubs,
    (pub) => fetchPageContent(pub.notion_id.replace(/-/g, '')),
    concurrency,
  )

  // 3. Upsert por notion_original_id
  let inserted = 0
  let updated = 0
  let failed = 0
  const estadosNoMapeados = new Set<string>()
  const errors: string[] = []

  for (const pub of pubs) {
    const notionId = pub.notion_id.replace(/-/g, '')
    const estadoMapeado = mapEstado(pub.estado)
    if (pub.estado && !estadoMapeado) estadosNoMapeados.add(pub.estado)
    const { copy, guion } = contents.get(pub) ?? { copy: null, guion: null }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = {
      marca_id: args.marca.id,
      nombre: pub.titulo,
      fecha_publicacion: pub.fecha,
      fecha_edicion: pub.fecha_edicion,
      fecha_diseno: pub.fecha_diseno,
      plataformas: pub.plataformas,
      tipo_contenido: pub.tipo_contenido,
      objetivos: pub.objetivos,
      enlace_tomas: pub.enlace_tomas,
      enlace_musica: pub.enlace_musica,
      portada_cruda_url: pub.portada_cruda_url,
      portada_editada_url: pub.portada_editada_url,
      video_con_musica_url: pub.video_con_musica_url,
      video_sin_musica_url: pub.video_sin_musica_url,
      editor_nombre: pub.editor,
      copy_listo: pub.copy_listo,
      musica_lista: pub.musica_lista,
      portada_lista: pub.portada_lista,
      video_aprobado: pub.video_aprobado,
      copy,
      guion,
      notion_original_id: notionId,
      notion_url: pub.url,
    }
    if (estadoMapeado) patch.estado = estadoMapeado

    const { data: existing } = await args.service
      .from('publicaciones')
      .select('id')
      .eq('notion_original_id', notionId)
      .maybeSingle()

    if (existing) {
      const { error } = await args.service
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
      const { error } = await args.service.from('publicaciones').insert(patch)
      if (error) {
        failed++
        errors.push(`insert ${pub.notion_id}: ${error.message}`)
      } else {
        inserted++
      }
    }
  }

  return {
    fetched: pubs.length,
    inserted,
    updated,
    failed,
    estados_no_mapeados: [...estadosNoMapeados],
    errors: errors.slice(0, 10), // limit
  }
}
