// app/app/api/v1/admin/sync-publicaciones-all/route.ts
//
// POST /api/v1/admin/sync-publicaciones-all
//
// Sincroniza TODAS las marcas activas con notion_proyecto_id.
// Cada marca trae properties + copy + guion de Notion.
//
// Body opcional: { from, to } — default mayo + junio 2026.
//
// Marcas sin notion_proyecto_id (ej. warrior-supps) se marcan como
// "skipped" — NO failed.
//
// Auth: Bearer CRON_SECRET. Llamado por el botón "Sincronizar todo
// con Notion" via server action sincronizarTodoNotion().

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncMarcaPublicaciones, type SyncResult } from '@/lib/publicaciones/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // hasta 5 min

type MarcaResult =
  | ({ slug: string; status: 'ok' } & SyncResult)
  | { slug: string; status: 'skipped'; reason: string }
  | { slug: string; status: 'error'; error: string }

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let from = '2026-05-01'
  let to = '2026-06-30'
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

  const { data: marcas, error } = await service
    .from('marcas')
    .select('id, slug, notion_proyecto_id, activa')
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

  // Sync marcas en paralelo. Dentro de cada marca, fetchPageContent
  // ya tiene concurrency 5 — así que el total concurrent en peor caso
  // es 7 marcas × 5 fetches = 35 requests simultáneas a Notion.
  // Eso está dentro del rate limit típico (peaks de 27 req/seg, burst).
  const results = await Promise.all(
    conProyecto.map(
      (m): Promise<MarcaResult> =>
        syncMarcaPublicaciones({
          service,
          marca: { id: m.id, notion_proyecto_id: m.notion_proyecto_id },
          from,
          to,
        })
          .then((r): MarcaResult => ({ slug: m.slug, status: 'ok', ...r }))
          .catch(
            (e): MarcaResult => ({
              slug: m.slug,
              status: 'error',
              error: e instanceof Error ? e.message : 'unknown',
            }),
          ),
    ),
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

  /* Construir mensaje de error legible cuando hay marcas que fallaron.
     Antes el endpoint devolvía `{ ok: false }` sin field `error` y el
     cliente caía al fallback "HTTP 200" porque res.status era 200 pero
     json.ok era false. Ahora damos un texto humano con qué marcas
     fallaron y por qué — el cliente ya hace `json.error ?? "HTTP ..."`,
     así que con esto desaparece el "HTTP 200" del toast. */
  const erroredMarcas = allResults.filter((r) => r.status === 'error') as Array<
    Extract<MarcaResult, { status: 'error' }>
  >
  const errorMsg =
    erroredMarcas.length > 0
      ? `${erroredMarcas.length} marca${erroredMarcas.length === 1 ? '' : 's'} falló: ${erroredMarcas
          .map((r) => `${r.slug} (${r.error.slice(0, 80)})`)
          .join(', ')}`
      : undefined

  return NextResponse.json({
    ok: totals.errored === 0,
    duration_ms: Date.now() - startedAt,
    rango: { from, to },
    totals,
    por_marca: allResults,
    ...(errorMsg ? { error: errorMsg } : {}),
  })
}
