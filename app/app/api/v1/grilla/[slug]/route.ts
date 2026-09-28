// GET /api/v1/grilla/:slug?vista=semana|mes
// Resumen de publicaciones de la semana (lun–dom, Lima) o del mes.
// Misma puerta que /grilla/[slug]: módulo grilla + marcas_acceso.
// Editar la grilla sigue en la web.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { addDaysYmd, appBase, monthBoundsLima, ymdLima } from '@/lib/api/lima'
import { stringList, texto, textoOrNull, ymdOrNull } from '@/lib/api/mac-json'
import { apiJsonError, denyMarcaAcceso, requireSessionMember } from '@/lib/api/session-member'
import { colorDeMarca } from '@/lib/marcas/branding'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

function weekBounds(hoy: string): { desde: string; hasta: string } {
  const day = new Date(`${hoy}T12:00:00Z`).getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const desde = addDaysYmd(hoy, diff)
  return { desde, hasta: addDaysYmd(desde, 6) }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  if (!member.puedeGrilla) return apiJsonError('No tienes acceso a la grilla', 403)

  const { slug } = await params
  const vista = new URL(request.url).searchParams.get('vista') === 'mes' ? 'mes' : 'semana'
  const hoy = ymdLima()
  const rango = vista === 'mes' ? monthBoundsLima(hoy) : weekBounds(hoy)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const marcaRes = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, activa')
    .eq('slug', slug)
    .maybeSingle()
  if (marcaRes.error) return apiJsonError(marcaRes.error.message, 500)
  if (!marcaRes.data) return apiJsonError('Marca no encontrada', 404)

  const marca = marcaRes.data
  const denied = denyMarcaAcceso(member, String(marca.id))
  if (denied) return denied

  const pubsRes = await service
    .from('publicaciones')
    .select('id, nombre, fecha_publicacion, plataformas, tipo_contenido, estado')
    .eq('marca_id', marca.id)
    .gte('fecha_publicacion', rango.desde)
    .lte('fecha_publicacion', rango.hasta)
    .order('fecha_publicacion', { ascending: true })
    .limit(200)
  if (pubsRes.error) return apiJsonError(pubsRes.error.message, 500)

  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const piezas = ((pubsRes.data ?? []) as any[]).flatMap((row) => {
    const fecha = ymdOrNull(row.fecha_publicacion)
    if (!fecha) return []
    return [{
      id: String(row.id),
      titulo: texto(row.nombre, 'Sin título'),
      fecha,
      estado: textoOrNull(row.estado),
      plataformas: stringList(row.plataformas),
      tipos: stringList(row.tipo_contenido),
      link: `${base}/publicaciones/${row.id}`,
    }]
  })

  return NextResponse.json({
    ok: true,
    vista,
    desde: rango.desde,
    hasta: rango.hasta,
    hoy,
    total: piezas.length,
    marca: {
      slug: texto(marca.slug),
      nombre: texto(marca.nombre),
      emoji: textoOrNull(marca.emoji_marca),
      color: colorDeMarca(marca.slug, marca.color_primario_hex),
      activa: marca.activa !== false,
    },
    piezas,
    link: `${base}/grilla/${encodeURIComponent(texto(marca.slug))}`,
  })
}
