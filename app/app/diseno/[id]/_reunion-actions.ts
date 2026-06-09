// app/app/diseno/[id]/_reunion-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { createReunionEvent } from '@/lib/integrations/google-calendar'

/**
 * Crea las columnas reunion_event_id / reunion_meet_link si faltan (self-healing
 * con pg en el runtime de Vercel) y avisa a PostgREST que recargue su schema.
 */
async function ensureReunionColumns(): Promise<void> {
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
  })
  await client.connect()
  try {
    await client.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS reunion_event_id text')
    await client.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS reunion_meet_link text')
    await client.query("NOTIFY pgrst, 'reload schema'")
  } finally {
    await client.end()
  }
}

/**
 * Crea (o re-crea) la reunión de una tarea en Google Calendar: evento CON HORA,
 * con Google Meet y los invitados. Usa fecha_entrega como fecha y reunion_hora
 * como hora. Devuelve el link de Meet.
 */
export async function sincronizarReunion(
  taskId: string,
): Promise<{ ok: true; meetLink: string | null } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // SELECT * tolera columnas que aún no existan (reunion_event_id/meet_link).
  const { data: t, error } = await service
    .from('publicaciones')
    .select('*, marca:marcas(nombre)')
    .eq('id', taskId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!t) return { ok: false, error: 'Tarea no encontrada' }
  if (!t.fecha_entrega) return { ok: false, error: 'Falta la fecha de entrega (será la fecha de la reunión).' }
  if (!t.reunion_hora) return { ok: false, error: 'Falta la hora de la reunión.' }

  const marca = Array.isArray(t.marca) ? t.marca[0] : t.marca
  const gen = await createReunionEvent({
    summary: `📌 ${t.nombre}${marca?.nombre ? ` · ${marca.nombre}` : ''}`,
    description: (t.descripcion?.trim() || 'Reunión de revisión — Agencia Distinto.'),
    fecha: t.fecha_entrega,
    hora: t.reunion_hora,
    attendees: (t.invitados_emails ?? []) as string[],
  })
  if (!gen.ok) {
    return {
      ok: false,
      error: gen.error === 'not_connected'
        ? 'Conecta Google Calendar primero (Grabaciones → "Conectar Google Calendar").'
        : gen.error,
    }
  }

  // Guardar event id + meet link. Si faltan columnas, crearlas y reintentar.
  const doUpdate = () =>
    service.from('publicaciones')
      .update({ reunion_event_id: gen.eventId, reunion_meet_link: gen.meetLink })
      .eq('id', taskId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { error: upErr } = await doUpdate() as any
  if (upErr && (upErr.code === '42703' || /reunion_event_id|reunion_meet_link|column|schema cache/i.test(upErr.message ?? ''))) {
    try { await ensureReunionColumns() } catch { /* el evento ya se creó igual */ }
    ;({ error: upErr } = await doUpdate())
  }
  // Aunque falle el guardado, el evento YA se creó en Calendar → devolvemos el link.

  revalidatePath(`/diseno/${taskId}`)
  return { ok: true, meetLink: gen.meetLink }
}
