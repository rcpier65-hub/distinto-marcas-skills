// app/lib/integrations/notion.ts
// Cliente Notion HTTP usando fetch nativo (sin SDK).
// Razón: el SDK @notionhq/client pesa ~150KB y trae axios; Node 22 ya tiene fetch global.
//
// Usa la API REST de Notion v1: https://developers.notion.com/reference/post-database-query
// Requiere env vars:
//   NOTION_TOKEN          — Internal integration secret (ntn_xxx o secret_xxx)
//   NOTION_GRILLA_DB_ID   — UUID del database "📅 GRILLA DE CONTENIDO"
//                           Valor correcto: cf388541-0ddd-8350-acf1-01666ea5208e
//                           (validado 2026-05-19 con curl POST /databases/{id}/query)
//
// NOTA: el ID 11688541-0ddd-83d3-8e56-873a2ca08fb9 que aparece en `collection://`
// en el MCP de Notion es el *data source ID* interno, NO el database ID.
// La REST API NO acepta data source IDs en `/databases/{id}/query`.

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

// Tipos mínimos de la respuesta de query a database
// Solo modelamos las propiedades que usamos para evitar lock-in al schema completo.
type NotionRichText = { plain_text: string }
type NotionTitleProp = { type: 'title'; title: NotionRichText[] }
type NotionDateProp = { type: 'date'; date: { start: string; end: string | null } | null }
type NotionMultiSelectProp = { type: 'multi_select'; multi_select: { name: string }[] }
type NotionStatusProp = { type: 'status'; status: { name: string } | null }
type NotionRelationProp = { type: 'relation'; relation: { id: string }[] }
type NotionUrlProp = { type: 'url'; url: string | null }
type NotionCheckboxProp = { type: 'checkbox'; checkbox: boolean }
type NotionRichTextProp = { type: 'rich_text'; rich_text: NotionRichText[] }
type NotionUnknownProp = { type: string; [k: string]: unknown }

type NotionProperty =
  | NotionTitleProp
  | NotionDateProp
  | NotionMultiSelectProp
  | NotionStatusProp
  | NotionRelationProp
  | NotionUrlProp
  | NotionCheckboxProp
  | NotionRichTextProp
  | NotionUnknownProp

type NotionPage = {
  id: string
  url: string
  properties: Record<string, NotionProperty>
}

type NotionQueryResponse = {
  results: NotionPage[]
  next_cursor: string | null
  has_more: boolean
}

export type GrillaPublicacion = {
  notion_id: string
  titulo: string
  fecha: string // ISO YYYY-MM-DD
  plataformas: string[]
  tipo_contenido: string[]
  estado: string | null
  url: string
}

/**
 * Query a la database "📅 GRILLA DE CONTENIDO" filtrando:
 *  - proyecto (relation) contiene el `notionProyectoId` de la marca
 *  - Grilla de FIT (date) entre `semanaInicio` y `semanaFin` (inclusive)
 *
 * Devuelve TODAS las publicaciones programadas para esa marca en esa semana.
 * Pagina automáticamente si Notion devuelve has_more=true.
 */
