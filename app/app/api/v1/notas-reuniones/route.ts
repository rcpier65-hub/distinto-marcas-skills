// GET /api/v1/notas-reuniones
//
// Próximas (misma ventana que el home) y notas recientes.
// Director, o sesión sin team_member, ve las notas del equipo.
// El resto ve solo las suyas. No crea ni edita. El detalle abre la web.
// Auth: Authorization: Bearer <supabase access_token>

import { NextResponse } from 'next/server'
import { appBase, ymdLima } from '@/lib/api/lima'
import { requireSessionMember } from '@/lib/api/session-member'
import { getProximasSemana } from '@/lib/notas-reuniones/proximas'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const ESTADOS = new Set(['borrador', 'en_curso', 'finalizada'])

function texto(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function preview(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const flat = value.replace(/\s+/g, ' ').trim()
  if (!flat) return null
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  const veTodo = member.veTodoSoporte

  const proximasRaw = await getProximasSemana()
  const base = appBase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let query = service
    .from('notas_reuniones')
    .select('id, team_member_id, titulo, cuerpo, estado, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(80)
  if (!veTodo && member.teamMemberId) query = query.eq('team_member_id', member.teamMemberId)

  const { data, error } = await query
  if (error && !/does not exist|schema cache|PGRST205/i.test(error.message ?? '')) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = error ? [] : ((data ?? []) as any[])
  const memberIds = [...new Set(rows.map((row) => row.team_member_id).filter((id) => typeof id === 'string'))] as string[]
  const nombrePorId = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: miembros } = await service.from('team_members').select('id, nombre').in('id', memberIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const fila of (miembros ?? []) as any[]) {
      if (typeof fila.id === 'string' && typeof fila.nombre === 'string' && fila.nombre.trim()) {
        nombrePorId.set(fila.id, fila.nombre.trim())
      }
    }
  }

  const notas = rows.map((row) => {
    const id = String(row.id)
    const esMio = !!member.teamMemberId && row.team_member_id === member.teamMemberId
    const estadoRaw = typeof row.estado === 'string' ? row.estado : 'borrador'
    const autor = esMio ? 'Yo' : (nombrePorId.get(row.team_member_id) ?? 'Equipo')
    return {
      id,
      titulo: texto(row.titulo, 'Sin título'),
      preview: preview(row.cuerpo),
      estado: ESTADOS.has(estadoRaw) ? estadoRaw : 'borrador',
      autor_nombre: autor,
      es_mio: esMio,
      created_at: typeof row.created_at === 'string' ? row.created_at : null,
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
      link: `${base}/notas-reuniones/${id}`,
    }
  })

  const proximas = proximasRaw.map((item) => {
    const link = item.fuente === 'nota'
      ? `${base}/notas-reuniones/${item.id}`
      : item.fuente === 'marca_reuniones'
        ? `${base}/grabaciones/calendario`
        : `${base}/notas-reuniones`
    return {
      id: `${item.fuente}:${item.id}`,
      titulo: item.titulo,
      starts_at: item.startsAt,
      ends_at: item.endsAt,
      fuente: item.fuente,
      link,
    }
  })

  return NextResponse.json({
    ok: true,
    hoy: ymdLima(),
    ve_todo: veTodo,
    total: notas.length,
    proximas,
    notas,
  })
}
