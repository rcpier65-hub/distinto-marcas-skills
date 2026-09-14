import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual, createHash } from 'node:crypto'
import { getValidAccessToken } from '@/lib/integrations/google-calendar'
import { generateSlots, type Settings, type Busy } from './slots'

export class BookingError extends Error {
  constructor(message: string, public status = 503) { super(message) }
}
export const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(8000) }) },
})
export async function settings(): Promise<Settings> {
  const { data, error } = await db().from('booking_settings').select('*').eq('id', 1).single()
  if (error || !data) throw new BookingError('La agenda no está disponible en este momento. Intenta nuevamente en unos minutos.')
  return data
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const hash = createHash('sha256').update(key).digest('hex')
  const { data, error } = await db().rpc('booking_rate_limit', { p_key: hash, p_limit: limit, p_seconds: seconds })
  if (error) {
    if (process.env.NODE_ENV === 'development') console.error('booking-rate', error.code, error.message)
    throw new BookingError('No pudimos comprobar la solicitud. Intenta más tarde.')
  }
  if (!data) throw new BookingError('Has realizado varias solicitudes. Espera unos minutos para continuar.', 429)
}
function mac(value: string) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update('distinto-booking:' + value).digest('hex')
}
export function signSlot(start: string, duration: number) {
  const value = `${start}|${duration}|${Date.now() + 600000}`
  return Buffer.from(value).toString('base64url') + '.' + mac(value)
}
export function checkSlot(token: string, start: string, duration: number) {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false
  const value = Buffer.from(encoded, 'base64url').toString()
  const [s, d, expiry] = value.split('|')
  return s === start && Number(d) === duration && Number(expiry) > Date.now()
    && timingSafeEqual(Buffer.from(signature), Buffer.from(mac(value)))
}
const API = 'https://www.googleapis.com/calendar/v3'
export async function google(path: string, init: RequestInit = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const token = await Promise.race([
    getValidAccessToken(),
    new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 10000) }),
  ]).finally(() => clearTimeout(timer))
  if (!token) throw new BookingError('La conexión con la agenda necesita atención. Intenta más tarde.')
  return fetch(API + path, { ...init, cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } })
}
export async function busyTimes(from: string, to: string, config: Settings, excludeId?: string): Promise<Busy[]> {
  // Reflect cancellations/reschedules made directly in Google before DB collision checks.
  const stored = await db().from('web_bookings').select('*').eq('status', 'confirmed').lt('starts_at', to).gt('ends_at', from).limit(200)
  if (stored.error) throw new BookingError('No pudimos comprobar las reservas existentes.')
  for (const row of stored.data ?? []) {
    const res = await google(`/calendars/${encodeURIComponent(row.calendar_id)}/events/${row.google_event_id}`)
    if (res.status === 404 || res.status === 410) {
      const updated = await db().from('web_bookings').update({ status: 'cancelled' }).eq('id', row.id)
      if (updated.error) throw new BookingError('No pudimos actualizar la disponibilidad.')
      continue
    }
    if (!res.ok) throw new BookingError('No pudimos comprobar una reserva con Google.')
    const event = await res.json()
    const patch = event.status === 'cancelled' ? { status: 'cancelled' } : {
      starts_at: event.start?.dateTime || event.start?.date + 'T00:00:00-05:00',
      ends_at: event.end?.dateTime || event.end?.date + 'T00:00:00-05:00',
      meet_link: event.hangoutLink || row.meet_link,
    }
    const updated = await db().from('web_bookings').update(patch).eq('id', row.id)
    if (updated.error) throw new BookingError('La agenda requiere revisar un cambio de horario. Intenta más tarde.')
  }
  // The existing calendar.events grant permits events.list. Do not require
  // calendarList/freeBusy scopes merely to read the calendars used by the app.
  const linked = await db().from('google_oauth_tokens').select('calendar_id').eq('id', 1).maybeSingle()
  if (linked.error) throw new BookingError('No pudimos identificar el calendario conectado.')
  const ids = new Set(['primary', config.calendar_id, linked.data?.calendar_id].filter(Boolean) as string[])
  const busy: Busy[] = []
  for (const id of ids) {
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams({ timeMin: from, timeMax: to, singleEvents: 'true', maxResults: '2500', timeZone: 'America/Lima', fields: 'nextPageToken,items(status,transparency,start,end)' })
      if (pageToken) params.set('pageToken', pageToken)
      const res = await google('/calendars/' + encodeURIComponent(id) + '/events?' + params)
      if (!res.ok) throw new BookingError('No pudimos sincronizar tu disponibilidad. Intenta de nuevo.')
      const data = await res.json()
      for (const event of data.items ?? []) {
        if (event.status === 'cancelled' || event.transparency === 'transparent') continue
        const start = event.start?.dateTime || (event.start?.date ? event.start.date + 'T00:00:00-05:00' : null)
        const end = event.end?.dateTime || (event.end?.date ? event.end.date + 'T00:00:00-05:00' : null)
        if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) throw new BookingError('No pudimos verificar un evento de la agenda.')
        busy.push({ start, end })
      }
      pageToken = data.nextPageToken
    } while (pageToken)
  }
  const service = db()
  let query = service.from('web_bookings').select('starts_at,ends_at').in('status', ['pending','confirmed','review']).lt('starts_at', to).gt('ends_at', from)
  if (excludeId) query = query.neq('id', excludeId)
  const [web, meetings, recordings] = await Promise.all([
    query,
    service.from('marca_reuniones').select('fecha_hora,estado').gte('fecha_hora', new Date(Date.parse(from) - 86400000).toISOString()).lt('fecha_hora', to),
    service.from('grabaciones').select('fecha_planeada,hora_planeada,estado').gte('fecha_planeada', from.slice(0,10)).lte('fecha_planeada', to.slice(0,10)),
  ])
  if (web.error || meetings.error || recordings.error) throw new BookingError('No pudimos comprobar la agenda interna. Intenta más tarde.')
  busy.push(...(web.data ?? []).map(r => ({ start: r.starts_at, end: r.ends_at })))
  for (const r of meetings.data ?? []) if (r.estado !== 'cancelada') busy.push({ start: r.fecha_hora, end: new Date(Date.parse(r.fecha_hora) + 60 * 60000).toISOString() })
  for (const r of recordings.data ?? []) if (!['cancelada', 'cancelado'].includes(r.estado)) {
    const start = `${r.fecha_planeada}T${r.hora_planeada || '00:00:00'}-05:00`
    const end = new Date(Date.parse(start) + (r.hora_planeada ? 120 : 1440) * 60000).toISOString()
    busy.push({ start, end })
  }
  return busy
}
export async function daySlots(date: string, config: Settings, excludeId?: string) {
  const busy = await busyTimes(date + 'T00:00:00-05:00', date + 'T23:59:59-05:00', config, excludeId)
  return generateSlots(date, config, busy)
}
export type Booking = { id: string; request_hash: string; nombre: string; email: string; empresa: string; motivo: string; starts_at: string; ends_at: string; status: string; google_event_id: string; calendar_id: string; meet_link: string | null }
export async function syncBooking(row: Booking, options: { sendInvitations?: boolean } = {}) {
  const path = `/calendars/${encodeURIComponent(row.calendar_id)}/events`
  // Deterministic event ID prevents duplicates even after server/network failures.
  let res = await google(path + '/' + row.google_event_id)
  if (res.status === 404) {
    const config = await settings()
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(row.starts_at))
    const slots = await daySlots(day, config, row.id)
    if (!slots.includes(new Date(row.starts_at).toISOString())) {
      await db().from('web_bookings').update({ status: 'cancelled' }).eq('id', row.id)
      throw new BookingError('El horario dejó de estar disponible. Selecciona otro.', 409)
    }
    const sendInvitations = options.sendInvitations !== false
    res = await google(path + '?conferenceDataVersion=1&sendUpdates=' + (sendInvitations ? 'all' : 'none'), { method: 'POST', body: JSON.stringify({
      id: row.google_event_id,
      summary: `Diagnóstico Distinto · ${row.empresa || row.nombre}`,
      description: `Reserva desde distintostudio.com\nNombre: ${row.nombre}\nEmpresa: ${row.empresa}\nMotivo: ${row.motivo}`,
      start: { dateTime: row.starts_at, timeZone: 'America/Lima' },
      end: { dateTime: row.ends_at, timeZone: 'America/Lima' },
      attendees: sendInvitations ? [{ email: row.email, displayName: row.nombre }] : [],
      conferenceData: { createRequest: { requestId: row.id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      extendedProperties: { private: { distintoBooking: row.id } },
    }) })
    if (res.status === 409) res = await google(path + '/' + row.google_event_id)
  }
  if (!res.ok) throw new BookingError('Estamos verificando tu reserva. Pulsa confirmar nuevamente para consultar su estado sin duplicarla.', 202)
  const event = await res.json()
  if (event.status === 'cancelled') {
    await db().from('web_bookings').update({ status: 'cancelled' }).eq('id', row.id)
    throw new BookingError('Esta reserva fue cancelada. Selecciona otro horario.', 409)
  }
  const link = event.hangoutLink || event.conferenceData?.entryPoints?.find((e: { entryPointType: string }) => e.entryPointType === 'video')?.uri || null
  const { error } = await db().from('web_bookings').update({ status: 'confirmed', meet_link: link }).eq('id', row.id)
  if (error) throw new BookingError('Estamos verificando la confirmación. Pulsa nuevamente sin cambiar tus datos.', 202)
  return { ok: true, id: row.id, start: row.starts_at, end: row.ends_at, meetLink: link }
}
