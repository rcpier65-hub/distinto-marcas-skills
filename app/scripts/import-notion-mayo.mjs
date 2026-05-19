// scripts/import-notion-mayo.mjs
// Importer one-shot: trae todas las publicaciones de Notion para mayo 2026
// y las inserta/actualiza en tabla publicaciones.
//
// Idempotente: corre n veces y no duplica (upsert por notion_original_id).
//
// Uso:
//   NOTION_TOKEN=ntn_xxx node scripts/import-notion-mayo.mjs [--dry-run]
//
// O leyendo desde .env.local:
//   node scripts/import-notion-mayo.mjs

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
const { Client } = pg

// ============================================================
// Config
// ============================================================
const NOTION_DB_ID = 'cf388541-0ddd-8350-acf1-01666ea5208e'
const SEMANA_INICIO = '2026-05-01'
const SEMANA_FIN = '2026-05-31'
const DRY_RUN = process.argv.includes('--dry-run')

// Cargar NOTION_TOKEN de env o .env.local
let NOTION_TOKEN = process.env.NOTION_TOKEN
if (!NOTION_TOKEN) {
  try {
    const envFile = readFileSync(resolve(import.meta.dirname, '..', '.env.local'), 'utf8')
    const match = envFile.match(/^NOTION_TOKEN=(.+)$/m)
    if (match) NOTION_TOKEN = match[1].trim()
  } catch {}
}
if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN no encontrado. Setealo en env o en .env.local')
  process.exit(1)
}

// ============================================================
// Mapping Notion → BD
// ============================================================
const ESTADO_MAP = {
  'Tareas': 'tareas',
  'Idear': 'idear',
  'Editando': 'editando',
  'Editar': 'editar',
  'Diseñar': 'disenar',
  'Enviado': 'enviado',
  'Aprobar': 'aprobar',
  'Programar': 'programar',
  'Programar anuncios': 'programar_anuncios',
  'Archivado': 'archivado',
}

// ============================================================
// Helpers
// ============================================================
function notionFetch(path, body) {
  return fetch(`https://api.notion.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`Notion ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`)
    return r.json()
  })
}

function notionGet(path) {
  return fetch(`https://api.notion.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`Notion ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`)
    return r.json()
  })
}

function readTitle(prop) {
  if (!prop || prop.type !== 'title') return ''
  return prop.title.map((t) => t.plain_text).join('').trim()
}

function readDate(prop) {
  if (!prop || prop.type !== 'date' || !prop.date) return null
  return prop.date.start.slice(0, 10)
}

function readMultiSelect(prop) {
  if (!prop || prop.type !== 'multi_select') return []
  return prop.multi_select.map((o) => o.name)
}

function readStatus(prop) {
  if (!prop || prop.type !== 'status' || !prop.status) return null
  return prop.status.name
}

function readRichText(prop) {
  if (!prop || prop.type !== 'rich_text') return null
  const text = prop.rich_text.map((t) => t.plain_text).join('').trim()
  return text || null
}

function readUrl(prop) {
  if (!prop || prop.type !== 'url') return null
  return prop.url || null
}

// Checkbox-like en Notion se modela como rich_text con __YES__ / __NO__
function readBool(prop) {
  const txt = readRichText(prop)
  if (!txt) return false
  return txt === '__YES__' || txt === 'true' || txt === 'YES'
}

function readPersonName(prop) {
  if (!prop || prop.type !== 'people' || !prop.people?.length) return null
  return prop.people[0]?.name ?? null
}

function readRelation(prop) {
  if (!prop || prop.type !== 'relation') return []
  return prop.relation.map((r) => r.id.replace(/-/g, ''))
}

// Extraer el body como texto plano (paragraphs)
async function fetchPageContent(pageId) {
  try {
    const data = await notionGet(`/blocks/${pageId}/children?page_size=100`)
    const lines = []
    for (const block of data.results || []) {
      if (block.type === 'paragraph') {
        const text = block.paragraph.rich_text.map((t) => t.plain_text).join('')
        if (text.trim()) lines.push(text)
      } else if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
        const text = block[block.type].rich_text.map((t) => t.plain_text).join('')
        if (text.trim()) lines.push(text)
      } else if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
        const text = block[block.type].rich_text.map((t) => t.plain_text).join('')
        if (text.trim()) lines.push('- ' + text)
      }
    }
    return lines.join('\n')
  } catch (e) {
    console.warn(`  ⚠ No pude leer contenido de page ${pageId}: ${e.message}`)
    return null
  }
}

