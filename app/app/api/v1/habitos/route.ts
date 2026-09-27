// GET /api/v1/habitos
// Hábitos del día del miembro (o del owner si no hay fila). Solo lectura:
// marcar sigue en /habitos.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { addDaysYmd, appBase, ymdLima } from '@/lib/api/lima'
import { tablaFalta, texto } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

function isoWeekday(ymd: string): number {
  const day = new Date(`${ymd}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const today = ymdLima()
  const desde = addDaysYmd(today, -6)

  let habsQuery = service
    .from('habitos')
    .select('id, nombre, icono, color, dias_activos, orden')
    .eq('activo', true)
    .order('orden', { ascending: true })
  habsQuery = member.teamMemberId
    ? habsQuery.eq('team_member_id', member.teamMemberId)
    : habsQuery.is('team_member_id', null)
  const habsRes = await habsQuery
  if (habsRes.error) {
    if (tablaFalta(habsRes.error.message ?? '')) {
      return NextResponse.json({ ok: true, today, total: 0, completados: 0, habitos: [] })
    }
    return apiJsonError(habsRes.error.message, 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitos = (habsRes.data ?? []) as any[]
  const ids = habitos.map((habito) => habito.id).filter((id: unknown) => typeof id === 'string')
  const hechos = new Map<string, Set<string>>()
  if (ids.length > 0) {
    const doneRes = await service
      .from('habitos_completados')
      .select('habito_id, fecha')
      .in('habito_id', ids)
      .gte('fecha', desde)
      .lte('fecha', today)
    if (doneRes.error && !tablaFalta(doneRes.error.message ?? '')) {
      return apiJsonError(doneRes.error.message, 500)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (doneRes.data ?? []) as any[]) {
      const id = typeof row.habito_id === 'string' ? row.habito_id : ''
      const fecha = typeof row.fecha === 'string' ? row.fecha.slice(0, 10) : ''
      if (!id || !fecha) continue
      const set = hechos.get(id) ?? new Set<string>()
      set.add(fecha)
      hechos.set(id, set)
    }
  }

  const base = appBase()
  const lista = habitos.map((habito) => {
    const dias = Array.isArray(habito.dias_activos)
      ? habito.dias_activos.filter((dia: unknown) => typeof dia === 'number')
      : [1, 2, 3, 4, 5, 6, 7]
    const aplicaHoy = dias.length === 0 || dias.includes(isoWeekday(today))
    const set = hechos.get(String(habito.id)) ?? new Set<string>()
    let hechosSemana = 0
    for (let i = 0; i < 7; i += 1) {
      if (set.has(addDaysYmd(desde, i))) hechosSemana += 1
    }
    return {
      id: String(habito.id),
      nombre: texto(habito.nombre, 'Hábito'),
      icono: texto(habito.icono, '🌱'),
      color: texto(habito.color, '#7170ff'),
      aplica_hoy: aplicaHoy,
      completado_hoy: set.has(today),
      hechos_semana: hechosSemana,
      link: `${base}/habitos`,
    }
  })
  const deHoy = lista.filter((habito) => habito.aplica_hoy)

  return NextResponse.json({
    ok: true,
    today,
    total: deHoy.length,
    completados: deHoy.filter((habito) => habito.completado_hoy).length,
    habitos: lista,
  })
}
