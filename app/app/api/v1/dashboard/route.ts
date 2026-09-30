// GET /api/v1/dashboard
// Marcas para «Ver todas» / «Agregar marca». Director, admin, o sin fila de equipo.
// GET /api/v1/marcas sigue siendo de rutina (CRON_SECRET) y no lo usa el Mac.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { texto, textoOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { colorDeMarca } from '@/lib/marcas/branding'
import { createServiceClient } from '@/lib/supabase/service'
import { loadTaskAccess } from '@/lib/tareas/access-server'
import { scopeTasks } from '@/lib/tareas/access'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  if (!member.puedeGestionarMarcas) return apiJsonError('No tienes acceso al dashboard de marcas', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const marcasRes = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, activa')
    .order('activa', { ascending: false })
    .order('nombre')
  if (marcasRes.error) return apiJsonError(marcasRes.error.message, 500)

  let tareasQuery = service
    .from('tareas')
    .select('id, marca_slug, categoria, team_member_id')
    .eq('completada', false)
    .limit(500)
  const { access } = await loadTaskAccess(service, member.userId)
  tareasQuery = scopeTasks(tareasQuery, access)
  const tareasRes = await tareasQuery

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = ((marcasRes.data ?? []) as any[]).map((marca) => ({
    id: String(marca.id),
    slug: texto(marca.slug),
    nombre: texto(marca.nombre),
    emoji: textoOrNull(marca.emoji_marca),
    color: colorDeMarca(marca.slug, marca.color_primario_hex),
    activa: marca.activa !== false,
    nombreClave: texto(marca.nombre).toLowerCase().trim(),
  }))

  const abiertas = new Map<string, number>()
  if (!tareasRes.error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const tarea of (tareasRes.data ?? []) as any[]) {
      const slug = textoOrNull(tarea.marca_slug)
      const cat = texto(tarea.categoria).toLowerCase().trim()
      const match = marcas.find((marca) => (slug && marca.slug === slug) || (cat && cat === marca.nombreClave))
      if (!match) continue
      abiertas.set(match.slug, (abiertas.get(match.slug) ?? 0) + 1)
    }
  }

  const base = appBase()
  const lista = marcas.map((marca) => ({
    slug: marca.slug,
    nombre: marca.nombre,
    emoji: marca.emoji,
    color: marca.color,
    activa: marca.activa,
    tareas_abiertas: abiertas.get(marca.slug) ?? 0,
    link: `${base}/grilla/${marca.slug}`,
  }))
  const activas = lista.filter((marca) => marca.activa).length

  return NextResponse.json({
    ok: true,
    total: lista.length,
    activas,
    marcas: lista,
    link_nueva: `${base}/dashboard?nueva=1`,
  })
}
