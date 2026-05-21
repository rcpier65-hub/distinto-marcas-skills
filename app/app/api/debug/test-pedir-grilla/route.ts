// app/app/api/debug/test-pedir-grilla/route.ts
// ENDPOINT DEBUG — ejecuta el flow completo de pedirGrilla y devuelve JSON con
// el detalle de cada paso. Sirve para diagnosticar qué exactamente falla en
// producción cuando el usuario hace click "Pedir grilla".
//
// Uso:
//   GET /api/debug/test-pedir-grilla?slug=manrique
//   Header: Authorization: Bearer $CRON_SECRET
//
// Devuelve JSON con estado de cada paso (BD, Notion, render, upload, finalUpdate).

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queryGrillaForBrand } from '@/lib/integrations/notion'
import { generateGrillaPNG } from '@/lib/grilla/generate-png'
import { uploadGrillaPNG } from '@/lib/grilla/upload-png'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Step = { name: string; ok: boolean; ms: number; detail: unknown }

function recordStep(steps: Step[], name: string, start: number, result: unknown): void {
  steps.push({
    name,
    ok: !(result && typeof result === 'object' && 'error' in result),
    ms: Date.now() - start,
    detail: result,
  })
}

// IMPORTANTE: este endpoint es DEBUG TEMPORAL — sin auth para facilitar diagnóstico.
// Borrar después de resolver el bug. Acepta query param ?secret=DEBUG_KEY como
// barrera ligera (no security, solo evita hits accidentales de bots).
const DEBUG_KEY = 'distinto-debug-2026'

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('secret') !== DEBUG_KEY) {
    return new NextResponse('Pass ?secret=' + DEBUG_KEY + ' to access debug', { status: 401 })
  }

  const slug = url.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Missing ?slug param' }, { status: 400 })
  }

  const steps: Step[] = []
  const t0 = Date.now()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Lee marca
  const t1 = Date.now()
  const { data: marca, error: marcaErr } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, notion_proyecto_id, logo_url')
    .eq('slug', slug)
    .eq('activa', true)
    .single()

  if (marcaErr || !marca) {
    recordStep(steps, '1-fetch-marca', t1, { error: marcaErr?.message ?? 'not found' })
    return NextResponse.json({ ok: false, steps, totalMs: Date.now() - t0 })
  }
  recordStep(steps, '1-fetch-marca', t1, {
    nombre: marca.nombre,
    logo_url: marca.logo_url ?? null,
    notion_proyecto_id: marca.notion_proyecto_id,
  })

  // 2. Semana
  const now = new Date()
  const dow = now.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const semana_inicio = monday.toISOString().slice(0, 10)
  const semana_fin = sunday.toISOString().slice(0, 10)

  // 3. Notion
  const t3 = Date.now()
  let publicaciones: Awaited<ReturnType<typeof queryGrillaForBrand>> = []
  let notionError: string | null = null
  try {
    if (!marca.notion_proyecto_id) {
      notionError = 'marca sin notion_proyecto_id'
    } else if (!process.env.NOTION_TOKEN) {
      notionError = 'NOTION_TOKEN no configurado en runtime'
    } else {
      publicaciones = await queryGrillaForBrand({
        notionProyectoId: marca.notion_proyecto_id,
        semanaInicio: semana_inicio,
        semanaFin: semana_fin,
      })
    }
  } catch (e) {
    notionError = (e as Error).message
  }
  recordStep(steps, '2-notion-query', t3, {
    semana: `${semana_inicio} → ${semana_fin}`,
    count: publicaciones.length,
    titulos: publicaciones.map((p) => p.titulo).slice(0, 5),
    error: notionError,
  })

  // 4. Render PNG (endpoint /api/render-grilla)
  const t4 = Date.now()
  let pngBuffer: Buffer | null = null
  let renderError: string | null = null
  try {
    pngBuffer = await generateGrillaPNG({
      marca: {
        slug: marca.slug,
        nombre: marca.nombre,
        emoji: marca.emoji_marca ?? '📊',
        color: marca.color_primario_hex ?? '#283B6F',
        logo_url: marca.logo_url,
      },
      semanaInicio: semana_inicio,
      semanaFin: semana_fin,
      publicaciones,
    })
  } catch (e) {
    renderError = (e as Error).message
  }
  recordStep(steps, '3-render-png', t4, {
    pngBytes: pngBuffer?.length ?? 0,
    error: renderError,
  })

  if (!pngBuffer) {
    return NextResponse.json({ ok: false, steps, totalMs: Date.now() - t0 })
  }

  // 5. Upload a Supabase Storage
  const t5 = Date.now()
  const upload = await uploadGrillaPNG(pngBuffer, slug, semana_inicio)
  recordStep(steps, '4-upload-storage', t5, upload)

  return NextResponse.json({
    ok: 'ok' in upload && upload.ok,
    steps,
    totalMs: Date.now() - t0,
    publicacionesEncontradas: publicaciones.length,
    pngBytes: pngBuffer.length,
    finalUrl: 'ok' in upload && upload.ok ? upload.url : null,
  })
}
