// GET /api/v1/tareas?due=hoy
//   ?include_overdue=1
//   ?team_member_id=<uuid>   solo el dueño del tablero (Pedro / sin team_member)
//
// Tres listas, las mismas que ve la web:
//   trabajo_hoy  — "Tu trabajo de hoy" de /inicio (cargarTrabajoDeHoy)
//   pendientes   — pendientes rápidos de /inicio (cargarPendientesInicio)
//   tareas       — filas abiertas de /tareas con fecha de hoy o sin fecha
//                  (cargarTareasParaHoy, mismo alcance de persona que la página)
//
// Auth: cookie de sesión, Bearer JWT de Supabase, o dst_live_ con tareas:read
// (el alcance owner también vale).

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { deviceScopeAllows, jsonApiError, resolveV1Actor } from '@/lib/api/auth'
import { OWNER_SCOPE, TAREAS_READ_SCOPE } from '@/lib/api/device-key-scopes'
import { cargarMiembroV1 } from '@/lib/api/miembro-v1'
import { cargarPendientesInicio, cargarTrabajoDeHoy } from '@/lib/hoy/trabajo-de-hoy'
import { cargarTareasParaHoy } from '@/lib/hoy/tareas-hoy'
import { hoyLima } from '@/lib/fechas/hoy'
import { cerrarSesion } from '@/lib/tareas/tiempo'
import { loadTaskAccess } from '@/lib/tareas/access-server'
import { taskMemberVisible, taskEditable } from '@/lib/tareas/access'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app').replace(/\/$/, '')
}

function hrefModulo(modulo: 'editor' | 'diseno' | 'comentarios'): string {
  switch (modulo) {
    case 'editor':
      return '/editor'
    case 'diseno':
      return '/diseno'
    case 'comentarios':
      return '/comentarios'
    default: {
      const _never: never = modulo
      return _never
    }
  }
}

function statusFromEstado(estado: string | null): string {
  if (!estado || estado === 'sin_empezar') return 'pendiente'
  return estado
}

export async function GET(request: Request) {
  const auth = await resolveV1Actor(request)
  if ('response' in auth) return auth.response
  if (!deviceScopeAllows(auth.actor, TAREAS_READ_SCOPE)) {
    return jsonApiError('La clave no incluye el permiso tareas:read', 403)
  }

  const url = new URL(request.url)
  const due = url.searchParams.get('due')
  if (due && due !== 'hoy') {
    return jsonApiError('v1 solo acepta due=hoy (si se omite, equivale a hoy)', 400)
  }
  const fecha = hoyLima()
  const includeOverdue = url.searchParams.get('include_overdue') === '1'
  const requestedId = url.searchParams.get('team_member_id')?.trim() || null
  if (requestedId && !UUID_RE.test(requestedId)) {
    return jsonApiError('team_member_id no es un uuid', 400)
  }

  const cargado = await cargarMiembroV1(auth.actor)
  if ('response' in cargado) return cargado.response
  const miembro = cargado.miembro

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any
  try {
    service = createServiceClient()
  } catch {
    return jsonApiError('Falta SUPABASE_SERVICE_ROLE_KEY', 500)
  }

  const { access } = await loadTaskAccess(service, auth.actor.userId)
  if (!access.active) return jsonApiError('Necesitas una cuenta activa del equipo', 403)
  if (requestedId && !taskMemberVisible(access, requestedId)) return jsonApiError('No puedes ver tareas de ese miembro', 403)
  const memberId = requestedId

  const nombre = miembro.nombre ?? ''
  const [trabajoHoy, pendientes, tablero] = await Promise.all([
    cargarTrabajoDeHoy(service, {
      esOwner: miembro.esDueno,
      nombre,
      permisos: miembro.permisos,
      hoy: fecha,
    }),
    cargarPendientesInicio(service, memberId ?? miembro.teamMemberId),
    cargarTareasParaHoy(service, {
      access,
      esOwner: miembro.esDueno,
      meId: miembro.teamMemberId,
      memberId,
      fecha,
      includeOverdue,
    }),
  ])
  if (!tablero.ok) return jsonApiError(tablero.error, 500)

  const slugs = [...new Set(tablero.rows.map((t) => t.marca_slug).filter((s): s is string => !!s))]
  const nombres = new Map<string, string>()
  if (slugs.length > 0) {
    const { data: marcas, error } = await service.from('marcas').select('slug, nombre').in('slug', slugs)
    if (error) return jsonApiError(error.message, 500)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of (marcas ?? []) as any[]) {
      if (typeof m.slug === 'string' && typeof m.nombre === 'string' && m.nombre.trim()) {
        nombres.set(m.slug, m.nombre.trim())
      }
    }
  }

  const base = appBase()
  const tareas = tablero.rows.map((t) => {
    const marca = t.marca_slug ? (nombres.get(t.marca_slug) ?? t.marca_slug) : null
    return {
      id: t.id,
      titulo: t.texto.trim() || 'Sin título',
      due: t.fecha_entrega,
      status: statusFromEstado(t.estado),
      proyecto: t.categoria ?? marca,
      marca,
      link: `${base}/tareas`,
      fuente: 'tareas' as const,
    }
  })

  const trabajo = trabajoHoy.map((t) => ({
    ...t,
    link: `${base}${hrefModulo(t.modulo)}`,
    fuente: 'trabajo_hoy' as const,
  }))
  const pend = pendientes.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    descripcion: p.descripcion,
    categoria: p.categoria,
    prioridad: p.prioridad,
    link: `${base}/inicio`,
    fuente: 'pendientes_rapidos' as const,
  }))

  return NextResponse.json({
    ok: true,
    fecha,
    total: trabajo.length + pend.length + tareas.length,
    trabajo_hoy: trabajo,
    pendientes: pend,
    tareas,
  })
}

