// GET /api/v1/tareas?due=hoy
//   ?include_overdue=1
//   ?team_member_id=<uuid>   solo el dueño del tablero (Pedro / sin team_member)
//   ?vista=tablero           tablero completo de /tareas (abiertas + archivo)
//
// Sin vista: tres listas, las mismas que ve la web de hoy:
//   trabajo_hoy  — "Tu trabajo de hoy" de /inicio (cargarTrabajoDeHoy)
//   pendientes   — pendientes rápidos de /inicio (cargarPendientesInicio)
//   tareas       — filas abiertas de /tareas con fecha de hoy o sin fecha
//                  (cargarTareasParaHoy, mismo alcance de persona que la página)
//   frase        — frase del día de /inicio
//
// vista=tablero: mismas filas abiertas que /tareas (dueño ve el equipo).
// due=hoy no cambia.
//
// POST { id, completada } marca hecha. POST { texto } crea, igual que crearTarea.
//
// Auth: cookie de sesión, Bearer JWT de Supabase, o dst_live_ con tareas:read
// (el alcance owner también vale). POST exige owner.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { deviceScopeAllows, jsonApiError, resolveV1Actor } from '@/lib/api/auth'
import { OWNER_SCOPE, TAREAS_READ_SCOPE } from '@/lib/api/device-key-scopes'
import { cargarMiembroV1, type MiembroV1 } from '@/lib/api/miembro-v1'
import { cargarPendientesInicio, cargarTrabajoDeHoy } from '@/lib/hoy/trabajo-de-hoy'
import { cargarTareasParaHoy } from '@/lib/hoy/tareas-hoy'
import { getFraseDelDia } from '@/lib/inicio/get-frase-del-dia'
import { hoyLima } from '@/lib/fechas/hoy'
import { insertarTareaRapida } from '@/lib/tareas/insertar-tarea'
import { ESTADOS_TAREA } from '@/lib/tareas/pro-types'
import { cerrarSesion } from '@/lib/tareas/tiempo'

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
  const vista = url.searchParams.get('vista')
  if (vista && vista !== 'tablero') {
    return jsonApiError('vista solo acepta tablero', 400)
  }
  const due = url.searchParams.get('due')
  if (!vista && due && due !== 'hoy') {
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

  if (vista === 'tablero') return responderTablero(service, miembro)

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

  const frase = getFraseDelDia(miembro.rolBase ?? 'director', miembro.teamMemberId ?? miembro.userId)

  return NextResponse.json({
    ok: true,
    fecha,
    total: trabajo.length + pend.length + tareas.length,
    trabajo_hoy: trabajo,
    pendientes: pend,
    tareas,
    frase: {
      texto: frase.frase.texto,
      autor: frase.frase.autor,
      contexto: frase.frase.contexto ?? null,
    },
  })
}

// POST /api/v1/tareas
//   { id, completada?: boolean }  — misma marca de hecha que completarTarea
//   { texto, assignee_id? }       — misma alta que crearTarea
// Dueño de la fila, quien la creó, o rol director pueden completar.
// La clave dst_live_ necesita alcance owner.
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
  const record = body as Record<string, unknown>
  const texto = typeof record.texto === 'string' ? record.texto : ''
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const creando = texto.trim().length > 0 && !UUID_RE.test(id)
  if (!creando && !UUID_RE.test(id)) return jsonApiError('id no es un uuid', 400)
  const completada = typeof record.completada === 'boolean' ? record.completada : true

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

  if (creando) {
    const assignee = typeof record.assignee_id === 'string' ? record.assignee_id.trim() : ''
    if (assignee && !UUID_RE.test(assignee)) return jsonApiError('assignee_id no es un uuid', 400)
    const creado = await insertarTareaRapida(service, {
      memberId: miembro.teamMemberId,
      textoOriginal: texto,
      assigneeId: assignee || null,
    })
    if (!creado.ok) {
      const status = creado.error === 'No escribiste nada' || creado.error === 'Demasiado largo' ? 400 : 500
      return jsonApiError(creado.error, status)
    }
    return NextResponse.json({
      ok: true,
      id: creado.tarea.id,
      titulo: creado.tarea.texto,
      categoria: creado.tarea.categoria,
      color: creado.tarea.color,
    })
  }

  const { data: tarea, error: readError } = await service
    .from('tareas')
    .select('id, team_member_id, created_by')
    .eq('id', id)
    .maybeSingle()
  if (readError) return jsonApiError(readError.message, 500)
  if (!tarea) return jsonApiError('Tarea no encontrada', 404)

  const esDirector = miembro.rolBase === 'director'
  const puede =
    esDirector ||
    tarea.team_member_id === miembro.teamMemberId ||
    tarea.created_by === miembro.teamMemberId
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

