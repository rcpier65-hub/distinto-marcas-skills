// app/lib/publicaciones/gcal-sync.ts
//
// Sincroniza las PUBLICACIONES de una marca con Google Calendar.
// Pedro 31-ago-2026: "hay clientes que quieren que sus publicaciones también
// se pongan en su calendario". Cada publicación con fecha (de esta semana en
// adelante) se vuelve un evento de 6 a 8 pm con el nombre y los detalles;
// los correos del cliente van como invitados → el evento aparece en EL
// calendario del cliente (Google le manda la invitación).
//
// Idempotente: guarda gcal_pub_event_id por publicación — re-sincronizar
// ACTUALIZA los eventos existentes (fecha/título) en vez de duplicarlos.
// Columnas self-healing (sin migraciones): publicaciones.gcal_pub_event_id
// y marcas.sync_pubs_gcal.

import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { createTimedEvent, updateTimedCalendarEvent, getGoogleCalendarStatus } from '@/lib/integrations/google-calendar'

/* Horario fijo de publicación: SIEMPRE el rango de 6 a 8 pm (Pedro). */
const HORA_PUB = '18:00'
const DURACION_PUB_MIN = 120
/* Color 7 "peacock" (azul) en GCal — distinto del rojo de grabaciones. */
const PUB_COLOR_ID = '7'

async function ensurePubSyncCols(): Promise<void> {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT
  if (!dbUrl) throw new Error('SUPABASE_DB_URL no disponible en el runtime')
  const { Client } = await import('pg')
  const u = new URL(dbUrl)
  const client = new Client({
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    database: u.pathname.replace(/^\//, '') || 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
  })
  await client.connect()
  try {
    await client.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS gcal_pub_event_id text')
    await client.query('ALTER TABLE marcas ADD COLUMN IF NOT EXISTS sync_pubs_gcal boolean')
    try { await client.query("NOTIFY pgrst, 'reload schema'") } catch { /* best-effort */ }
  } finally {
    await client.end()
  }
}

/* Lunes de la semana actual en Lima (la sincronización arranca "de esta
   semana en adelante"). */
function lunesDeEstaSemanaLima(): string {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
  const d = new Date(hoy + 'T12:00:00Z')
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

function descripcionDe(p: {
  estado?: string | null; plataformas?: string[] | null; copy?: string | null; guion?: string | null
}): string {
  const partes: string[] = []
  if (p.plataformas?.length) partes.push(`Redes: ${p.plataformas.join(', ')}`)
  if (p.estado) partes.push(`Estado: ${p.estado}`)
  const detalle = (p.copy?.trim() || p.guion?.trim() || '').slice(0, 400)
  if (detalle) partes.push(`\n${detalle}`)
  partes.push('\n— Publicación programada · Agencia Distinto (ventana 6–8 pm)')
  return partes.join('\n')
}

export type SyncPubsResultado =
  | { ok: true; creadas: number; actualizadas: number; fallidas: number; total: number }
  | { ok: false; error: string }

export async function sincronizarPubsMarca(marcaSlug: string): Promise<SyncPubsResultado> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const status = await getGoogleCalendarStatus()
  if (!status.connected) {
    return { ok: false, error: 'Google Calendar no está conectado (Grabaciones → "Conectar Google Calendar").' }
  }

  let mres = await service.from('marcas').select('id, nombre, correos_clientes').eq('slug', marcaSlug).maybeSingle()
  if (mres.error && /correos_clientes/i.test(mres.error.message ?? '')) {
    mres = await service.from('marcas').select('id, nombre').eq('slug', marcaSlug).maybeSingle()
  }
  const marca = mres.data
  if (!marca) return { ok: false, error: `Marca '${marcaSlug}' no encontrada` }
  const correos = ((marca.correos_clientes ?? []) as string[])
    .map((c) => String(c).trim().toLowerCase())
    .filter((c) => /@.+\./.test(c))

  const lunes = lunesDeEstaSemanaLima()
  const COLS = 'id, nombre, estado, fecha_publicacion, plataformas, copy, guion, gcal_pub_event_id'
  let pres = await service
    .from('publicaciones')
    .select(COLS)
    .eq('marca_id', marca.id)
    .gte('fecha_publicacion', lunes)
    .order('fecha_publicacion', { ascending: true })
    .limit(100)
  if (pres.error && /gcal_pub_event_id|schema cache|42703/i.test(pres.error.message ?? '')) {
    try { await ensurePubSyncCols() } catch { /* reintento igual */ }
    pres = await service
      .from('publicaciones')
      .select(COLS)
      .eq('marca_id', marca.id)
      .gte('fecha_publicacion', lunes)
      .order('fecha_publicacion', { ascending: true })
      .limit(100)
  }
  if (pres.error) return { ok: false, error: pres.error.message }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubs = (pres.data ?? []) as any[]

  let creadas = 0
  let actualizadas = 0
  let fallidas = 0
  for (const p of pubs) {
    if (!p.fecha_publicacion) continue
    const summary = `📣 ${p.nombre ?? 'Publicación'} · ${marca.nombre}`
    const description = descripcionDe(p)
    try {
      if (p.gcal_pub_event_id) {
        const r = await updateTimedCalendarEvent(p.gcal_pub_event_id, {
          summary,
          description,
          fecha: p.fecha_publicacion,
          hora: HORA_PUB,
          durationMin: DURACION_PUB_MIN,
          colorId: PUB_COLOR_ID,
        })
        if (r.ok) actualizadas++
        else if (/404|not found/i.test(r.error)) {
          // El evento fue borrado en Google → crear uno nuevo.
          const c = await createTimedEvent({
            summary, description,
            fecha: p.fecha_publicacion, hora: HORA_PUB, durationMin: DURACION_PUB_MIN,
            colorId: PUB_COLOR_ID, attendees: correos,
          })
          if (c.ok) { creadas++; await service.from('publicaciones').update({ gcal_pub_event_id: c.eventId }).eq('id', p.id) }
          else fallidas++
        } else fallidas++
      } else {
        const c = await createTimedEvent({
          summary, description,
          fecha: p.fecha_publicacion, hora: HORA_PUB, durationMin: DURACION_PUB_MIN,
          colorId: PUB_COLOR_ID,
          /* Invitados = correos del cliente → el evento aparece en SU
             calendario y Google le manda la invitación. */
          attendees: correos,
        })
        if (c.ok) {
          creadas++
          const up = await service.from('publicaciones').update({ gcal_pub_event_id: c.eventId }).eq('id', p.id)
          if (up.error && /gcal_pub_event_id|schema cache|42703/i.test(up.error.message ?? '')) {
            try { await ensurePubSyncCols() } catch { /* noop */ }
            await service.from('publicaciones').update({ gcal_pub_event_id: c.eventId }).eq('id', p.id)
          }
        } else fallidas++
      }
    } catch { fallidas++ }
  }

  // Marcar la marca como sincronizada (flag para la UI).
  try {
    const f = await service.from('marcas').update({ sync_pubs_gcal: true }).eq('id', marca.id)
    if (f.error && /sync_pubs_gcal|schema cache|42703/i.test(f.error.message ?? '')) {
      try { await ensurePubSyncCols() } catch { /* noop */ }
      await service.from('marcas').update({ sync_pubs_gcal: true }).eq('id', marca.id)
    }
  } catch { /* noop */ }

  return { ok: true, creadas, actualizadas, fallidas, total: pubs.length }
}
