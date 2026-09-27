// GET /api/v1/soporte
//
// Lista de reportes, misma visibilidad que /soporte:
//   - director, o admin sin team_member: todos (hasta 300, más nuevos primero)
//   - el resto: solo los propios
// No crea ni resuelve. El detalle sigue en la web (no hay ruta por reporte).
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const TIPOS = new Set(['falla', 'pedido', 'consulta'])
const ESTADOS = new Set(['pendiente', 'en_proceso', 'resuelto'])

function texto(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let query = service
    .from('soporte_reportes')
    .select('id, team_member_id, autor_nombre, tipo, descripcion, estado, nota_resolucion, imagenes, created_at, resuelto_at, resuelto_por')
    .order('created_at', { ascending: false })
    .limit(300)

  if (!member.veTodoSoporte) {
    if (!member.teamMemberId) {
      return NextResponse.json({ ok: true, es_admin: false, total: 0, reportes: [] })
    }
    query = query.eq('team_member_id', member.teamMemberId)
  }

  const { data, error } = await query
  if (error) {
    if (/does not exist|schema cache|PGRST205/i.test(error.message ?? '')) {
      return NextResponse.json({ ok: true, es_admin: member.veTodoSoporte, total: 0, reportes: [] })
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const { data: miembros } = await service.from('team_members').select('id, nombre')
  const nombrePorId = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (miembros ?? []) as any[]) {
    if (typeof row.id === 'string' && typeof row.nombre === 'string' && row.nombre.trim()) {
      nombrePorId.set(row.id, row.nombre.trim())
    }
  }

  const link = `${appBase()}/soporte`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reportes = ((data ?? []) as any[]).map((row) => {
    const tipoRaw = typeof row.tipo === 'string' ? row.tipo : 'falla'
    const estadoRaw = typeof row.estado === 'string' ? row.estado : 'pendiente'
    const resueltoPorId = typeof row.resuelto_por === 'string' ? row.resuelto_por : null
    return {
      id: String(row.id),
      autor_nombre: texto(row.autor_nombre, 'Alguien'),
      es_mio: !!member.teamMemberId && row.team_member_id === member.teamMemberId,
      tipo: TIPOS.has(tipoRaw) ? tipoRaw : 'consulta',
      descripcion: texto(row.descripcion, ''),
      estado: ESTADOS.has(estadoRaw) ? estadoRaw : 'pendiente',
      nota_resolucion: typeof row.nota_resolucion === 'string' && row.nota_resolucion.trim()
        ? row.nota_resolucion.trim()
        : null,
      imagenes: Array.isArray(row.imagenes) ? row.imagenes.length : 0,
      created_at: typeof row.created_at === 'string' ? row.created_at : null,
      resuelto_at: typeof row.resuelto_at === 'string' ? row.resuelto_at : null,
      resuelto_por: resueltoPorId ? (nombrePorId.get(resueltoPorId) ?? null) : null,
      link,
    }
  })

  return NextResponse.json({
    ok: true,
    es_admin: member.veTodoSoporte,
    total: reportes.length,
    reportes,
  })
}
