// GET /api/v1/diseno
// Tablero de diseño (opt-in es_tarea_diseno). Solo lectura; el detalle abre la web.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { one, tablaFalta, texto, textoOrNull, ymdOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { normalizeSubEstado } from '@/lib/diseno/types'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!auth.member.puedeDiseno) return apiJsonError('No tienes acceso a Diseño', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const select = `
    id, nombre, fecha_publicacion, fecha_diseno, estado_tarea, diseno_terminado_at,
    es_tarea_diseno, marca:marcas(slug, nombre, emoji_marca)
  `
  const res = await service
    .from('publicaciones')
    .select(select)
    .eq('es_tarea_diseno', true)
    .order('fecha_diseno', { ascending: true, nullsFirst: false })
    .limit(400)

  if (res.error) {
    const message = res.error.message ?? ''
    if (tablaFalta(message) || /es_tarea_diseno|fecha_diseno|diseno_terminado_at|estado_tarea/i.test(message)) {
      return NextResponse.json({ ok: true, migracion_pendiente: true, total: 0, piezas: [] })
    }
    return apiJsonError(message, 500)
  }

  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const piezas = ((res.data ?? []) as any[]).flatMap((row) => {
    const sub = normalizeSubEstado(typeof row.estado_tarea === 'string' ? row.estado_tarea : null)
    if (
      row.fecha_publicacion &&
      (sub === 'listo' || sub === 'enviado' || sub === 'archivado') &&
      row.diseno_terminado_at
    ) {
      return []
    }
    const marca = one(row.marca)
    return [{
      id: String(row.id),
      nombre: texto(row.nombre, 'Sin título'),
      estado: sub,
      fecha: ymdOrNull(row.fecha_diseno) ?? ymdOrNull(row.fecha_publicacion),
      marca: marca
        ? {
            slug: texto(marca.slug),
            nombre: texto(marca.nombre, texto(marca.slug, 'Marca')),
            emoji: textoOrNull(marca.emoji_marca),
          }
        : null,
      link: `${base}/diseno/${row.id}`,
    }]
  }).slice(0, 180)

  return NextResponse.json({
    ok: true,
    migracion_pendiente: false,
    total: piezas.length,
    piezas,
  })
}
