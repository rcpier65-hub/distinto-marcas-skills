// GET  /api/v1/grabaciones/calendario?desde&hasta
//   Mismos eventos que pinta /grabaciones/calendario (cargarAgendaCalendario).
//   Sin query: la semana en curso en Lima, como la vista por defecto de la web.
// POST /api/v1/grabaciones/calendario
//   { tipo: "reunion"|"grabacion", marca_slug, fecha, hora, titulo?, duration_min?, correos? }
//   Llama ejecutarAgendarReunion / ejecutarAgendarGrabacion — el mismo cuerpo
//   que el asistente "Agendar reunión o grabación".
//
// Auth: cookie de sesión, Bearer JWT de Supabase, o dst_live_ con alcance owner.
// GET además exige el módulo publicaciones (igual que la página).
// POST exige director, admin, o usuario sin team_member.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { deviceScopeAllows, jsonApiError, resolveV1Actor } from '@/lib/api/auth'
import { OWNER_SCOPE } from '@/lib/api/device-key-scopes'
import { normalizarHoraAgenda } from '@/lib/api/hora'
import { cargarMiembroV1 } from '@/lib/api/miembro-v1'
import { cargarAgendaCalendario, type AgendaCargada } from '@/lib/calendario/cargar-agenda'
import { ejecutarAgendarGrabacion, ejecutarAgendarReunion } from '@/lib/calendario/agendar-web'
import { hoyLima } from '@/lib/fechas/hoy'
import type { AgendaEvento } from '@/app/grabaciones/calendario/_components/agenda-calendar'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_DAYS = 120
const OWNER_MSG =
  'La clave de dispositivo no tiene alcance owner. Ampliá el alcance a owner (el token dst_live_ no cambia) o creá una clave nueva.'

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app').replace(/\/$/, '')
}

function esYmd(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T12:00:00Z'))
}

function addDias(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function semanaDe(hoy: string): { desde: string; hasta: string } {
  const dow = new Date(hoy + 'T12:00:00Z').getUTCDay()
  const desde = addDias(hoy, -(dow === 0 ? 6 : dow - 1))
  return { desde, hasta: addDias(desde, 6) }
}

function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(desde + 'T12:00:00Z')
  const b = Date.parse(hasta + 'T12:00:00Z')
  return Math.round((b - a) / 86_400_000)
}

function eventoJson(e: AgendaEvento, base: string) {
  const link = e.href
    ? `${base}${e.href.startsWith('/') ? e.href : `/${e.href}`}`
    : `${base}/grabaciones/calendario?vista=dia&desde=${e.fecha}&hasta=${e.fecha}`
  return {
    id: e.id,
    tipo: e.tipo,
    fecha: e.fecha,
    hora: e.hora,
    titulo: e.titulo,
    estado: e.estado,
    notas: e.notas,
    meet_link: e.meetLink,
    duracion_min: e.duracionMin ?? null,
    origen_google: e.origenGoogle === true,
    marca: e.marcaSlug
      ? { slug: e.marcaSlug, nombre: e.marcaNombre, emoji: e.marcaEmoji, color: e.color }
      : null,
    link,
  }
}

function statusDeAgenda(error: string): number {
  if (/no está conectado|Conecta Google/i.test(error)) return 503
  if (/Solo los directores/i.test(error)) return 403
  if (/no encontrada/i.test(error)) return 404
  return 400
}