// POST /api/v1/tareas  { id, completada?: boolean }
// Misma marca de hecha que completarTarea en /tareas: dueño de la fila,
// quien la creó, o rol director. La clave dst_live_ necesita alcance owner.
export async function POST(request: Request) {
  const auth = await resolveV1Actor(request)
  if ('response' in auth) return auth.response
  if (!deviceScopeAllows(auth.actor, OWNER_SCOPE)) {
    return jsonApiError(
      'La clave de dispositivo no tiene alcance owner. Ampliá el alcance a owner (el token dst_live_ no cambia) o creá una clave nueva.',
      403,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonApiError('JSON inválido', 400)
  }
  if (!body || typeof body !== 'object') return jsonApiError('JSON inválido', 400)
  const id = 'id' in body && typeof body.id === 'string' ? body.id.trim() : ''
  if (!UUID_RE.test(id)) return jsonApiError('id no es un uuid', 400)
  const completada = 'completada' in body && typeof body.completada === 'boolean' ? body.completada : true

  const cargado = await cargarMiembroV1(auth.actor)
  if ('response' in cargado) return cargado.response

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any
  try {
    service = createServiceClient()
  } catch {
    return jsonApiError('Falta SUPABASE_SERVICE_ROLE_KEY', 500)
  }

  const { data: tarea, error: readError } = await service
    .from('tareas')
    .select('id, team_member_id, created_by')
    .eq('id', id)
    .maybeSingle()
  if (readError) return jsonApiError(readError.message, 500)
  if (!tarea) return jsonApiError('Tarea no encontrada', 404)

  const { access } = await loadTaskAccess(service, auth.actor.userId)
  const puede = taskEditable(access, tarea)
  if (!puede) return jsonApiError('Esta tarea no es tuya', 403)

  if (completada) await cerrarSesion(service, id, 'terminada')
  const { error } = await service
    .from('tareas')
    .update({
      completada,
      completada_at: completada ? new Date().toISOString() : null,
      focus_lane: completada ? null : undefined,
    })
    .eq('id', id)
  if (error) return jsonApiError(error.message, 500)

  revalidatePath('/tareas')
  revalidatePath('/inicio')
  return NextResponse.json({ ok: true, id, completada })
}
