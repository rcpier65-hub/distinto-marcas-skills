// GET /api/v1/historias
// Planificador de historias. Misma puerta que la página: diseño, publicaciones,
// director, admin, o sin fila de equipo. Solo lectura.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase, ymdLima } from '@/lib/api/lima'
import { stringList, tablaFalta, texto, textoOrNull, ymdOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { colorDeMarca } from '@/lib/marcas/branding'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!auth.member.puedeHistorias) return apiJsonError('No tienes acceso a Historias', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const [marcasRes, histRes] = await Promise.all([
    service.from('marcas').select('id, slug, nombre, emoji_marca, color_primario_hex').eq('activa', true),
    service
      .from('historias')
      .select('id, marca_id, titulo, fecha, hora, plataformas, estado, nota')
      .neq('estado', 'cancelada')
      .order('fecha', { ascending: true })
      .limit(250),
  ])

  const histError = histRes.error?.message ?? ''
  if (histRes.error && !tablaFalta(histError)) return apiJsonError(histError, 500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcaById = new Map<string, any>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const marca of (marcasRes.data ?? []) as any[]) {
    marcaById.set(String(marca.id), marca)
  }

  const acceso = auth.member.marcasAcceso
  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historias = tablaFalta(histError) ? [] : ((histRes.data ?? []) as any[]).flatMap((row) => {
    const marcaId = typeof row.marca_id === 'string' ? row.marca_id : ''
    if (acceso && !acceso.includes(marcaId)) return []
    const marca = marcaById.get(marcaId)
    const hora = typeof row.hora === 'string' && row.hora.length >= 4 ? row.hora.slice(0, 5) : null
    return [{
      id: String(row.id),
      titulo: texto(row.titulo, 'Historia'),
      fecha: ymdOrNull(row.fecha),
      hora,
      estado: texto(row.estado, 'planificada'),
      plataformas: stringList(row.plataformas),
      nota: textoOrNull(row.nota),
      marca: marca
        ? {
            slug: texto(marca.slug),
            nombre: texto(marca.nombre),
            emoji: textoOrNull(marca.emoji_marca),
            color: colorDeMarca(marca.slug, marca.color_primario_hex),
          }
        : null,
      link: `${base}/historias`,
    }]
  })

  return NextResponse.json({
    ok: true,
    hoy: ymdLima(),
    migracion_pendiente: tablaFalta(histError),
    total: historias.length,
    historias,
  })
}