export async function queryGrillaForBrand(args: {
  notionProyectoId: string
  semanaInicio: string // YYYY-MM-DD
  semanaFin: string // YYYY-MM-DD
}): Promise<GrillaPublicacion[]> {
  const token = process.env.NOTION_TOKEN
  const dbId = process.env.NOTION_GRILLA_DB_ID
  if (!token) throw new Error('NOTION_TOKEN no configurado')
  if (!dbId) throw new Error('NOTION_GRILLA_DB_ID no configurado')

  const filter = {
    and: [
      {
        property: 'proyecto',
        relation: { contains: args.notionProyectoId },
      },
      {
        property: 'Grilla de FIT',
        date: { on_or_after: args.semanaInicio },
      },
      {
        property: 'Grilla de FIT',
        date: { on_or_before: args.semanaFin },
      },
    ],
  }

  const sorts = [{ property: 'Grilla de FIT', direction: 'ascending' as const }]

  const all: GrillaPublicacion[] = []
  let cursor: string | undefined = undefined

  // Paginación: máx ~5 vueltas por seguridad (5 × 100 = 500 publicaciones por semana, irreal)
  for (let i = 0; i < 5; i++) {
    const body: Record<string, unknown> = { filter, sorts, page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // No cache: queremos data fresca cada vez (la grilla puede cambiar minutos antes)
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Notion API ${res.status}: ${errText.slice(0, 300)}`)
    }

    const json = (await res.json()) as NotionQueryResponse
    for (const page of json.results) {
      const pub = parseGrillaPage(page)
      if (pub) all.push(pub)
    }

    if (!json.has_more || !json.next_cursor) break
    cursor = json.next_cursor
  }

  return all
}

/**
 * Convierte una NotionPage en GrillaPublicacion.
 * Devuelve null si la página no tiene los campos mínimos (título + fecha).
 */
function parseGrillaPage(page: NotionPage): GrillaPublicacion | null {
  const props = page.properties
  const titulo = readTitle(props['Nombre de la tarea'])
  const fecha = readDateStart(props['Grilla de FIT'])
  if (!titulo || !fecha) return null

  return {
    notion_id: page.id,
    titulo,
    fecha,
    plataformas: readMultiSelect(props['Plataforma']),
    tipo_contenido: readMultiSelect(props['Tipo de contenido']),
    estado: readStatus(props['Estado']),
    url: page.url,
  }
}

function readTitle(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== 'title') return ''
  return (prop as NotionTitleProp).title.map((t) => t.plain_text).join('').trim()
}

function readDateStart(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== 'date') return null
  const date = (prop as NotionDateProp).date
  if (!date) return null
  // Si viene como datetime ("2026-05-24T10:00:00.000Z"), nos quedamos solo con la fecha
  return date.start.slice(0, 10)
}

function readMultiSelect(prop: NotionProperty | undefined): string[] {
  if (!prop || prop.type !== 'multi_select') return []
  return (prop as NotionMultiSelectProp).multi_select.map((o) => o.name)
}

function readStatus(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== 'status') return null
  const s = (prop as NotionStatusProp).status
  return s ? s.name : null
}

// ════════════════════════════════════════════════════════════════════════
// EXTENDED: query con todas las properties + fetch del body
// ════════════════════════════════════════════════════════════════════════
//
// La versión "Extended" trae ~12 properties extra (editor, fechas,
// enlaces, checkboxes, portadas, objetivos) Y permite extraer el copy
// y el guión del body markdown de cada página.
//
// queryGrillaForBrand (la original) sigue existiendo intacta porque la
// usa el flow de envío de grilla semanal por WhatsApp — que solo
// necesita título + fecha + plataformas.

export type GrillaPublicacionExtendida = GrillaPublicacion & {
  editor: string | null
  fecha_edicion: string | null
  fecha_diseno: string | null
  enlace_tomas: string | null
  enlace_musica: string | null
  objetivos: string[]
  copy_listo: boolean
  musica_lista: boolean
  portada_lista: boolean
  video_aprobado: boolean
  portada_cruda_url: string | null
  portada_editada_url: string | null
  // Videos editados (Drive):
  //   "Editado 😁"     en Notion → con música (video terminado)
  //   "SIN NADA🔇 1"  en Notion → sin música (track limpio)
  video_con_musica_url: string | null
  video_sin_musica_url: string | null
}

/**
 * Versión extendida que también extrae editor, fechas, enlaces,
 * checkboxes y portadas. Mismo filtro y paginación que la original.
 */
export async function queryGrillaForBrandExtended(args: {
  notionProyectoId: string
  semanaInicio: string
  semanaFin: string
}): Promise<GrillaPublicacionExtendida[]> {
  const token = process.env.NOTION_TOKEN
  const dbId = process.env.NOTION_GRILLA_DB_ID
  if (!token) throw new Error('NOTION_TOKEN no configurado')
  if (!dbId) throw new Error('NOTION_GRILLA_DB_ID no configurado')

  const filter = {
    and: [
      { property: 'proyecto', relation: { contains: args.notionProyectoId } },
      { property: 'Grilla de FIT', date: { on_or_after: args.semanaInicio } },
      { property: 'Grilla de FIT', date: { on_or_before: args.semanaFin } },
    ],
  }
  const sorts = [{ property: 'Grilla de FIT', direction: 'ascending' as const }]

  const all: GrillaPublicacionExtendida[] = []
  let cursor: string | undefined = undefined

  for (let i = 0; i < 5; i++) {
    const body: Record<string, unknown> = { filter, sorts, page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Notion API ${res.status}: ${errText.slice(0, 300)}`)
    }
    const json = (await res.json()) as NotionQueryResponse
    for (const page of json.results) {
      const pub = parseGrillaPageExtended(page)
      if (pub) all.push(pub)
    }
    if (!json.has_more || !json.next_cursor) break
    cursor = json.next_cursor
  }
  return all
}

