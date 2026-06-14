// app/lib/integrations/google-calendar.ts
//
// Cliente de Google Calendar via OAuth 2.0. Maneja:
//   - Generar el URL de autorización (consent screen)
//   - Intercambiar code → tokens (access + refresh)
//   - Refrescar el access_token cuando expira (usa refresh_token)
//   - CRUD de eventos (crear / actualizar / borrar)
//
// Los tokens viven en la tabla google_oauth_tokens (single row, id=1).
// El refresh_token es la "llave maestra" — con él generamos access_tokens
// nuevos indefinidamente sin pedirle permiso a Pedro otra vez.
//
// Env vars requeridas (Vercel):
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
//   GOOGLE_OAUTH_REDIRECT_URI (default: https://distinto-app.vercel.app/api/auth/google/callback)

import { createServiceClient } from '@/lib/supabase/service'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const CAL_API = 'https://www.googleapis.com/calendar/v3'

// Scope: gestionar eventos del calendario del usuario.
const SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'

function getRedirectUri(): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI
    ?? 'https://distinto-app.vercel.app/api/auth/google/callback'
}

function getClientCreds(): { id: string; secret: string } | null {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!id || !secret) return null
  return { id, secret }
}

/**
 * URL de autorización para mandar al usuario a la pantalla de consentimiento.
 * access_type=offline + prompt=consent garantiza que Google devuelva un
 * refresh_token (sin esto, en logins repetidos no lo manda).
 */