// Separar copy de guion: en las páginas de Manrique vi "COPY:" y "INDICACIONES" como delimitadores
function splitCopyGuion(content) {
  if (!content) return { copy: null, guion: null }
  // Buscar marcadores estándar
  const copyMatch = content.match(/COPY:\s*([\s\S]*?)(?=INDICACIONES|GANCHO|GUION|---|$)/i)
  const guionMatch = content.match(/(INDICACIONES|GANCHO|GUION):?\s*([\s\S]*?)(?=COPY:|---|$)/i)
  if (copyMatch || guionMatch) {
    return {
      copy: copyMatch ? copyMatch[1].trim() : null,
      guion: guionMatch ? guionMatch[2].trim() : null,
    }
  }
  // Si no hay marcadores, guardar todo como copy
  return { copy: content.trim(), guion: null }
}

// ============================================================
// Importer principal
// ============================================================
async function importPublicacionesNotion() {
  console.log(`📥 Importando publicaciones Notion → BD`)
  console.log(`   Rango: ${SEMANA_INICIO} → ${SEMANA_FIN}`)
  console.log(`   Modo: ${DRY_RUN ? '🧪 DRY RUN (no escribe BD)' : '💾 ESCRIBIENDO BD'}`)
  console.log('')

  // 1. Cargar marcas con notion_proyecto_id
  const pg = new Client({
    host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
    user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
    ssl: { rejectUnauthorized: false },
  })
  await pg.connect()

  const marcasResult = await pg.query(
    `SELECT id, slug, nombre, notion_proyecto_id FROM marcas WHERE notion_proyecto_id IS NOT NULL ORDER BY slug`,
  )
  const marcas = marcasResult.rows
  console.log(`Marcas a importar: ${marcas.length}\n`)

  let totalInserted = 0
  let totalUpdated = 0
  let totalSkipped = 0

  for (const marca of marcas) {
    console.log(`━━━ ${marca.slug} (${marca.nombre}) ━━━`)

    // 2. Query Notion paginado
    let cursor = undefined
    let pages = []
    for (let pageNum = 0; pageNum < 10; pageNum++) {
      const body = {
        filter: {
          and: [
            { property: 'proyecto', relation: { contains: marca.notion_proyecto_id } },
            { property: 'Grilla de FIT', date: { on_or_after: SEMANA_INICIO } },
            { property: 'Grilla de FIT', date: { on_or_before: SEMANA_FIN } },
          ],
        },
        sorts: [{ property: 'Grilla de FIT', direction: 'ascending' }],
        page_size: 100,
      }
      if (cursor) body.start_cursor = cursor
      const data = await notionFetch(`/databases/${NOTION_DB_ID}/query`, body)
      pages.push(...data.results)
      if (!data.has_more) break
      cursor = data.next_cursor
    }

    console.log(`  Encontradas ${pages.length} publicaciones en Notion`)

    // 3. Por cada página, mapear + upsert
    for (const page of pages) {
      const props = page.properties
      const nombre = readTitle(props['Nombre de la tarea'])
      if (!nombre) {
        console.log(`  ⚠ Skip: página sin título (${page.id})`)
        totalSkipped++
        continue
      }

      // Fetch contenido del body (lento — un request por página)
      const content = await fetchPageContent(page.id)
      const { copy, guion } = splitCopyGuion(content)

      const estadoNotion = readStatus(props['Estado'])
      const estado = ESTADO_MAP[estadoNotion] || 'tareas'

      const fields = {
        marca_id: marca.id,
        nombre,
        estado,
        fecha_publicacion: readDate(props['Grilla de FIT']),
        fecha_edicion: readDate(props['Fecha de edicion']),
        fecha_diseno: readDate(props['Fecha de diseño ']) || readDate(props['Fecha de diseño']),
        plataformas: readMultiSelect(props['Plataforma']),
        tipo_contenido: readMultiSelect(props['Tipo de contenido']),
        objetivos: readMultiSelect(props['Objetivo']),
        copy,
        guion,
        enlace_tomas: readUrl(props['Enlace de tomas']),
        enlace_musica: readUrl(props['Enlace musica']),
        portada_cruda_url: readRichText(props['PORTADA CRUDA']),
        portada_editada_url: readRichText(props['PORTADA EDITADA']),
        copy_listo: readBool(props['Copy Listo']),
        musica_lista: readBool(props['MÚSICA']),
        portada_lista: readBool(props['Portada lista']),
        disenado: readBool(props['Diseñado✅']) || readBool(props['Diseñado']),
        editado: readBool(props['Editado 😁']) || readBool(props['Editado']),
        video_aprobado: readBool(props['VIDEO APROBADO']),
        editor_nombre: readMultiSelect(props['Editor'])[0] || readPersonName(props['Editor']) || null,
        notion_original_id: page.id.replace(/-/g, ''),
        notion_url: page.url || `https://www.notion.so/${page.id.replace(/-/g, '')}`,
        notas: null,
      }

      if (DRY_RUN) {
        console.log(`  • [DRY] ${fields.fecha_publicacion} | ${nombre.slice(0, 50)} (estado=${estado})`)
        continue
      }

      // Upsert
      const upsertSql = `
        INSERT INTO publicaciones (
          marca_id, nombre, estado, fecha_publicacion, fecha_edicion, fecha_diseno,
          plataformas, tipo_contenido, objetivos,
          copy, guion,
          enlace_tomas, enlace_musica, portada_cruda_url, portada_editada_url,
          copy_listo, musica_lista, portada_lista, disenado, editado, video_aprobado,
          editor_nombre, notion_original_id, notion_url, notas
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25
        )
        ON CONFLICT (notion_original_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          estado = EXCLUDED.estado,
          fecha_publicacion = EXCLUDED.fecha_publicacion,
          fecha_edicion = EXCLUDED.fecha_edicion,
          fecha_diseno = EXCLUDED.fecha_diseno,
          plataformas = EXCLUDED.plataformas,
          tipo_contenido = EXCLUDED.tipo_contenido,
          objetivos = EXCLUDED.objetivos,
          copy = EXCLUDED.copy,
          guion = EXCLUDED.guion,
          enlace_tomas = EXCLUDED.enlace_tomas,
          enlace_musica = EXCLUDED.enlace_musica,
          portada_cruda_url = EXCLUDED.portada_cruda_url,
          portada_editada_url = EXCLUDED.portada_editada_url,
          copy_listo = EXCLUDED.copy_listo,
          musica_lista = EXCLUDED.musica_lista,
          portada_lista = EXCLUDED.portada_lista,
          disenado = EXCLUDED.disenado,
          editado = EXCLUDED.editado,
          video_aprobado = EXCLUDED.video_aprobado,
          editor_nombre = EXCLUDED.editor_nombre,
          notion_url = EXCLUDED.notion_url,
          updated_at = now()
        RETURNING (xmax = 0) AS inserted
      `

      const params = [
        fields.marca_id, fields.nombre, fields.estado,
        fields.fecha_publicacion, fields.fecha_edicion, fields.fecha_diseno,
        fields.plataformas, fields.tipo_contenido, fields.objetivos,
        fields.copy, fields.guion,
        fields.enlace_tomas, fields.enlace_musica, fields.portada_cruda_url, fields.portada_editada_url,
        fields.copy_listo, fields.musica_lista, fields.portada_lista, fields.disenado, fields.editado, fields.video_aprobado,
        fields.editor_nombre, fields.notion_original_id, fields.notion_url, fields.notas,
      ]

      try {
        const r = await pg.query(upsertSql, params)
        const wasInserted = r.rows[0]?.inserted
        if (wasInserted) totalInserted++
        else totalUpdated++
        console.log(`  ✓ ${wasInserted ? 'NEW' : 'UPD'} ${fields.fecha_publicacion} | ${nombre.slice(0, 50)} (${estado})`)
      } catch (e) {
        console.log(`  ❌ Error upsert ${nombre.slice(0, 30)}: ${e.message}`)
        totalSkipped++
      }
    }
  }

  console.log('')
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Importadas: ${totalInserted} nuevas + ${totalUpdated} actualizadas`)
  console.log(`   Skipped:  ${totalSkipped}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  await pg.end()
}

importPublicacionesNotion().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