function parseGrillaPageExtended(page: NotionPage): GrillaPublicacionExtendida | null {
  const base = parseGrillaPage(page)
  if (!base) return null
  const props = page.properties
  return {
    ...base,
    editor: readMultiSelectFirst(props['Editor']),
    fecha_edicion: readDateStart(props['Fecha de edicion']),
    // Notion tiene un espacio al final del nombre "Fecha de diseño "
    fecha_diseno:
      readDateStart(props['Fecha de diseño ']) ?? readDateStart(props['Fecha de diseño']),
    enlace_tomas: readUrl(props['Enlace de tomas']),
    enlace_musica: readUrl(props['Enlace musica']),
    objetivos: readMultiSelect(props['Objetivo']),
    copy_listo: readCheckbox(props['Copy Listo']),
    musica_lista: readCheckbox(props['MÚSICA']),
    portada_lista: readCheckbox(props['Portada lista']),
    video_aprobado: readCheckbox(props['VIDEO APROBADO']),
    portada_cruda_url: readTextOrUrl(props['PORTADA CRUDA']),
    portada_editada_url: readUrl(props['PORTADA EDITADA']),
    video_con_musica_url: readUrl(props['Editado 😁']),
    video_sin_musica_url: readUrl(props['SIN NADA🔇 1']),
  }
}

function readMultiSelectFirst(prop: NotionProperty | undefined): string | null {
  const arr = readMultiSelect(prop)
  return arr[0] ?? null
}

function readUrl(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== 'url') return null
  return (prop as NotionUrlProp).url ?? null
}

function readCheckbox(prop: NotionProperty | undefined): boolean {
  if (!prop || prop.type !== 'checkbox') return false
  return (prop as NotionCheckboxProp).checkbox === true
}

/**
 * Algunos campos en Notion están como `rich_text` (text). Concatenamos
 * todos los plain_text. Si NO es rich_text pero es url, devuelve la url.
 */
function readTextOrUrl(prop: NotionProperty | undefined): string | null {
  if (!prop) return null
  if (prop.type === 'rich_text') {
    const t = (prop as NotionRichTextProp).rich_text
      .map((x) => x.plain_text)
      .join('')
      .trim()
    return t || null
  }
  if (prop.type === 'url') {
    return (prop as NotionUrlProp).url ?? null
  }
  return null
}

// ────────────────────────────────────────────────────────────────────────
// Body content: extraer copy + guión del contenido markdown de una página
// ────────────────────────────────────────────────────────────────────────
//
// Notion API: GET /v1/blocks/{page_id}/children?page_size=100
// Devuelve los bloques top-level. Los nested (ej. items dentro de columnas)
// requieren recursión. Para el caso de las publicaciones, los blocks
// que nos interesan son:
//   - heading_3 "💬 COPY" → el siguiente paragraph/bulleted_list es el copy
//   - column_list → contiene 2 columns:
//       column[0]: paragraph "USAR AUDIO OPCIÓN N"
//       column[1]: table con guión (voz en off | toma/visual)
//   - table → si aparece suelto, también es guión
//
// Estrategia: hacemos UN solo fetch al endpoint, parseamos blocks
// recursivamente con depth=2 (suficiente para columnas), generamos
// markdown plano para copy y guion separados.

type NotionBlock = {
  id: string
  type: string
  has_children?: boolean
  paragraph?: { rich_text: NotionRichText[] }
  heading_1?: { rich_text: NotionRichText[] }
  heading_2?: { rich_text: NotionRichText[] }
  heading_3?: { rich_text: NotionRichText[] }
  bulleted_list_item?: { rich_text: NotionRichText[] }
  numbered_list_item?: { rich_text: NotionRichText[] }
  quote?: { rich_text: NotionRichText[] }
  callout?: { rich_text: NotionRichText[] }
  table_row?: { cells: NotionRichText[][] }
  // Para column_list y column no hay properties especiales, solo has_children
}

