// app/app/api/v1/admin/debug-page-content/[notion_id]/route.ts
//
// GET /api/v1/admin/debug-page-content/[notion_id]
//
// Debug endpoint que llama fetchPageContent para UNA página y
// devuelve {copy, guion} + el listado crudo de blocks (top-level
// + types) para que veamos qué está pasando con el parsing.
//
// Auth: Bearer CRON_SECRET.

import { NextResponse } from 'next/server'
import { fetchPageContent } from '@/lib/integrations/notion'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

type RawBlock = {
  id: string
  type: string
  has_children?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notion_id: string }> },
) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { notion_id } = await params
  const pageId = notion_id.replace(/-/g, '')

  // 1. Llamamos a la función pública
  const extracted = await fetchPageContent(pageId)

  // 2. También traemos los blocks top-level crudos para inspección
  const token = process.env.NOTION_TOKEN
  let rawBlocks: Array<{ type: string; plain_text_sample: string; has_children: boolean }> = []
  if (token) {
    try {
      const url = new URL(`${NOTION_API}/blocks/${pageId}/children`)
      url.searchParams.set('page_size', '50')
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
        },
        cache: 'no-store',
      })
      if (res.ok) {
        const json = (await res.json()) as { results: RawBlock[] }
        rawBlocks = json.results.map((b) => {
          // Intentar extraer plain text del tipo común
          const candidates: string[] = []
          const props = [
            'paragraph',
            'heading_1',
            'heading_2',
            'heading_3',
            'bulleted_list_item',
            'numbered_list_item',
            'quote',
            'callout',
          ]
          for (const p of props) {
            const v = b[p]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (v?.rich_text) {
              candidates.push(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                v.rich_text.map((x: any) => x.plain_text).join(''),
              )
            }
          }
          return {
            type: b.type,
            plain_text_sample: candidates.join(' | ').slice(0, 120),
            has_children: !!b.has_children,
          }
        })
      }
    } catch {
      // ignore
    }
  }

  // 3. Consultar BD para ver QUÉ tiene esa pub guardado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: dbRow, error: dbErr } = await service
    .from('publicaciones')
    .select(
      'id, nombre, copy, guion, editor_nombre, fecha_publicacion, fecha_edicion, enlace_tomas, enlace_musica, plataformas, tipo_contenido, objetivos, estado, notion_original_id, updated_at',
    )
    .eq('notion_original_id', pageId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    page_id: pageId,
    extracted_from_notion: extracted,
    db_row: dbRow,
    db_error: dbErr?.message ?? null,
    raw_blocks_count: rawBlocks.length,
    raw_blocks: rawBlocks,
  })
}
