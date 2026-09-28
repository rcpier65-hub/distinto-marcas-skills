// GET  /api/v1/soporte
// POST /api/v1/soporte  { tipo, descripcion }
//
// Lista de reportes, misma visibilidad que /soporte:
//   - director, o admin sin team_member: todos (hasta 300, más nuevos primero)
//   - el resto: solo los propios
// POST crea el reporte con la misma función que el formulario web (sin capturas).
// POST { id, accion: "tomar" | "resolver", nota? } usa la misma puerta que la web.
// Las capturas siguen en la web. Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'
import { insertarReporteSoporte } from '@/lib/soporte/crear-reporte'
import { resolverReporteEquipo, tomarReporteEquipo } from '@/lib/soporte/gestionar-reporte'

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

// POST /api/v1/soporte  { tipo, descripcion }
// Misma alta que el formulario de /soporte (sin capturas: esas siguen en la web).
export async function POST(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }
  const input = body as Record<string, unknown>
  const accion = typeof input.accion === 'string' ? input.accion : ''
  const id = typeof input.id === 'string' ? input.id.trim() : ''
  if (id && (accion === 'tomar' || accion === 'resolver')) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ ok: false, error: 'id no es un uuid' }, { status: 400 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const nota = typeof input.nota === 'string' ? input.nota : ''
    const nombre = member.nombre?.trim() || 'Erick'
    if (accion === 'tomar') {
      const tomado = await tomarReporteEquipo(service, {
        esAdmin: member.veTodoSoporte,
        memberId: member.teamMemberId,
        memberNombre: nombre,
        id,
      })
      if (!tomado.ok) {
        const status = tomado.error.startsWith('Solo') ? 403 : 500
        return NextResponse.json({ ok: false, error: tomado.error }, { status })
      }
      return NextResponse.json({ ok: true, id, estado: 'en_proceso' })
    }
    const resuelto = await resolverReporteEquipo(service, {
      esAdmin: member.veTodoSoporte,
      memberId: member.teamMemberId,
      id,
      nota,
    })
    if (!resuelto.ok) {
      const status = resuelto.error.startsWith('Solo') ? 403 : 500
      return NextResponse.json({ ok: false, error: resuelto.error }, { status })
    }
    return NextResponse.json({ ok: true, id, estado: 'resuelto', whatsapp: resuelto.whatsapp })
  }

  const tipo = typeof input.tipo === 'string' ? input.tipo : 'falla'
  const descripcion = typeof input.descripcion === 'string' ? input.descripcion : ''
  const nombre = member.nombre?.trim()
    || member.email?.split('@')[0]
    || 'Alguien'

  const creado = await insertarReporteSoporte({
    teamMemberId: member.teamMemberId,
    autorNombre: nombre,
    tipo,
    descripcion,
  })
  if (!creado.ok) {
    const status = creado.error.includes('Demasiado') || creado.error.startsWith('Escribe') ? 400 : 500
    return NextResponse.json({ ok: false, error: creado.error }, { status })
  }
  return NextResponse.json({ ok: true, id: creado.id })
}
