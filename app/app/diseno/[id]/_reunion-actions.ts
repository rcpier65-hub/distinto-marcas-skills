// app/app/diseno/[id]/_reunion-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { createReunionEvent, deleteCalendarEvent } from '@/lib/integrations/google-calendar'
import { ensureReunionCols } from '@/lib/reuniones/db'
import { enviarPushAClientesDeMarca } from '@/lib/push/send'

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
    .select('*, marca:marcas(id, nombre, correos_clientes)')
    .eq('id', taskId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!t) return { ok: false, error: 'Tarea no encontrada' }
  if (!t.fecha_entrega) return { ok: false, error: 'Falta la fecha de entrega (será la fecha de la reunión).' }
  if (!t.reunion_hora) return { ok: false, error: 'Falta la hora de la reunión.' }

  const marca = Array.isArray(t.marca) ? t.marca[0] : t.marca
  /* Contexto de MARCA automático: los correos del cliente guardados en la
     marca se suman a los invitados del form (dedup) — y Google les MANDA la
     invitación por correo (enviarInvitacion). Pedro 31-ago-2026: "la reunión
     de revisión debe tener el contexto de la marca... y mandar notificación
     a los clientes con sus correos". */
  const invitados = [...new Set(
    [...((marca?.correos_clientes ?? []) as string[]), ...((t.invitados_emails ?? []) as string[])]
      .map((c) => String(c).trim().toLowerCase())
      .filter((c) => /@.+\./.test(c)),
  )]

  /* Re-sync: el evento anterior se limpia DESPUÉS de crear el nuevo con
     éxito — si la creación falla a mitad, el evento viejo sigue vivo (nunca
     quedamos con la reunión cancelada por accidente). */
  const eventoAnterior: string | null = t.reunion_event_id ?? null

  const gen = await createReunionEvent({
    summary: `📌 ${t.nombre}${marca?.nombre ? ` · ${marca.nombre}` : ''}`,
    description: (t.descripcion?.trim() || 'Reunión de revisión — Agencia Distinto.'),
    fecha: t.fecha_entrega,
    hora: t.reunion_hora,
    attendees: invitados,
    enviarInvitacion: invitados.length > 0,
  })
  if (!gen.ok) {
    return {
      ok: false,
      error: gen.error === 'not_connected'
        ? 'Conecta Google Calendar primero (Grabaciones → "Conectar Google Calendar").'
        : gen.error,
    }
  }

  /* Nuevo evento creado OK → recién ahora borramos el anterior y su espejo
     para no dejar duplicados en Google Calendar. Best-effort. */
  if (eventoAnterior && eventoAnterior !== gen.eventId) {
    try { await deleteCalendarEvent(eventoAnterior) } catch { /* noop */ }
    try { await service.from('marca_reuniones').delete().eq('google_event_id', eventoAnterior) } catch { /* noop */ }
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

  /* Espejo en marca_reuniones: la reunión de revisión aparece en el
     calendario unificado como 🤝 de SU marca (editable desde ahí). */
  if (marca?.id) {
    try {
      const fila = {
        marca_id: marca.id,
        titulo: `Revisión · ${t.nombre}`.slice(0, 200),
        fecha_hora: new Date(`${t.fecha_entrega}T${String(t.reunion_hora).slice(0, 5)}:00-05:00`).toISOString(),
        modalidad: 'virtual',
        lugar_enlace: gen.meetLink,
        notas: null,
        google_event_id: gen.eventId,
      }
      let ins = await service.from('marca_reuniones').insert(fila)
      if (ins.error && /google_event_id|schema cache|42703/i.test(ins.error.message ?? '')) {
        try { await ensureReunionCols() } catch { /* reintento igual */ }
        ins = await service.from('marca_reuniones').insert(fila)
      }
      if (ins.error) console.error('[sincronizarReunion] espejo marca_reuniones falló:', ins.error.message)
    } catch { /* best-effort */ }

    // Push al cliente de la marca (además del correo que manda Google).
    try {
      await enviarPushAClientesDeMarca(marca.id, {
        title: '📅 Reunión de revisión agendada',
        body: `${t.nombre} · ${t.fecha_entrega} ${String(t.reunion_hora).slice(0, 5)}`,
        url: '/cliente',
        tag: `rev-${taskId}`,
      })
    } catch { /* noop */ }
  }

  revalidatePath(`/diseno/${taskId}`)
  revalidatePath('/grabaciones/calendario')
  return { ok: true, meetLink: gen.meetLink }
}
