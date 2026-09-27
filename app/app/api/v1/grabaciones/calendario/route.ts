// GET /api/v1/grabaciones/calendario
//   ?desde=YYYY-MM-DD   (opcional; default = mes actual en Lima)
//   ?hasta=YYYY-MM-DD
//
// POST /api/v1/grabaciones/calendario
//   { titulo, fecha:YYYY-MM-DD, hora:HH:MM, tipo?: "reunion"|"evento",
//     marca_slug?, duration_min?, notas?, meet?: boolean }
//   Crea reunión/evento en Distinto (marca_reuniones) + Google Calendar
//   (sync agency → Mac). Auth owner. No escribe EventKit en el Mac.
//
// Listado: grabaciones + reuniones del rango (mismo filtro de marcas).
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { formatHora12 } from '@/lib/utils/format-hora'
import { colorDeMarca } from '@/lib/marcas/branding'
import { appBase, daysBetweenYmd, isYmd, limaParts, monthBoundsLima, ymdLima } from '@/lib/api/lima'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'
import { createReunionEvent, createTimedEvent } from '@/lib/integrations/google-calendar'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const MAX_DAYS = 120

type MarcaJson = {
  slug: string
  nombre: string
  emoji: string | null
  color: string
} | null

type EventoJson = {
  id: string
  tipo: 'grabacion' | 'reunion'
  fecha: string
  hora: string | null
  hora12: string | null
  titulo: string
  estado: string
  notas: string | null
  videos_grabados: number | null
  marca: MarcaJson
  link: string
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function nota(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed
}

function horaCorta(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 4) return null
  const slice = value.slice(0, 5)
  return /^\d{2}:\d{2}$/.test(slice) ? slice : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function marcaDe(row: any, preferCalendarColor: boolean): MarcaJson {
  const marca = one(row.marca ?? row.marcas)
  const slug = typeof marca?.slug === 'string' ? marca.slug : null
  if (!slug) return null
  const nombre = typeof marca.nombre === 'string' && marca.nombre.trim() ? marca.nombre.trim() : slug
  const calendar = typeof marca.color_calendario === 'string' ? marca.color_calendario.trim() : ''
  const primario = typeof marca.color_primario_hex === 'string' ? marca.color_primario_hex : null
  const color = preferCalendarColor && calendar ? calendar : colorDeMarca(slug, primario || calendar || null)
  return {
    slug,
    nombre,
    emoji: typeof marca.emoji_marca === 'string' ? marca.emoji_marca : null,
    color,
  }
}

function visible(marcaId: unknown, acceso: string[] | null): boolean {
  if (acceso === null) return true
  return typeof marcaId === 'string' && acceso.includes(marcaId)
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  if (!member.puedePublicaciones) {
    return apiJsonError('No tienes acceso al calendario', 403)
  }

  const url = new URL(request.url)
  const desdeQ = url.searchParams.get('desde')
  const hastaQ = url.searchParams.get('hasta')
  const hoy = ymdLima()
  const mes = monthBoundsLima(hoy)
  let desde = mes.desde
  let hasta = mes.hasta
  if (desdeQ || hastaQ) {
    if (!isYmd(desdeQ) || !isYmd(hastaQ)) {
      return apiJsonError('desde y hasta tienen que ser YYYY-MM-DD', 400)
    }
    if (desdeQ > hastaQ) return apiJsonError('desde no puede ser posterior a hasta', 400)
    if (daysBetweenYmd(desdeQ, hastaQ) > MAX_DAYS) {
      return apiJsonError('El rango no puede pasar de 120 días', 400)
    }
    desde = desdeQ
    hasta = hastaQ
  }

  if (member.marcasAcceso && member.marcasAcceso.length === 0) {
    return NextResponse.json({ ok: true, desde, hasta, hoy, total: 0, eventos: [] })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const eventos: EventoJson[] = []
  const base = appBase()

  const grabCols = [
    'id, marca_id, fecha_planeada, hora_planeada, estado, notas, videos_grabados, marca:marcas(slug, nombre, emoji_marca, color_primario_hex, color_calendario)',
    'id, marca_id, fecha_planeada, hora_planeada, estado, notas, videos_grabados, marca:marcas(slug, nombre, emoji_marca, color_primario_hex)',
  ]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let grabRows: any[] | null = null
  let grabError: string | null = null
  for (const cols of grabCols) {
    let query = service
      .from('grabaciones')
      .select(cols)
      .gte('fecha_planeada', desde)
      .lte('fecha_planeada', hasta)
      .order('fecha_planeada', { ascending: true })
      .limit(300)
    if (member.marcasAcceso) query = query.in('marca_id', member.marcasAcceso)
    const res = await query
    if (!res.error) {
      grabRows = res.data ?? []
      grabError = null
      break
    }
    const message = typeof res.error.message === 'string' && res.error.message ? res.error.message : 'Error'
    grabError = message
    if (!/color_calendario|schema cache|42703/i.test(message)) break
  }
  if (grabError && !/does not exist|schema cache|PGRST205/i.test(grabError)) {
    return apiJsonError(grabError, 500)
  }

  for (const row of grabRows ?? []) {
    if (!visible(row.marca_id, member.marcasAcceso)) continue
    const fecha = typeof row.fecha_planeada === 'string' ? row.fecha_planeada.slice(0, 10) : ''
    if (!isYmd(fecha)) continue
    const marca = marcaDe(row, true)
    const hora = horaCorta(row.hora_planeada)
    const estado = typeof row.estado === 'string' && row.estado.trim() ? row.estado.trim() : 'planeada'
    eventos.push({
      id: String(row.id),
      tipo: 'grabacion',
      fecha,
      hora,
      hora12: hora ? formatHora12(hora) : null,
      titulo: `Grabación · ${marca?.nombre ?? 'Marca'}`,
      estado,
      notas: nota(row.notas),
      videos_grabados: typeof row.videos_grabados === 'number' ? row.videos_grabados : null,
      marca,
      link: `${base}/grabaciones/calendario?vista=dia&desde=${fecha}&hasta=${fecha}`,
    })
  }

  const reunionCols = [
    'id, marca_id, titulo, fecha_hora, notas, estado, marca:marcas(slug, nombre, emoji_marca, color_primario_hex, color_calendario)',
    'id, marca_id, titulo, fecha_hora, notas, marca:marcas(slug, nombre, emoji_marca, color_primario_hex)',
  ]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reunionRows: any[] = []
  for (const cols of reunionCols) {
    let query = service
      .from('marca_reuniones')
      .select(cols)
      .gte('fecha_hora', `${desde}T00:00:00-05:00`)
      .lte('fecha_hora', `${hasta}T23:59:59-05:00`)
      .order('fecha_hora', { ascending: true })
      .limit(300)
    if (member.marcasAcceso) query = query.in('marca_id', member.marcasAcceso)
    const res = await query
    if (!res.error) {
      reunionRows = res.data ?? []
      break
    }
    const message = typeof res.error.message === 'string' ? res.error.message : ''
    const retryable = /estado|color_calendario|42703/i.test(message)
    const missingTable = /does not exist|schema cache|PGRST205/i.test(message)
    if (missingTable && !retryable) break
    if (!retryable) return apiJsonError(message || 'No se pudieron leer las reuniones', 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of reunionRows as any[]) {
    if (!visible(row.marca_id, member.marcasAcceso)) continue
    if (typeof row.fecha_hora !== 'string') continue
    const parts = limaParts(row.fecha_hora)
    if (!isYmd(parts.ymd)) continue
    const marca = marcaDe(row, true)
    const titulo = typeof row.titulo === 'string' && row.titulo.trim() ? row.titulo.trim() : 'Reunión'
    const estado = typeof row.estado === 'string' && row.estado.trim() ? row.estado.trim() : 'agendada'
    eventos.push({
      id: String(row.id),
      tipo: 'reunion',
      fecha: parts.ymd,
      hora: parts.hm,
      hora12: parts.hm ? formatHora12(parts.hm) : null,
      titulo,
      estado,
      notas: nota(row.notas),
      videos_grabados: null,
      marca,
      link: `${base}/grabaciones/calendario?vista=dia&desde=${parts.ymd}&hasta=${parts.ymd}`,
    })
  }

  eventos.sort((a, b) => {
    const byDate = a.fecha.localeCompare(b.fecha)
    if (byDate !== 0) return byDate
    return (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99')
  })

  return NextResponse.json({
    ok: true,
    desde,
    hasta,
    hoy,
    total: eventos.length,
    eventos,
  })
}


// ─── POST: crear evento / reunión (owner) ───────────────────────────────────

function horaValida(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value.slice(0, 5))
}

function parseHora(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) {
    if (/^\d{2}:\d{2}$/.test(t.slice(0, 5))) return t.slice(0, 5)
    return null
  }
  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const ampm = (m[3] ?? '').toLowerCase()
  if (ampm === 'pm' && h < 12) h += 12
  if (ampm === 'am' && h === 12) h = 0
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export async function POST(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  if (!member.puedePublicaciones || !member.puedeEditarPublicaciones) {
    return apiJsonError('No tienes permiso para crear eventos en el calendario', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJsonError('Body JSON inválido', 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return apiJsonError('Body JSON inválido', 400)
  }
  const input = body as Record<string, unknown>
  const permitidos = new Set([
    'titulo', 'fecha', 'hora', 'tipo', 'marca_slug', 'marca',
    'duration_min', 'duracion_min', 'notas', 'meet', 'enviar_invitacion',
  ])
  for (const key of Object.keys(input)) {
    if (!permitidos.has(key)) return apiJsonError(`Campo no permitido: ${key}`, 400)
  }

  const tituloRaw = typeof input.titulo === 'string' ? input.titulo.trim() : ''
  const fecha = typeof input.fecha === 'string' ? input.fecha.trim().slice(0, 10) : ''
  if (!isYmd(fecha)) return apiJsonError('fecha tiene que ser YYYY-MM-DD', 400)
  const hora = parseHora(input.hora)
  if (!hora) return apiJsonError('hora tiene que ser HH:MM (24h) o 10am', 400)

  const tipoRaw = typeof input.tipo === 'string' ? input.tipo.trim().toLowerCase() : 'evento'
  const tipo = tipoRaw === 'reunion' || tipoRaw === 'reunión' ? 'reunion' : 'evento'
  const durationMin = Math.max(
    15,
    Math.min(
      480,
      Number(input.duration_min ?? input.duracion_min ?? (tipo === 'reunion' ? 45 : 60)) || 60,
    ),
  )
  const notas = typeof input.notas === 'string' && input.notas.trim() ? input.notas.trim().slice(0, 2000) : null
  const wantMeet = input.meet === true || tipo === 'reunion'
  const enviarInvitacion = input.enviar_invitacion === true

  const marcaSlugRaw =
    (typeof input.marca_slug === 'string' && input.marca_slug.trim()) ||
    (typeof input.marca === 'string' && input.marca.trim()) ||
    ''
  const marcaSlug = marcaSlugRaw
    ? marcaSlugRaw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let marcaId: string | null = null
  let marcaNombre: string | null = null
  let attendees: string[] = []
  if (marcaSlug) {
    const { data: marca, error } = await service
      .from('marcas')
      .select('id, slug, nombre, correos_clientes')
      .eq('slug', marcaSlug)
      .maybeSingle()
    if (error) return apiJsonError(error.message, 500)
    if (!marca) return apiJsonError(`Marca «${marcaSlug}» no encontrada`, 404)
    if (member.marcasAcceso && !member.marcasAcceso.includes(marca.id)) {
      return apiJsonError('No tienes acceso a esa marca', 403)
    }
    marcaId = marca.id as string
    marcaNombre = typeof marca.nombre === 'string' ? marca.nombre : marcaSlug
    attendees = (Array.isArray(marca.correos_clientes) ? marca.correos_clientes : [])
      .map((e: unknown) => String(e).trim().toLowerCase())
      .filter((e: string) => /@/.test(e))
  }

  const titulo =
    tituloRaw ||
    (tipo === 'reunion'
      ? `Reunión${marcaNombre ? ` · ${marcaNombre}` : ''}`
      : `Evento${marcaNombre ? ` · ${marcaNombre}` : ''} Distinto`)

  let googleEventId: string | null = null
  let meetLink: string | null = null
  let gcalError: string | null = null

  if (wantMeet) {
    const gen = await createReunionEvent({
      summary: titulo,
      description: notas ?? undefined,
      fecha,
      hora,
      durationMin,
      attendees: enviarInvitacion ? attendees : [],
      enviarInvitacion,
    })
    if (gen.ok) {
      googleEventId = gen.eventId
      meetLink = gen.meetLink
    } else {
      gcalError = gen.error
    }
  } else {
    const gen = await createTimedEvent({
      summary: titulo,
      description: notas ?? undefined,
      fecha,
      hora,
      durationMin,
      attendees: enviarInvitacion ? attendees : undefined,
    })
    if (gen.ok) {
      googleEventId = gen.eventId
    } else {
      gcalError = gen.error
    }
  }

  if (!googleEventId && gcalError === 'not_connected') {
    return apiJsonError('Conecta Google Calendar en Distinto → Grabaciones primero', 503)
  }
  if (!googleEventId) {
    return apiJsonError(gcalError || 'No se pudo crear el evento en Google Calendar', 502)
  }

  const fechaHoraIso = new Date(`${fecha}T${hora}:00-05:00`).toISOString()
  const fila: Record<string, unknown> = {
    marca_id: marcaId,
    titulo,
    fecha_hora: fechaHoraIso,
    modalidad: wantMeet ? 'virtual' : 'otro',
    lugar_enlace: meetLink,
    notas,
    google_event_id: googleEventId,
    estado: 'agendada',
  }

  let reunionId: string | null = null
  let ins = await service.from('marca_reuniones').insert(fila).select('id').single()
  if (ins.error && /google_event_id|estado|modalidad|schema cache|42703|PGRST204/i.test(ins.error.message ?? '')) {
    const soft = { ...fila }
    for (const col of ['google_event_id', 'estado', 'modalidad', 'lugar_enlace', 'marca_id']) {
      if (ins.error.message?.includes(col) || /schema cache|42703|PGRST204/i.test(ins.error.message ?? '')) {
        // retry dropping optional cols gradually below
      }
    }
    for (const drop of ['google_event_id', 'estado', 'modalidad', 'lugar_enlace']) {
      const attempt = { ...soft }
      delete attempt[drop]
      if (!marcaId) delete attempt.marca_id
      ins = await service.from('marca_reuniones').insert(attempt).select('id').single()
      if (!ins.error) break
    }
  }
  if (ins.error && !marcaId) {
    // marca_id null may be rejected — still keep GCal event
    console.error('[calendario POST] insert marca_reuniones:', ins.error.message)
  } else if (ins.error) {
    console.error('[calendario POST] insert marca_reuniones:', ins.error.message)
  } else {
    reunionId = typeof ins.data?.id === 'string' ? ins.data.id : String(ins.data?.id ?? '')
  }

  revalidatePath('/grabaciones/calendario')
  revalidatePath('/inicio')

  const base = appBase()
  return NextResponse.json({
    ok: true,
    evento: {
      id: reunionId ?? googleEventId,
      tipo: tipo === 'reunion' ? 'reunion' : 'evento',
      fecha,
      hora,
      hora12: formatHora12(hora),
      titulo,
      estado: 'agendada',
      notas,
      marca: marcaSlug
        ? { slug: marcaSlug, nombre: marcaNombre ?? marcaSlug, emoji: null, color: colorDeMarca(marcaSlug, null) }
        : null,
      link: `${base}/grabaciones/calendario?vista=dia&desde=${fecha}&hasta=${fecha}`,
      google_event_id: googleEventId,
      meet_link: meetLink,
    },
    gcalError: null,
  })
}