export function buildAuthUrl(state: string): string | null {
  const creds = getClientCreds()
  if (!creds) return null
  const params = new URLSearchParams({
    client_id: creds.id,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

/**
 * Intercambia el authorization code por access + refresh tokens.
 * Llamado desde el callback. Guarda todo en google_oauth_tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<
  { ok: true; email: string } | { ok: false; error: string }
> {
  const creds = getClientCreds()
  if (!creds) return { ok: false, error: 'GOOGLE_OAUTH_CLIENT_ID/SECRET no configurados' }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: creds.id,
      client_secret: creds.secret,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    return { ok: false, error: `Token exchange falló: ${data.error_description ?? data.error ?? res.status}` }
  }

  // data: { access_token, refresh_token, expires_in, scope, token_type }
  const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()

  // Obtener email del usuario (para mostrar "Conectado como X")
  let email = ''
  try {
    const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (ui.ok) email = (await ui.json()).email ?? ''
  } catch { /* email es nice-to-have */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service.from('google_oauth_tokens').upsert({
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token,  // solo viene en el primer consent
    expiry,
    scope: data.scope,
    email,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (error) return { ok: false, error: `Guardar tokens falló: ${error.message}` }
  return { ok: true, email }
}

/**
 * Devuelve un access_token válido. Si el guardado expiró, lo refresca con
 * el refresh_token y persiste el nuevo. Si no hay tokens, devuelve null
 * (significa "Google Calendar no conectado todavía").
 */
async function getValidAccessToken(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: row } = await service
    .from('google_oauth_tokens')
    .select('access_token, refresh_token, expiry')
    .eq('id', 1)
    .maybeSingle()

  if (!row?.refresh_token) return null

  // ¿Todavía válido? (margen de 60s)
  if (row.access_token && row.expiry && new Date(row.expiry).getTime() - 60_000 > Date.now()) {
    return row.access_token
  }

  // Refrescar
  const creds = getClientCreds()
  if (!creds) return null
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.id,
      client_secret: creds.secret,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('[gcal] refresh failed:', data)
    return null
  }
  const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()
  await service.from('google_oauth_tokens').update({
    access_token: data.access_token,
    expiry,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  return data.access_token
}

/**
 * ¿Está conectado Google Calendar? Devuelve el email conectado o null.
 */
export async function getGoogleCalendarStatus(): Promise<{ connected: boolean; email: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data } = await service
    .from('google_oauth_tokens')
    .select('refresh_token, email')
    .eq('id', 1)
    .maybeSingle()
  return { connected: Boolean(data?.refresh_token), email: data?.email ?? null }
}

type EventInput = {
  summary: string       // título del evento
  description?: string
  date: string          // YYYY-MM-DD (evento all-day)
  colorId?: string      // 1-11 colores de Google Calendar
}

export type TimedEventInput = {
  summary: string       // título
  description?: string
  fecha: string         // YYYY-MM-DD
  hora: string          // HH:MM (24h)
  durationMin?: number  // duración, default 60
  colorId?: string
}

/**
 * Crea un evento all-day. Devuelve el event_id de Google (para guardarlo
 * en grabaciones.google_event_id) o null si no está conectado / falla.
 */
export async function createCalendarEvent(input: EventInput): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  const token = await getValidAccessToken()
  if (!token) return { ok: false, error: 'not_connected' }

  // All-day event: end.date debe ser el día siguiente (Google es exclusive).
  const start = input.date
  const endDate = new Date(input.date + 'T00:00:00')
  endDate.setDate(endDate.getDate() + 1)
  const end = endDate.toISOString().slice(0, 10)

  const res = await fetch(`${CAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { date: start },
      end: { date: end },
      ...(input.colorId ? { colorId: input.colorId } : {}),
    }),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` }
  return { ok: true, eventId: data.id }
}

export type ReunionEventInput = {
  summary: string
  description?: string
  fecha: string          // YYYY-MM-DD (fecha de la reunión)
  hora: string           // HH:MM (24h)
  durationMin?: number   // duración, default 45
  attendees?: string[]   // emails de invitados (clientes)
}

/**
 * Crea un evento de REUNIÓN con hora + Google Meet + invitados. Devuelve el
 * eventId y el link de Meet generado. Timezone fijo America/Lima.
 * No envía emails automáticos (sendUpdates=none) — el link de Meet queda listo
 * para compartir; los invitados aparecen en el evento.
 */
export async function createReunionEvent(
  input: ReunionEventInput,
): Promise<{ ok: true; eventId: string; meetLink: string | null } | { ok: false; error: string }> {
  const token = await getValidAccessToken()
  if (!token) return { ok: false, error: 'not_connected' }

  const horaHM = input.hora.slice(0, 5)            // "HH:MM"
  const [hh, mm] = horaHM.split(':').map(Number)
  const dur = input.durationMin ?? 45

  // Calcular fin (con rollover de día si cruza medianoche).
  let endDate = input.fecha
  let totalEnd = hh * 60 + mm + dur
  if (totalEnd >= 1440) {
    const d = new Date(input.fecha + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    endDate = d.toISOString().slice(0, 10)
    totalEnd -= 1440
  }
  const endHH = String(Math.floor(totalEnd / 60)).padStart(2, '0')
  const endMM = String(totalEnd % 60).padStart(2, '0')

  const requestId = globalThis.crypto?.randomUUID?.() ?? `meet-${input.fecha}-${horaHM}`

  const res = await fetch(`${CAL_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: `${input.fecha}T${horaHM}:00`, timeZone: 'America/Lima' },
      end: { dateTime: `${endDate}T${endHH}:${endMM}:00`, timeZone: 'America/Lima' },
      attendees: (input.attendees ?? []).filter(Boolean).map((email) => ({ email })),
      conferenceData: {
        createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meetLink: string | null =
    data.hangoutLink ??
    data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ??
    null
  return { ok: true, eventId: data.id, meetLink }
}

/**
 * Crea un evento con HORA en GCal — NO all-day. SIN Google Meet ni invitados
 * (para eso usa createReunionEvent). Devuelve eventId para guardar en
 * grabaciones.google_event_id y poder hacer update/delete después.
 *
 * Timezone fijo America/Lima. Rollover de día si la duración cruza medianoche.
 */
export async function createTimedEvent(
  input: TimedEventInput,
): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  const token = await getValidAccessToken()
  if (!token) return { ok: false, error: 'not_connected' }

  const horaHM = input.hora.slice(0, 5)
  const [hh, mm] = horaHM.split(':').map(Number)
  const dur = input.durationMin ?? 60

  let endDate = input.fecha
  let totalEnd = hh * 60 + mm + dur
  if (totalEnd >= 1440) {
    const d = new Date(input.fecha + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    endDate = d.toISOString().slice(0, 10)
    totalEnd -= 1440
  }
  const endHH = String(Math.floor(totalEnd / 60)).padStart(2, '0')
  const endMM = String(totalEnd % 60).padStart(2, '0')

  const res = await fetch(`${CAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: `${input.fecha}T${horaHM}:00`, timeZone: 'America/Lima' },
      end: { dateTime: `${endDate}T${endHH}:${endMM}:00`, timeZone: 'America/Lima' },
      ...(input.colorId ? { colorId: input.colorId } : {}),
    }),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` }
  return { ok: true, eventId: data.id }
}

/**
 * Actualiza un evento existente (cambio de fecha o título).
 */
export async function updateCalendarEvent(eventId: string, input: EventInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = await getValidAccessToken()
  if (!token) return { ok: false, error: 'not_connected' }

  const start = input.date
  const endDate = new Date(input.date + 'T00:00:00')
  endDate.setDate(endDate.getDate() + 1)
  const end = endDate.toISOString().slice(0, 10)

  const res = await fetch(`${CAL_API}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { date: start },
      end: { date: end },
      ...(input.colorId ? { colorId: input.colorId } : {}),
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}

/**
 * Borra un evento. Idempotente: si ya no existe (404), lo tratamos como OK.
 */
export async function deleteCalendarEvent(eventId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = await getValidAccessToken()
  if (!token) return { ok: false, error: 'not_connected' }

  const res = await fetch(`${CAL_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    return { ok: false, error: `HTTP ${res.status}` }
  }
  return { ok: true }
}
