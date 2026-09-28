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
import { createServiceClient } from '@/lib/supabase/service'
import { deviceScopeAllows, jsonApiError, resolveV1Actor } from '@/lib/api/auth'
import { TAREAS_READ_SCOPE } from '@/lib/api/device-key-scopes'
import { cargarMiembroV1 } from '@/lib/api/miembro-v1'
import { cargarPendientesInicio, cargarTrabajoDeHoy } from '@/lib/hoy/trabajo-de-hoy'
import { cargarTareasParaHoy } from '@/lib/hoy/tareas-hoy'
import { hoyLima } from '@/lib/fechas/hoy'

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

  let memberId: string | null = null
  if (requestedId && requestedId !== miembro.teamMemberId) {
    if (!miembro.esDueno) {
      return jsonApiError('No puedes ver tareas de otro miembro', 403)
    }
    memberId = requestedId
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any
  try {
    service = createServiceClient()
  } catch {
    return jsonApiError('Falta SUPABASE_SERVICE_ROLE_KEY', 500)
  }

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
