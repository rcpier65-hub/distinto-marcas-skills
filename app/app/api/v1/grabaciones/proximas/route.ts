// app/app/api/v1/grabaciones/proximas/route.ts
//
// GET /api/v1/grabaciones/proximas
//   ?marca=<slug>   (opcional)
//   ?limit=<N>      (default 20)
//
// Grabaciones planeadas con fecha_planeada >= hoy, NO completadas.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkApiBearer } from '@/lib/api/auth'
import { formatHora12 } from '@/lib/utils/format-hora'

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
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100)

  const hoy = ymd(new Date())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let q = service
    .from('grabaciones')
    .select(`
      id, fecha_planeada, hora_planeada, estado, notas,
      marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
    `)
    .gte('fecha_planeada', hoy)
    .neq('estado', 'completada')
    .order('fecha_planeada', { ascending: true })
    .order('hora_planeada', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (marca) {
    const { data: m } = await service
      .from('marcas').select('id').eq('slug', marca).maybeSingle()
    if (m?.id) q = q.eq('marca_id', m.id)
  }

  const { data, error } = await q

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grabs = ((data ?? []) as any[]).map((g) => {
    const m = Array.isArray(g.marca) ? g.marca[0] : g.marca
    const horaRaw = g.hora_planeada ? String(g.hora_planeada).slice(0, 5) : null
    return {
      id: g.id,
      fecha: g.fecha_planeada,
      hora_24h: horaRaw,
      hora_12h: horaRaw ? formatHora12(horaRaw) : null,
      estado: g.estado,
      notas: g.notas,
      marca: m ? { slug: m.slug, nombre: m.nombre, color: m.color_primario_hex, emoji: m.emoji_marca } : null,
    }
  })

  return NextResponse.json({
    ok: true,
    total: grabs.length,
    grabaciones: grabs,
  })
}
