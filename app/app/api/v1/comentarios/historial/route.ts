// app/app/api/v1/comentarios/historial/route.ts
//
// GET /api/v1/comentarios/historial?marca=<slug>&limit=10
//
// Devuelve las últimas N respuestas YA aprobadas/posteadas de una marca.
// Pensado para que la Routine las use como FEW-SHOT EXAMPLES antes de
// redactar respuestas nuevas — así calca el estilo real de Pedro en vez
// de inventar uno genérico.
//
// Esto fue el aprendizaje #1 del ejercicio de iteración del prompt:
// "los borradores son 95%+ correctos cuando el modelo ve tus respuestas
// pasadas" (Pedro dixit: "los comentarios anteriores se han respondido
// así, bacán"). Sin few-shot el accuracy cae a 67%, con few-shot debería
// subir cerca de 95%.
//
// Devuelve solo pares (comentario_original, respuesta_final) — sin
// metadata pesada, optimizado para meter directo en el prompt.
//
// Query params:
//   - marca=<slug>           REQUERIDO (no devolvemos cross-marca para
//                            no contaminar voces entre marcas distintas)
//   - limit=<N>              max 20, default 10
//   - categoria=<cat>        opcional, filtrar por categoria_sugerida
//                            (pregunta_info, testimonial, queja, etc.)
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function GET(request: Request) {
  // ----- Auth -----
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const url = new URL(request.url)
  const marcaSlug = url.searchParams.get('marca')
  const categoria = url.searchParams.get('categoria')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '10'), 20)

  if (!marcaSlug) {
    return NextResponse.json(
      { ok: false, error: 'param marca (slug) requerido' },
      { status: 400 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // ----- 1. Resolver marca_id desde slug -----
  const { data: marca, error: errM } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca')
    .eq('slug', marcaSlug)
    .maybeSingle()

  if (errM) return NextResponse.json({ ok: false, error: errM.message }, { status: 500 })
  if (!marca) {
    return NextResponse.json({ ok: false, error: `marca '${marcaSlug}' no existe` }, { status: 404 })
  }

  // ----- 2. Pull rows con respuesta final ya aprobada -----
  // Prioridad de status (qué cuenta como "respuesta canon"):
  //   sent     → respuesta posteada a Metricool con éxito
  //   approved → Pedro aprobó pero aún no se posteó (todavía cuenta como
  //              canon porque refleja su decisión)
  // Excluimos: pending, rejected.
  //
  // Prioridad de campo de respuesta:
  //   respuesta_editada (si Pedro modificó la sugerencia) — más fiel
  //   respuesta_sugerida (si aprobó sin editar)
  let q = service
    .from('comentarios_inbox')
    .select(`
      id,
      comment_text,
      categoria_sugerida,
      respuesta_sugerida,
      respuesta_editada,
      status,
      approved_at,
      sent_at,
      comment_created_at
    `)
    .eq('marca_id', marca.id)
    .in('status', ['sent', 'approved'])
    .or('respuesta_editada.not.is.null,respuesta_sugerida.not.is.null')
    .order('approved_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (categoria) q = q.eq('categoria_sugerida', categoria)

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // ----- 3. Shape final: pares limpios optimizado para few-shot -----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ejemplos = (data ?? []).map((r: any) => ({
    comentario: r.comment_text,
    categoria: r.categoria_sugerida,
    // respuesta_editada manda sobre respuesta_sugerida (más fiel a Pedro)
    respuesta: r.respuesta_editada || r.respuesta_sugerida,
    // contexto opcional pero útil para el modelo
    cuando_se_aprobo: r.approved_at,
  })).filter((e: { respuesta: string | null }) => e.respuesta) // por si la `or` devolvió rows sin respuesta

  return NextResponse.json({
    ok: true,
    marca: { slug: marca.slug, nombre: marca.nombre, emoji: marca.emoji_marca },
    count: ejemplos.length,
    filtros: { categoria, limit },
    ejemplos,
    nota: ejemplos.length === 0
      ? 'No hay ejemplos aprobados todavía para esta marca. La Routine debe operar con guardrails extra y derivar a DM en lugar de afirmar datos.'
      : null,
  })
}
