// app/app/api/v1/comentarios/sugerencia/route.ts
//
// POST /api/v1/comentarios/sugerencia
//
// Recibe una sugerencia generada por IA (Routine externa) y la upsertea
// en comentarios_inbox. NO postea automáticamente — solo guarda. Pedro
// revisa en /comentarios y aprueba/edita/rechaza.
//
// Body (JSON):
//   {
//     "comentario_id": "uuid",          // ID en comentarios_inbox
//     "respuesta_sugerida": "texto…",   // la respuesta generada
//     "categoria_sugerida": "pregunta_info" | "testimonial" | ...,
//     "fuente": "claude-routine" | "manual" | "cowork" (opcional, default 'claude-routine'),
//     "metadata": { ... } (opcional, JSON libre para tracking)
//   }
//
// También soporta batch (más eficiente para Routine que procesa N comentarios):
//   { "items": [{...}, {...}] }
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { ComentarioCategoria } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CATEGORIAS_VALIDAS: ComentarioCategoria[] = [
  'pregunta_info', 'testimonial', 'empatia', 'derivar', 'reaccion', 'otro',
]

type ItemInput = {
  comentario_id: string
  respuesta_sugerida: string
  categoria_sugerida?: ComentarioCategoria
  fuente?: string
  metadata?: Record<string, unknown>
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 })
}

export async function POST(request: Request) {
  // ----- Auth -----
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  // ----- Parse body -----
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('JSON inválido')
  }
  if (!body || typeof body !== 'object') return badRequest('Body vacío')

  // Soporta single item OR batch
  const items: ItemInput[] = (() => {
    const b = body as Record<string, unknown>
    if (Array.isArray(b.items)) return b.items as ItemInput[]
    return [b as ItemInput]
  })()

  if (items.length === 0) return badRequest('Sin items')
  if (items.length > 100) return badRequest('Max 100 items por request')

  // ----- Validar cada item -----
  for (const it of items) {
    if (!it.comentario_id || typeof it.comentario_id !== 'string') {
      return badRequest('comentario_id requerido (string)')
    }
    if (typeof it.respuesta_sugerida !== 'string') {
      return badRequest(`respuesta_sugerida debe ser string (comentario_id=${it.comentario_id})`)
    }
    if (it.respuesta_sugerida.length > 1000) {
      return badRequest(`respuesta_sugerida >1000 chars (comentario_id=${it.comentario_id})`)
    }
    if (it.categoria_sugerida && !CATEGORIAS_VALIDAS.includes(it.categoria_sugerida)) {
      return badRequest(`categoria_sugerida inválida: ${it.categoria_sugerida}`)
    }
  }

  // ----- Update (uno por uno — Supabase no permite batch update con valores distintos) -----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const results: Array<{ id: string; ok: boolean; error?: string }> = []
  for (const it of items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = {
      respuesta_sugerida: it.respuesta_sugerida,
      sugerencia_at: new Date().toISOString(),
      sugerencia_fuente: it.fuente ?? 'claude-routine',
    }
    if (it.categoria_sugerida) patch.categoria_sugerida = it.categoria_sugerida
    if (it.metadata) patch.sugerencia_metadata = it.metadata

    const { error } = await service
      .from('comentarios_inbox')
      .update(patch)
      .eq('id', it.comentario_id)
      .eq('status', 'pending')   /* sólo si todavía está pending, no sobreescribir aprobados */
    if (error) {
      results.push({ id: it.comentario_id, ok: false, error: error.message })
    } else {
      results.push({ id: it.comentario_id, ok: true })
    }
  }

  const okCount = results.filter((r) => r.ok).length
  const errorCount = results.length - okCount

  return NextResponse.json({
    ok: errorCount === 0,
    total: results.length,
    updated: okCount,
    errors: errorCount,
    results,
  })
}