type NotionBlocksResponse = {
  results: NotionBlock[]
  next_cursor: string | null
  has_more: boolean
}

async function fetchChildren(
  pageOrBlockId: string,
  token: string,
): Promise<NotionBlock[]> {
  const out: NotionBlock[] = []
  let cursor: string | undefined = undefined
  for (let i = 0; i < 5; i++) {
    const url = new URL(`${NOTION_API}/blocks/${pageOrBlockId}/children`)
    url.searchParams.set('page_size', '100')
    if (cursor) url.searchParams.set('start_cursor', cursor)
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
      },
      cache: 'no-store',
    })
    if (!res.ok) break
    const json = (await res.json()) as NotionBlocksResponse
    out.push(...json.results)
    if (!json.has_more || !json.next_cursor) break
    cursor = json.next_cursor
  }
  return out
}

function richTextToString(rt: NotionRichText[] | undefined): string {
  if (!rt) return ''
  return rt.map((x) => x.plain_text).join('')
}

function blockToText(b: NotionBlock): string {
  switch (b.type) {
    case 'paragraph':
      return richTextToString(b.paragraph?.rich_text)
    case 'heading_1':
      return richTextToString(b.heading_1?.rich_text)
    case 'heading_2':
      return richTextToString(b.heading_2?.rich_text)
    case 'heading_3':
      return richTextToString(b.heading_3?.rich_text)
    case 'bulleted_list_item':
      return '• ' + richTextToString(b.bulleted_list_item?.rich_text)
    case 'numbered_list_item':
      return richTextToString(b.numbered_list_item?.rich_text)
    case 'quote':
      return richTextToString(b.quote?.rich_text)
    case 'callout':
      return richTextToString(b.callout?.rich_text)
    default:
      return ''
  }
}

/**
 * Detecta si un block es el marcador de inicio del COPY.
 *
 * Formatos soportados (basados en data real de las marcas):
 *  1. Little Joe / Typhouse: `### 💬 COPY` (heading_3 con título)
 *  2. Manrique: `COPY:` como paragraph solo, seguido de los párrafos del copy
 *  3. Inline: `COPY: Lorem ipsum...` (todo en un solo paragraph)
 *  4. Variantes de mayúsculas y emoji opcional.
 *
 * Devuelve { isMarker, inline } donde inline contiene el copy en la
 * misma línea (caso 3) o '' (casos 1/2).
 */
function detectCopyMarker(b: NotionBlock): { isMarker: boolean; inline: string } {
  let text = ''
  if (
    b.type === 'heading_1' ||
    b.type === 'heading_2' ||
    b.type === 'heading_3' ||
    b.type === 'paragraph'
  ) {
    text = blockToText(b)
  } else {
    return { isMarker: false, inline: '' }
  }
  const trimmed = text.trim()
  if (!trimmed) return { isMarker: false, inline: '' }
  const lowered = trimmed.toLowerCase()

  // Casos 1/2: marker exacto (con o sin dos puntos, con o sin emoji)
  if (
    lowered === 'copy' ||
    lowered === 'copy:' ||
    lowered === '💬 copy' ||
    lowered === '💬 copy:'
  ) {
    return { isMarker: true, inline: '' }
  }

  // Caso 3: "COPY: Lorem..." en una sola línea
  const m = trimmed.match(/^(?:💬\s*)?copy\s*:\s*(.+)/i)
  if (m && m[1].trim()) {
    return { isMarker: true, inline: m[1].trim() }
  }

  return { isMarker: false, inline: '' }
}

/**
 * Trae el body de una página y extrae:
 *   - copy:  texto bajo el heading "💬 COPY" (o variantes).
 *   - guion: tabla de 2 columnas (voz en off | toma/visual) si existe.
 *
 * Si el fetch falla, devuelve { copy: null, guion: null } sin lanzar.
 * Esto evita romper el sync entero por una página con permisos raros.
 */
