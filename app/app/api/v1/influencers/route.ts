// GET /api/v1/influencers?marca=slug
// Pedidos de influencers de las marcas con el módulo activo.
// Misma puerta que la página: módulo publicaciones + marcas_acceso.
// Incluye teléfono y productos. No incluye tokens.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { stringList, texto, textoOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { influencersActivoDe, leerInfluencersDb } from '@/lib/influencers/db'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

const ESTADO: Record<string, string> = {
  pedido_enviado: 'Pedido enviado',
  pedido_entregado: 'Pedido entregado',
  video_enviado: 'Video enviado',
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!auth.member.puedePublicaciones) return apiJsonError('No tienes acceso a Influencers', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let res = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, influencers_activo')
    .eq('activa', true)
    .order('nombre')
  if (res.error && /influencers_activo/i.test(res.error.message ?? '')) {
    res = await service.from('marcas').select('id, slug, nombre, emoji_marca').eq('activa', true).order('nombre')
  }
  if (res.error) return apiJsonError(res.error.message, 500)

  const acceso = auth.member.marcasAcceso
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visibles = ((res.data ?? []) as any[])
    .filter((marca) => !acceso || acceso.includes(marca.id))
    .map((marca) => ({
      id: String(marca.id),
      slug: texto(marca.slug),
      nombre: texto(marca.nombre),
      emoji: textoOrNull(marca.emoji_marca),
      activo: influencersActivoDe(texto(marca.slug), marca.influencers_activo),
    }))
    .filter((marca) => marca.activo)

  const pedido = new URL(request.url).searchParams.get('marca')
  const marcaSel = visibles.find((marca) => marca.slug === pedido) ?? visibles[0] ?? null
  const base = appBase()

  if (!marcaSel) {
    return NextResponse.json({
      ok: true,
      marcas: visibles.map(sinId),
      marca: null,
      total: 0,
      pedidos: [],
    })
  }

  let filas: Awaited<ReturnType<typeof leerInfluencersDb>> = []
  try {
    filas = await leerInfluencersDb(marcaSel.slug)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer influencers'
    return apiJsonError(message, 500)
  }

  return NextResponse.json({
    ok: true,
    marcas: visibles.map(sinId),
    marca: sinId(marcaSel),
    total: filas.length,
    pedidos: filas.map((fila) => ({
      id: fila.id,
      usuario_ig: fila.usuario_ig,
      nombre: fila.nombre,
      estado: fila.estado,
      estado_label: ESTADO[fila.estado] ?? fila.estado,
      telefono: fila.telefono,
      productos: stringList(fila.productos_enviados),
      video_url: fila.video_url,
      notas: fila.notas,
      link: `${base}/influencers?marca=${encodeURIComponent(marcaSel.slug)}`,
    })),
  })
}

function sinId(marca: { slug: string; nombre: string; emoji: string | null; activo: boolean }) {
  return { slug: marca.slug, nombre: marca.nombre, emoji: marca.emoji, activo: marca.activo }
}
