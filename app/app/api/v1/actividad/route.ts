// GET /api/v1/actividad?fecha=YYYY-MM-DD&persona=
// Reporte del día. Director o sin fila ve al equipo; el resto, solo lo suyo.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { loadActividadDerivada } from '@/lib/actividad/derivar'
import { appBase, isYmd, ymdLima } from '@/lib/api/lima'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member

  const url = new URL(request.url)
  const fechaQ = url.searchParams.get('fecha')
  if (fechaQ && !isYmd(fechaQ)) return apiJsonError('fecha tiene que ser YYYY-MM-DD', 400)
  const fecha = fechaQ && isYmd(fechaQ) ? fechaQ : ymdLima()
  const personaQ = url.searchParams.get('persona')
  const persona = member.esCeo ? (personaQ && personaQ.trim() ? personaQ.trim() : null) : (member.nombre ?? '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const desde = `${fecha}T00:00:00-05:00`
  const hasta = `${fecha}T23:59:59-05:00`
  const rows = await loadActividadDerivada(service, {
    desde,
    hasta,
    esAdmin: member.esCeo,
    soloActorNombre: persona,
  })

  const habitosRes = await service
    .from('habitos_completados')
    .select('completado_at, habito:habitos!inner(nombre, icono, miembro:team_members(nombre))')
    .eq('fecha', fecha)
  const habitos: { persona: string; nombre: string; icono: string }[] = []
  if (!habitosRes.error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (habitosRes.data ?? []) as any[]) {
      const habito = Array.isArray(row.habito) ? row.habito[0] : row.habito
      const miembro = habito ? (Array.isArray(habito.miembro) ? habito.miembro[0] : habito.miembro) : null
      const nombre = typeof miembro?.nombre === 'string' ? miembro.nombre : ''
      if (!nombre) continue
      if (persona && nombre !== persona) continue
      habitos.push({
        persona: nombre,
        nombre: typeof habito.nombre === 'string' ? habito.nombre : 'Hábito',
        icono: typeof habito.icono === 'string' ? habito.icono : '🌱',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    fecha,
    es_admin: member.esCeo,
    persona,
    total: rows.length,
    actividad: rows.map((row) => ({
      actor_nombre: row.actor_nombre,
      rol: row.rol,
      accion: row.accion,
      detalle: row.detalle,
      marca_slug: row.marca_slug,
      created_at: row.created_at,
    })),
    habitos,
    link: `${appBase()}/actividad?fecha=${fecha}`,
  })
}