export async function fetchPageContent(
  pageIdWithoutDashes: string,
): Promise<{ copy: string | null; guion: string | null }> {
  const token = process.env.NOTION_TOKEN
  if (!token) return { copy: null, guion: null }

  try {
    const blocks = await fetchChildren(pageIdWithoutDashes, token)

    // 1. Encontrar el marker de COPY (heading "💬 COPY", paragraph "COPY:" o "COPY: ...")
    let copyStartIdx = -1
    let markerInline = ''
    for (let i = 0; i < blocks.length; i++) {
      const r = detectCopyMarker(blocks[i])
      if (r.isMarker) {
        copyStartIdx = i
        markerInline = r.inline
        break
      }
    }

    // 2. El copy son los blocks DESPUÉS del marker hasta el próximo heading,
    //    table o column_list (esos últimos son guión, no copy).
    let copy: string | null = null
    if (copyStartIdx >= 0) {
      const lines: string[] = []
      if (markerInline) lines.push(markerInline)
      for (let i = copyStartIdx + 1; i < blocks.length; i++) {
        const b = blocks[i]
        if (
          b.type === 'heading_1' ||
          b.type === 'heading_2' ||
          b.type === 'heading_3'
        )
          break
        if (b.type === 'table' || b.type === 'column_list') break
        const text = blockToText(b)
        if (text) lines.push(text)
      }
      const joined = lines.join('\n').trim()
      copy = joined || null
    }

    // 3. El guión: buscamos column_lists y/o tables. Tomamos el primer
    //    column_list (que tiene 2 columnas: nota+tabla) o la primera table.
    let guion: string | null = null
    for (const b of blocks) {
      if (b.type === 'column_list' && b.has_children) {
        guion = await extractGuionFromColumnList(b.id, token)
        if (guion) break
      }
      if (b.type === 'table' && b.has_children) {
        guion = await extractGuionFromTable(b.id, token)
        if (guion) break
      }
    }

    return { copy, guion }
  } catch {
    return { copy: null, guion: null }
  }
}

async function extractGuionFromColumnList(
  columnListId: string,
  token: string,
): Promise<string | null> {
  const columns = await fetchChildren(columnListId, token)
  const parts: string[] = []
  for (const col of columns) {
    if (col.type !== 'column' || !col.has_children) continue
    const children = await fetchChildren(col.id, token)
    for (const c of children) {
      if (c.type === 'table' && c.has_children) {
        const t = await extractGuionFromTable(c.id, token)
        if (t) parts.push(t)
      } else {
        const text = blockToText(c)
        if (text) parts.push(text)
      }
    }
  }
  const joined = parts.join('\n').trim()
  return joined || null
}

async function extractGuionFromTable(
  tableId: string,
  token: string,
): Promise<string | null> {
  const rows = await fetchChildren(tableId, token)
  const lines: string[] = []
  for (const r of rows) {
    if (r.type !== 'table_row' || !r.table_row) continue
    const cells = r.table_row.cells.map((c) => richTextToString(c).trim())
    if (cells.every((c) => !c)) continue
    lines.push(cells.join(' | '))
  }
  const joined = lines.join('\n').trim()
  return joined || null
}

/**
 * Helper: agrupa publicaciones por día de semana (lun-vie) y devuelve un array
 * de 5 títulos (uno por día), o string vacío si no hay publicación ese día.
 *
 * Útil para alimentar la plantilla PNG (cards lun-vie).
 *
 * `semanaInicio` debe ser el lunes (YYYY-MM-DD).
 */
export function buildTitulosPorDia(
  publicaciones: GrillaPublicacion[],
  semanaInicio: string,
): string[] {
  const monday = new Date(semanaInicio + 'T12:00:00Z')
  const result = ['', '', '', '', '']
  for (let i = 0; i < 5; i++) {
    const dia = new Date(monday)
    dia.setUTCDate(monday.getUTCDate() + i)
    const isoDia = dia.toISOString().slice(0, 10)
    const delDia = publicaciones.filter((p) => p.fecha === isoDia)
    if (delDia.length === 0) continue
    // Si hay varias, las concatenamos con " · " (poco común pero soportado)
    result[i] = delDia.map((p) => p.titulo).join(' · ')
  }
  return result
}