export async function GET(request: Request) {
  const auth = await resolveV1Actor(request)
  if ('response' in auth) return auth.response
  if (!deviceScopeAllows(auth.actor, OWNER_SCOPE)) {
    return jsonApiError(OWNER_MSG, 403)
  }
  const cargado = await cargarMiembroV1(auth.actor)
  if ('response' in cargado) return cargado.response
  if (!cargado.miembro.puedePublicaciones) {
    return jsonApiError('No tienes acceso al calendario', 403)
  }

  const url = new URL(request.url)
  const desdeQ = url.searchParams.get('desde')
  const hastaQ = url.searchParams.get('hasta')
  const hoy = hoyLima()
  let desde: string
  let hasta: string
  if (!desdeQ && !hastaQ) {
    const semana = semanaDe(hoy)
    desde = semana.desde
    hasta = semana.hasta
  } else if (!esYmd(desdeQ) || !esYmd(hastaQ)) {
    return jsonApiError('desde y hasta tienen que ser YYYY-MM-DD', 400)
  } else if (desdeQ > hastaQ) {
    return jsonApiError('desde no puede ser posterior a hasta', 400)
  } else if (diasEntre(desdeQ, hastaQ) > MAX_DAYS) {
    return jsonApiError('El rango no puede pasar de 120 días', 400)
  } else {
    desde = desdeQ
    hasta = hastaQ
  }

  let agenda: AgendaCargada
  try {
    agenda = await cargarAgendaCalendario({
      desde,
      hasta,
      marcasAcceso: cargado.miembro.marcasAcceso,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'No se pudo leer el calendario'
    return jsonApiError(message, 500)
  }

  const base = appBase()
  const eventos = agenda.eventos.map((e) => eventoJson(e, base))
  return NextResponse.json({
    ok: true,
    desde,
    hasta,
    hoy,
    total: eventos.length,
    grab_error: agenda.grabError,
    google_conectado: agenda.gcal.connected,
    eventos,
  })
}

function correosDe(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export async function POST(request: Request) {
  const auth = await resolveV1Actor(request)
  if ('response' in auth) return auth.response
  if (!deviceScopeAllows(auth.actor, OWNER_SCOPE)) {
    return jsonApiError(OWNER_MSG, 403)
  }
  const cargado = await cargarMiembroV1(auth.actor)
  if ('response' in cargado) return cargado.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonApiError('Body JSON inválido', 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonApiError('Body JSON inválido', 400)
  }
  const input = body as Record<string, unknown>
  const permitidos = new Set([
    'tipo', 'marca_slug', 'marca', 'fecha', 'hora',
    'duration_min', 'duracion_min', 'titulo',
    'correos', 'invitados', 'guardar_correos', 'correos_guardar',
  ])
  for (const key of Object.keys(input)) {
    if (!permitidos.has(key)) return jsonApiError(`Campo no permitido: ${key}`, 400)
  }

  const tipoRaw = typeof input.tipo === 'string' ? input.tipo.trim().toLowerCase() : 'reunion'
  if (tipoRaw !== 'reunion' && tipoRaw !== 'grabacion') {
    return jsonApiError('tipo tiene que ser "reunion" o "grabacion"', 400)
  }
  const tipo = tipoRaw

  if (!cargado.miembro.esDirector) {
    const error = tipo === 'grabacion'
      ? 'Solo los directores pueden agendar grabaciones.'
      : 'Solo los directores pueden agendar reuniones.'
    return jsonApiError(error, 403)
  }

  const fecha = typeof input.fecha === 'string' ? input.fecha.trim().slice(0, 10) : ''
  if (!esYmd(fecha)) return jsonApiError('fecha tiene que ser YYYY-MM-DD', 400)
  const hora = normalizarHoraAgenda(input.hora)
  if (!hora) return jsonApiError('hora tiene que ser HH:MM (24h) o 10am', 400)

  const durationRaw = input.duration_min ?? input.duracion_min
  const durationMin = durationRaw == null || durationRaw === ''
    ? 0
    : Number(durationRaw)
  if (!Number.isFinite(durationMin) || durationMin < 0) {
    return jsonApiError('duration_min tiene que ser un número de minutos', 400)
  }

  const titulo = typeof input.titulo === 'string' ? input.titulo : ''
  const slugRaw = (typeof input.marca_slug === 'string' && input.marca_slug.trim())
    || (typeof input.marca === 'string' && input.marca.trim())
    || ''
  if (!slugRaw) return jsonApiError('Falta marca_slug', 400)
  const marcaSlug = slugRaw.toLowerCase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any
  try {
    service = createServiceClient()
  } catch {
    return jsonApiError('Falta SUPABASE_SERVICE_ROLE_KEY', 500)
  }
  const { data: marca, error: marcaError } = await service
    .from('marcas')
    .select('id, slug, nombre, correos_clientes')
    .eq('slug', marcaSlug)
    .maybeSingle()
  if (marcaError) return jsonApiError(marcaError.message, 500)
  if (!marca) return jsonApiError(`Marca '${marcaSlug}' no encontrada`, 404)

  if (tipo === 'grabacion') {
    const extra = correosDe(input.invitados ?? input.correos)
    const r = await ejecutarAgendarGrabacion({
      marcaSlug: marca.slug as string,
      fecha,
      hora,
      durationMin,
      titulo,
      invitados: extra,
    })
    if (!r.ok) return jsonApiError(r.error, statusDeAgenda(r.error))
    return NextResponse.json({
      ok: true,
      tipo: 'grabacion',
      id: r.id,
      gcalSynced: r.gcalSynced,
      meetLink: r.meetLink,
    })
  }

  const correosPedidos = input.correos != null ? correosDe(input.correos) : correosDe(marca.correos_clientes)
  const guardar = correosDe(input.correos_guardar)
  const r = await ejecutarAgendarReunion({
    marcaId: marca.id as string,
    marcaNombre: (marca.nombre as string) ?? marcaSlug,
    fecha,
    hora,
    durationMin,
    titulo,
    correos: correosPedidos,
    correosGuardar: input.correos_guardar != null ? guardar : correosPedidos,
    guardarCorreos: input.guardar_correos === true,
  })
  if (!r.ok) return jsonApiError(r.error, statusDeAgenda(r.error))
  return NextResponse.json({
    ok: true,
    tipo: 'reunion',
    meetLink: r.meetLink,
    invitados: r.invitados,
  })
}
