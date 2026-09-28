// GET /api/v1/historial
// Últimas grillas pedidas. Misma puerta que el sidebar: director o sin fila.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { one, tablaFalta, texto, textoOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!auth.member.esCeo) return apiJsonError('Historial es solo para el director', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const res = await service
    .from('grillas_pendientes')
    .select(`
      id, semana_inicio, semana_fin, estado, pedida_at, enviada_at,
      marca:marcas(slug, nombre, emoji_marca)
    `)
    .order('pedida_at', { ascending: false })
    .limit(100)
  if (res.error) {
    if (tablaFalta(res.error.message ?? '')) {
      return NextResponse.json({ ok: true, total: 0, grillas: [] })
    }
    return apiJsonError(res.error.message, 500)
  }

  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grillas = ((res.data ?? []) as any[]).map((row) => {
    const marca = one(row.marca)
    const slug = textoOrNull(marca?.slug)
    return {
      id: String(row.id),
      semana_inicio: textoOrNull(row.semana_inicio),
      semana_fin: textoOrNull(row.semana_fin),
      estado: texto(row.estado, 'pendiente'),
      pedida_at: textoOrNull(row.pedida_at),
      enviada_at: textoOrNull(row.enviada_at),
      marca: marca
        ? { slug: slug ?? '', nombre: texto(marca.nombre, slug ?? 'Marca'), emoji: textoOrNull(marca.emoji_marca) }
        : null,
      link: slug ? `${base}/grilla/${slug}` : `${base}/historial`,
    }
  })

  return NextResponse.json({ ok: true, total: grillas.length, grillas })
}
