// app/app/api/admin/reclasificar/[slug]/route.ts
//
// POST /api/admin/reclasificar/[slug]
//
// Re-clasifica los comentarios pendientes de una marca con la versión
// actual del clasificador heurístico. Útil cuando se mejoran las reglas
// y queremos re-procesar los pendientes existentes.
//
// Body (opcional):
//   {
//     "reset_sugerencia": true   // pone respuesta_sugerida=NULL y sugerencia_at=NULL
//                                // → la próxima Routine los regenera fresh.
//                                // Default: false (solo re-clasifica categoria).
//   }
//
// Auth: Bearer <CRON_SECRET>.
//
// Respuesta:
//   {
//     ok: true,
//     marca: "distribuidora-fitness",
//     total_pending: 7,
//     reclasificados: [
//       { id, texto, antes: "otro", ahora: "humor" },
//       ...
//     ],
//     stats: { otro: 0, humor: 4, queja: 2, testimonial: 1, ... }
//   }
//
// Pensado como herramienta de admin/maintenance, NO para uso diario.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { clasificarComentario } from '@/lib/comentarios/clasificador'
import type { ComentarioCategoria } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const { slug } = await params

  // Parse body (opcional)
  let resetSugerencia = false
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && 'reset_sugerencia' in body) {
      resetSugerencia = body.reset_sugerencia === true
    }
  } catch {
    // body vacío es OK
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Resolver marca_id
  const { data: marca } = await service
    .from('marcas')
    .select('id, nombre')
    .eq('slug', slug)
    .maybeSingle()
  if (!marca) {
    return NextResponse.json({ ok: false, error: `marca '${slug}' no existe` }, { status: 404 })
  }

  // 2. Pull todos los pending de esta marca
  const { data: rows, error: selErr } = await service
    .from('comentarios_inbox')
    .select('id, comment_text, categoria_sugerida')
    .eq('marca_id', marca.id)
    .eq('status', 'pending')
  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 })
  }

  const total = rows?.length ?? 0

  // 3. Re-clasificar uno por uno
  const cambios: Array<{
    id: string
    texto: string
    antes: ComentarioCategoria
    ahora: ComentarioCategoria
  }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: Record<string, number> = {}

  for (const r of rows ?? []) {
    const nuevaCat = clasificarComentario(r.comment_text ?? '')
    stats[nuevaCat] = (stats[nuevaCat] ?? 0) + 1

    const cambia = nuevaCat !== r.categoria_sugerida
    if (!cambia && !resetSugerencia) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { categoria_sugerida: nuevaCat }
    if (resetSugerencia) {
      patch.respuesta_sugerida = null
      patch.sugerencia_at = null
      patch.sugerencia_fuente = null
    }

    const { error: updErr } = await service
      .from('comentarios_inbox')
      .update(patch)
      .eq('id', r.id)

    if (updErr) {
      // Logger error pero seguimos con los demás
      console.error(`reclasificar ${r.id} failed:`, updErr.message)
      continue
    }

    if (cambia) {
      cambios.push({
        id: r.id,
        texto: (r.comment_text ?? '').slice(0, 80),
        antes: r.categoria_sugerida as ComentarioCategoria,
        ahora: nuevaCat,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    marca: slug,
    marca_nombre: marca.nombre,
    total_pending: total,
    reclasificados: cambios.length,
    reset_sugerencia: resetSugerencia,
    stats,
    cambios,
  })
}
