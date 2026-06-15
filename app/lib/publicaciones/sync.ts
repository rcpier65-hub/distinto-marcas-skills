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
  type EscenaParsed,
} from '@/lib/integrations/notion'

type PageContent = {
  copy: string | null
  guion: string | null
  escenas: EscenaParsed[]
}

// ──────────────────────────────────────────────────────────────────────
// Mapeo estado Notion → ENUM Postgres estado_publicacion
// ──────────────────────────────────────────────────────────────────────

/* Mapeo estado Notion → ENUM Postgres `estado_publicacion`.
   El sync ignora estados no listados acá (deja el estado anterior en
   DB) → causa el bug clásico de "la pub se queda atascada en /editor
   aunque en Notion ya la pasaron a publicada/listo". Para diagnosticar
   qué labels reales tiene Pedro en Notion, usar GET
   /api/v1/admin/diagnose-notion-estados (devuelve estados únicos por
   marca + cuáles no mapean). */
const ESTADO_MAP: Record<string, string> = {
  // Estados canónicos (mismo label en Notion y en DB)
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
  borrador: 'borrador',
  // Variantes del estado "ideando"
  idea: 'idear',
  ideando: 'idear',
  // Variantes de "edición"
  edicion: 'editando',
  'en edicion': 'editando',
  'en edición': 'editando',
  'por editar': 'editar',
  'para editar': 'editar',
  edited: 'aprobar',           // editor terminó → pasa a "por aprobar"
  // Variantes de "diseño"
  diseno: 'disenar',
  'diseñando': 'disenar',
  'por disenar': 'disenar',
  'por diseñar': 'disenar',
  // Variantes de "envío / aprobación / programación"
  'enviado al cliente': 'enviado',
  'por aprobar': 'aprobar',
  aprobado: 'aprobar',
  aprobada: 'aprobar',
  'para aprobar': 'aprobar',
  programado: 'programar',
  programada: 'programar',
  'por programar': 'programar',
  // Variantes "publicado/listo/terminado/hecho/completado" — Pedro y el
  // equipo usan estos labels en Notion para marcar pubs ya cerradas.
  // Sin estos mappings, esas pubs se quedaban en 'editar' viejo y
  // seguían apareciendo en /editor (bug reportado por Pedro 2026-06-15).
  publicado: 'enviado',
  publicada: 'enviado',
  publicados: 'enviado',
  publicadas: 'enviado',
  publicar: 'programar',       // pub que está EN COLA para publicar
  listo: 'aprobar',
  lista: 'aprobar',
  terminado: 'aprobar',
  terminada: 'aprobar',
  hecho: 'aprobar',
  hecha: 'aprobar',
  completado: 'aprobar',
  completada: 'aprobar',
  completo: 'aprobar',
  completa: 'aprobar',
  // Variantes "revisar / pendiente / draft"
  'en revision': 'aprobar',
  'en revisión': 'aprobar',
  revisar: 'aprobar',
  pendiente: 'tareas',
  draft: 'borrador',
  // Variantes "archivar"
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
  fn: (item: T) => Promise<PageContent>,
  concurrency: number,
): Promise<Map<T, PageContent>> {
  const results = new Map<T, PageContent>()
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      const item = items[idx]
      try {
        const content = await fn(item)
        results.set(item, content)
      } catch {
        results.set(item, { copy: null, guion: null, escenas: [] })
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
  /* Rango opcional. Si NO se pasa (o null), sincroniza TODAS las
     tareas del proyecto sin filtrar por fecha. */
  from?: string | null
  to?: string | null
  concurrency?: number
}): Promise<SyncResult> {
  const concurrency = args.concurrency ?? 5

  // 0. Cargamos editores activos para resolver editor_id desde el
  // editor_nombre que viene de Notion. Sin esto, el sync solo guarda
  // texto y crea "huérfanos" (publicaciones con nombre pero sin FK)
  // que en la página detalle aparecen como "Sin asignar".
  // Cache name → id case-insensitive.
  const { data: editoresData } = await args.service
    .from('editores')
    .select('id, nombre')
    .eq('activo', true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorIdByName = new Map<string, string>(
    ((editoresData ?? []) as any[]).map((e) => [
      String(e.nombre).toLowerCase().trim(),
      e.id,
    ]),
  )

  // 1. Fetch properties bulk
  const pubs = await queryGrillaForBrandExtended({
    notionProyectoId: args.marca.notion_proyecto_id,
    semanaInicio: args.from,
    semanaFin: args.to,
  })

  // 2. Fetch body content (copy + guion + escenas) en paralelo
  const contents = await fetchContentsWithLimit(
    pubs,
    (pub) => fetchPageContent(pub.notion_id.replace(/-/g, '')),
    concurrency,
  )

  // Guardamos las escenas extraídas para procesar después del upsert de pubs
  // (necesitamos el id de la publicacion para FK escenas.publicacion_id).
  // Usamos notion_original_id (sin dashes) como bridge entre las 2 tablas.
  const escenasPorNotionId = new Map<string, { dialogo: string | null; notas: string | null }[]>()

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
    const fetched = contents.get(pub) ?? { copy: null, guion: null, escenas: [] }
    const { copy, guion } = fetched
    if (fetched.escenas.length > 0) {
      escenasPorNotionId.set(notionId, fetched.escenas)
    }

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
      editor_id: pub.editor
        ? editorIdByName.get(String(pub.editor).toLowerCase().trim()) ?? null
        : null,
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

  // 4. Sincronizar escenas (guión técnico estructurado)
  // Estrategia: por cada pub con escenas extraídas de Notion, borrar las
  // escenas locales y reinsertarlas. Esto es idempotente y simple. La
  // contra es que pierde ediciones manuales del guión hechas en la app,
  // pero coincide con la decisión de "Notion gana siempre" que aplicamos
  // al resto del sync. Si el equipo necesita preservar ediciones, hay
  // que mover esto a un merge más fino (ej. matching por escena_num + hash).
  if (escenasPorNotionId.size > 0) {
    // Necesitamos los uuids reales de las publicaciones para FK
    const notionIds = [...escenasPorNotionId.keys()]
    const { data: pubRows } = await args.service
      .from('publicaciones')
      .select('id, notion_original_id')
      .in('notion_original_id', notionIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idByNotion = new Map<string, string>(
      ((pubRows ?? []) as any[]).map((r) => [r.notion_original_id, r.id]),
    )

    for (const [notionId, escenasParsed] of escenasPorNotionId) {
      const pubId = idByNotion.get(notionId)
      if (!pubId) continue

      // Borrar escenas viejas de esta publicación
      const { error: delErr } = await args.service
        .from('escenas')
        .delete()
        .eq('publicacion_id', pubId)
      if (delErr) {
        errors.push(`escenas delete ${notionId}: ${delErr.message}`)
        continue
      }

      // Insertar las nuevas. escena_num empieza en 1.
      const rows = escenasParsed.map((e, idx) => ({
        publicacion_id: pubId,
        escena_num: idx + 1,
        dialogo: e.dialogo,
        notas: e.notas,
      }))
      const { error: insErr } = await args.service.from('escenas').insert(rows)
      if (insErr) {
        errors.push(`escenas insert ${notionId}: ${insErr.message}`)
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
