// GET /api/v1/grabaciones/calendario
//   ?desde=YYYY-MM-DD   (opcional; default = mes actual en Lima)
//   ?hasta=YYYY-MM-DD
//
// Agenda de solo lectura: grabaciones + reuniones del rango.
// Mismo permiso que /grabaciones/calendario (módulo publicaciones) y el
// mismo filtro de marcas. Los eventos de Google Calendar siguen solo en la web.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { formatHora12 } from '@/lib/utils/format-hora'
import { colorDeMarca } from '@/lib/marcas/branding'
import { appBase, daysBetweenYmd, isYmd, limaParts, monthBoundsLima, ymdLima } from '@/lib/api/lima'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

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
