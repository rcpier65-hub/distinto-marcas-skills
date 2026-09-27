// GET /api/v1/perfil
//
// Sesión del Mac: nombre, email y rol. No edita el perfil.
// Auth: Bearer JWT o dst_live_ con alcance owner (actúa como esa sesión).

import { NextResponse } from 'next/server'
import { requireSessionMember, type SessionMember } from '@/lib/api/session-member'
import { colorDeMarca } from '@/lib/marcas/branding'
import { influencersActivoDe } from '@/lib/influencers/db'
import { createServiceClient } from '@/lib/supabase/service'
import { texto, textoOrNull } from '@/lib/api/mac-json'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  const nav = await marcasNav(member)

  return NextResponse.json({
    ok: true,
    perfil: {
      user_id: member.userId,
      email: member.email,
      nombre: member.nombre,
      rol: member.rol,
      rol_base: member.rolBase,
      cargo: member.cargo,
      es_equipo: member.esEquipo,
      activo: true,
      es_director: member.esDirector,
      modulos: {
        publicaciones: member.puedePublicaciones,
        editor: member.puedeEditor,
        diseno: member.puedeDiseno,
        historias: member.puedeHistorias,
        metricas: member.puedeMetricas,
        marcas: member.puedeMarcas,
        grilla: member.puedeGrilla,
        equipo: member.puedeEquipo,
        settings: member.puedeSettings,
        es_pedro: member.esPedro,
        es_ceo: member.esCeo,
        puede_gestionar_marcas: member.puedeGestionarMarcas,
        influencers: member.puedePublicaciones && nav.some((marca) => marca.influencers_activo),
      },
      marcas_nav: nav.map((marca) => ({
        slug: marca.slug,
        nombre: marca.nombre,
        nombre_corto: marca.nombre,
        emoji: marca.emoji,
        color: marca.color,
        influencers_activo: marca.influencers_activo,
      })),
    },
  })
}

async function marcasNav(member: SessionMember): Promise<{
  slug: string
  nombre: string
  emoji: string | null
  color: string
  influencers_activo: boolean
}[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    let res = await service
      .from('marcas')
      .select('id, slug, nombre, emoji_marca, color_primario_hex, influencers_activo')
      .eq('activa', true)
      .order('nombre')
    if (res.error && /influencers_activo/i.test(res.error.message ?? '')) {
      res = await service
        .from('marcas')
        .select('id, slug, nombre, emoji_marca, color_primario_hex')
        .eq('activa', true)
        .order('nombre')
    }
    if (res.error) return []
    const acceso = member.marcasAcceso
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((res.data ?? []) as any[])
      .filter((marca) => !acceso || acceso.includes(marca.id))
      .map((marca) => ({
        slug: texto(marca.slug),
        nombre: texto(marca.nombre, texto(marca.slug)),
        emoji: textoOrNull(marca.emoji_marca),
        color: colorDeMarca(marca.slug, marca.color_primario_hex),
        influencers_activo: influencersActivoDe(texto(marca.slug), marca.influencers_activo),
      }))
  } catch {
    return []
  }
}
