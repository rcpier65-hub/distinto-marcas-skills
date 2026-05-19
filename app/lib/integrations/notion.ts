// app/lib/integrations/notion.ts
// Cliente Notion HTTP usando fetch nativo (sin SDK).
// Razón: el SDK @notionhq/client pesa ~150KB y trae axios; Node 22 ya tiene fetch global.
//
// Usa la API REST de Notion v1: https://developers.notion.com/reference/post-database-query
// Requiere env vars:
//   NOTION_TOKEN          — Internal integration secret (secret_xxx)
//   NOTION_GRILLA_DB_ID   — UUID de la base de datos "📅 GRILLA DE CONTENIDO"
//                           (sin dashes: 116885410ddd83d38e56873a2ca08fb9
//                            o con dashes: 11688541-0ddd-83d3-8e56-873a2ca08fb9)

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
type NotionUnknownProp = { type: string; [k: string]: unknown }

type NotionProperty =
  | NotionTitleProp
  | NotionDateProp
  | NotionMultiSelectProp
  | NotionStatusProp
  | NotionRelationProp
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
