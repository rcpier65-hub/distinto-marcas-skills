// app/app/api/v1/publicaciones/mes/route.ts
//
// GET /api/v1/publicaciones/mes
//   ?marca=<slug>     (opcional)
//   ?estado=<estado>  (opcional)
//
// Publicaciones del mes calendar actual. Filtros opcionales.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkApiBearer } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function GET(request: Request) {
  const auth = checkApiBearer(request)
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const marca = url.searchParams.get('marca')
  const estado = url.searchParams.get('estado')

  const hoy = new Date()
  const inicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const fin = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let q = service
    .from('publicaciones')
    .select(`
      id, nombre, fecha_publicacion, estado, plataformas, tipo_contenido,
      editor_nombre, disenador_nombre,
      marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
    `)
    .gte('fecha_publicacion', inicio)
    .lte('fecha_publicacion', fin)
    .order('fecha_publicacion', { ascending: true })

  if (estado) q = q.eq('estado', estado)
  if (marca) {
    const { data: m } = await service
      .from('marcas').select('id').eq('slug', marca).maybeSingle()
    if (m?.id) q = q.eq('marca_id', m.id)
  }

  const { data, error } = await q

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubs = ((data ?? []) as any[]).map((p) => {
    const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
    return {
      id: p.id,
      nombre: p.nombre,
      fecha: p.fecha_publicacion,
      estado: p.estado,
      plataformas: p.plataformas ?? [],
      tipo_contenido: p.tipo_contenido ?? [],
      editor: p.editor_nombre,
      disenador: p.disenador_nombre,
      marca: m ? { slug: m.slug, nombre: m.nombre, color: m.color_primario_hex, emoji: m.emoji_marca } : null,
    }
  })

  return NextResponse.json({
    ok: true,
    mes: { desde: inicio, hasta: fin },
    total: pubs.length,
    publicaciones: pubs,
  })
}