const SELECT_TABLERO = `id, texto, categoria, color, completada, completada_at, marca_slug, team_member_id, created_at, estado, fecha_inicio, fecha_entrega, miembro:team_members!tareas_team_member_id_fkey(nombre)`
const SELECT_TABLERO_BASE = `id, texto, categoria, color, completada, completada_at, marca_slug, team_member_id, created_at, miembro:team_members!tareas_team_member_id_fkey(nombre)`

function estadoTarea(value: unknown): string {
  return typeof value === 'string' && (ESTADOS_TAREA as readonly string[]).includes(value) ? value : 'sin_empezar'
}

function ymdOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 10) return null
  return value.slice(0, 10)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function responderTablero(service: any, miembro: MiembroV1) {
  async function load(select: string, completada: boolean, limit?: number) {
    let query = service.from('tareas').select(select).eq('completada', completada)
    query = completada
      ? query.order('completada_at', { ascending: false, nullsFirst: false }).limit(limit ?? 80)
      : query.order('created_at', { ascending: false })
    if (!miembro.esDueno && miembro.teamMemberId) query = query.eq('team_member_id', miembro.teamMemberId)
    return query
  }

  let plan = true
  let abiertas = await load(SELECT_TABLERO, false)
  if (abiertas.error && /estado|fecha_inicio|fecha_entrega/i.test(abiertas.error.message ?? '')) {
    plan = false
    abiertas = await load(SELECT_TABLERO_BASE, false)
  }
  if (abiertas.error) return jsonApiError(abiertas.error.message, 500)
  const archivoRes = await load(plan ? SELECT_TABLERO : SELECT_TABLERO_BASE, true, 80)
  if (archivoRes.error) return jsonApiError(archivoRes.error.message, 500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = [...((abiertas.data ?? []) as any[]), ...((archivoRes.data ?? []) as any[])]
  const slugs = [...new Set(rows.map((row) => row.marca_slug).filter((slug): slug is string => typeof slug === 'string' && slug.length > 0))]
  const nombres = new Map<string, string>()
  const [marcasRes, equipoRes] = await Promise.all([
    slugs.length > 0
      ? service.from('marcas').select('slug, nombre').in('slug', slugs)
      : Promise.resolve({ data: [], error: null }),
    service.from('team_members').select('id, nombre').eq('activo', true).order('nombre'),
  ])
  if (marcasRes.error) return jsonApiError(marcasRes.error.message, 500)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const marca of (marcasRes.data ?? []) as any[]) {
    if (typeof marca.slug === 'string' && typeof marca.nombre === 'string' && marca.nombre.trim()) {
      nombres.set(marca.slug, marca.nombre.trim())
    }
  }

  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRow(row: any, archivada: boolean) {
    const miembroRow = Array.isArray(row.miembro) ? row.miembro[0] : row.miembro
    const marcaSlug = typeof row.marca_slug === 'string' ? row.marca_slug : null
    return {
      id: String(row.id),
      titulo: typeof row.texto === 'string' && row.texto.trim() ? row.texto.trim() : 'Sin título',
      categoria: typeof row.categoria === 'string' && row.categoria.trim() ? row.categoria.trim() : 'General',
      color: typeof row.color === 'string' && row.color.trim() ? row.color.trim() : '#7170FF',
      estado: archivada ? 'archivado' : estadoTarea(row.estado),
      fecha_entrega: ymdOrNull(row.fecha_entrega),
      fecha_inicio: ymdOrNull(row.fecha_inicio),
      completada_at: typeof row.completada_at === 'string' ? row.completada_at : null,
      marca: marcaSlug ? (nombres.get(marcaSlug) ?? marcaSlug) : null,
      marca_slug: marcaSlug,
      asignado: typeof miembroRow?.nombre === 'string' ? miembroRow.nombre : null,
      asignado_id: typeof row.team_member_id === 'string' ? row.team_member_id : null,
      link: `${base}/tareas`,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareas = ((abiertas.data ?? []) as any[]).map((row) => mapRow(row, false))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const archivo = ((archivoRes.data ?? []) as any[]).map((row) => mapRow(row, true))
  const marcasNav = await service.from('marcas').select('slug, nombre').eq('activa', true).order('nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = ((marcasNav.data ?? []) as any[])
    .filter((marca) => typeof marca.slug === 'string' && typeof marca.nombre === 'string')
    .map((marca) => ({ slug: marca.slug as string, nombre: (marca.nombre as string).trim() }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipo = ((equipoRes.data ?? []) as any[])
    .filter((miembroRow) => typeof miembroRow.id === 'string' && typeof miembroRow.nombre === 'string')
    .map((miembroRow) => ({ id: miembroRow.id as string, nombre: (miembroRow.nombre as string).trim() }))

  return NextResponse.json({
    ok: true,
    vista: 'tablero',
    es_dueno: miembro.esDueno,
    me_id: miembro.teamMemberId,
    total: tareas.length,
    tareas,
    archivo,
    equipo,
    marcas,
  })
}
