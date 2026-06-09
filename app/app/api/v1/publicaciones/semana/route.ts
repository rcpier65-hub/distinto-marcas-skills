// app/app/api/v1/publicaciones/semana/route.ts
//
// GET /api/v1/publicaciones/semana
//   ?marca=<slug>   (opcional)
//
// Publicaciones de la semana actual (lunes a domingo, Lima TZ).
// Usado por el MCP para que Claude vea el plan semanal.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkApiBearer } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const TZ = 'America/Lima'

function ymd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

export async function GET(request: Request) {
  const auth = checkApiBearer(request)
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const marca = url.searchParams.get('marca')

  /* Semana actual lunes→domingo en Lima */
  const hoy = new Date()
  const dayDiff = (hoy.getDay() + 6) % 7  // 0=lunes
  const inicio = new Date(hoy)
  inicio.setDate(inicio.getDate() - dayDiff)
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 6)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let q = service
    .from('publicaciones')
    .select(`
      id, nombre, fecha_publicacion, estado, plataformas, tipo_contenido,
      editor_nombre, disenador_nombre,
      marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
    `)
    .gte('fecha_publicacion', ymd(inicio))
    .lte('fecha_publicacion', ymd(fin))
    .order('fecha_publicacion', { ascending: true })

  if (marca) {
    /* Filtrar via marca.slug — primero resolvemos id */
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
    semana: { desde: ymd(inicio), hasta: ymd(fin) },
    total: pubs.length,
    publicaciones: pubs,
  })
}
