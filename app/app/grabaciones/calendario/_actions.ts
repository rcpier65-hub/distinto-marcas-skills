// app/app/grabaciones/calendario/_actions.ts
'use server'

/* Actions del calendario unificado (Pedro 31-ago-2026, "100% sincronizado"):
   - vincularEventoGcal: un evento suelto del Google Calendar de Pedro se
     vincula a una marca como REUNIÓN o GRABACIÓN del sistema (guardando
     google_event_id para dedup y ediciones futuras).
   - editarReunionCal / eliminarReunionCal: editar fecha/hora o borrar una
     reunión desde el calendario — y reflejarlo en Google Calendar. */

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { sincronizarCalendario } from '@/lib/calendario/gcal-sync'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { ensureReunionCols } from '@/lib/reuniones/db'
import { updateTimedCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarEvent } from '@/lib/integrations/google-calendar'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
/* gcalError: la BD quedó bien pero Google Calendar NO se pudo actualizar —
   la UI avisa para que Pedro lo mueva a mano en Google. */
type Result = { ok: true; gcalError?: string } | { ok: false; error: string }

async function esDirector(): Promise<boolean> {
  try {
    const p = await getCurrentMemberPermisos()
    if (!p) return true
    return p.member.rol_base === 'director' || p.member.rol_base === 'admin'
  } catch { return false }
}

function refrescar() {
  revalidatePath('/grabaciones/calendario')
  revalidatePath('/grabaciones')
}

/**
 * Vincula un evento del Google Calendar de Pedro a una marca, creándolo en el
 * sistema como reunión (marca_reuniones) o grabación (grabaciones) con su
 * google_event_id — así deja de ser un evento "suelto" 🟦 y pasa a ser de la
 * marca, editable desde la app.
 */
export async function vincularEventoGcal(input: {
  gcalId: string
  titulo: string
  fecha: string          // YYYY-MM-DD
  hora: string | null    // HH:MM o null (día completo)
  meetLink: string | null
  marcaId: string
  tipo: 'reunion' | 'grabacion'
  duracionMin?: number | null  // duración real del evento en Google
}): Promise<Result> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden vincular eventos.' }
  if (!input.gcalId || !input.marcaId) return { ok: false, error: 'Faltan datos del evento o la marca.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: 'Fecha inválida.' }
  const hora = input.hora && /^\d{1,2}:\d{2}$/.test(input.hora) ? input.hora.padStart(5, '0') : null

  const service = createServiceClient() as Service
  const titulo = (input.titulo || 'Reunión').replace(/^[📌🎬🎥🤝]\s*/u, '').trim().slice(0, 200)

  if (input.tipo === 'grabacion') {
    /* grabaciones ya tiene google_event_id → las ediciones en "Por marca" se
       sincronizan solas con Google Calendar. Guardamos el TÍTULO y la
       DURACIÓN reales del evento para que la primera edición no los pise
       (mismo patrón defensivo OPCIONALES de createGrabacion: si migration
       028 no está, se podan las columnas extra). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fila: Record<string, any> = {
      marca_id: input.marcaId,
      fecha_planeada: input.fecha,
      hora_planeada: hora,
      estado: 'planeada',
      notas: null,
      google_event_id: input.gcalId,
      titulo,
      duracion_min: input.duracionMin && input.duracionMin > 0 ? Math.round(input.duracionMin) : 60,
      meet_link: input.meetLink,
    }
    let ins = await service.from('grabaciones').insert(fila)
    if (ins.error && (ins.error.code === '42703' || ins.error.code === 'PGRST204' || /titulo|duracion_min|meet_link|schema cache/i.test(ins.error.message ?? ''))) {
      const { titulo: _t, duracion_min: _d, meet_link: _m, ...base } = fila
      void _t; void _d; void _m
      ins = await service.from('grabaciones').insert(base)
    }
    if (ins.error) return { ok: false, error: ins.error.message }
    refrescar()
    return { ok: true }
  }

  // Reunión: fecha_hora en Lima (si el evento era de día completo, 09:00).
  const fechaHoraIso = new Date(`${input.fecha}T${hora ?? '09:00'}:00-05:00`).toISOString()
  const fila = {
    marca_id: input.marcaId,
    titulo,
    fecha_hora: fechaHoraIso,
    modalidad: 'virtual',
    lugar_enlace: input.meetLink,
    notas: null,
    google_event_id: input.gcalId,
    ...(input.duracionMin && input.duracionMin > 0 ? { duracion_min: Math.round(input.duracionMin) } : {}),
  }
  let ins = await service.from('marca_reuniones').insert(fila)
  if (ins.error && /google_event_id|schema cache|42703/i.test(ins.error.message ?? '')) {
    try { await ensureReunionCols() } catch { /* seguimos: reintento igual */ }
    ins = await service.from('marca_reuniones').insert(fila)
    if (ins.error) {
      // Último recurso: sin el mapeo (la reunión vale igual).
      const { google_event_id: _omit, ...sinCol } = fila
      void _omit
      ins = await service.from('marca_reuniones').insert(sinCol)
    }
  }
  if (ins.error) return { ok: false, error: ins.error.message }
  refrescar()
  return { ok: true }
}

/**
 * Edita fecha/hora (y opcionalmente título) de una reunión desde el
 * calendario. Si la reunión tiene google_event_id, actualiza también el
 * evento en Google Calendar (los invitados lo ven moverse solo).
 */
export async function editarReunionCal(id: string, input: {
  fecha: string; hora: string; titulo?: string; duracionMin?: number | null
}): Promise<Result> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden editar reuniones.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: 'Fecha inválida.' }
  if (!/^\d{1,2}:\d{2}$/.test(input.hora)) return { ok: false, error: 'Hora inválida.' }
  const hora = input.hora.padStart(5, '0')

  const service = createServiceClient() as Service
  let sel = await service.from('marca_reuniones').select('id, titulo, google_event_id').eq('id', id).maybeSingle()
  if (sel.error && /google_event_id/i.test(sel.error.message ?? '')) {
    sel = await service.from('marca_reuniones').select('id, titulo').eq('id', id).maybeSingle()
  }
  if (sel.error) return { ok: false, error: sel.error.message }
  if (!sel.data) return { ok: false, error: 'Esa reunión ya no existe.' }

  const titulo = (input.titulo ?? sel.data.titulo ?? 'Reunión').trim().slice(0, 200)
  const fechaHoraIso = new Date(`${input.fecha}T${hora}:00-05:00`).toISOString()
  const dur = input.duracionMin && input.duracionMin > 0 ? Math.max(5, Math.min(720, Math.round(input.duracionMin))) : null
  const { error } = await service.from('marca_reuniones')
    .update({ titulo, fecha_hora: fechaHoraIso, ...(dur ? { duracion_min: dur } : {}) })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  /* Reflejar en Google Calendar respetando lo que el evento YA tiene:
     duración real (no 45 min a la fuerza), título tal cual está en Google
     (solo cambia si el usuario editó el título) y su color. Si Google falla,
     devolvemos gcalError para que la UI avise el desync. */
  let gcalError: string | undefined
  if (sel.data.google_event_id) {
    try {
      const actual = await getCalendarEvent(sel.data.google_event_id)
      const summary = input.titulo !== undefined
        ? `📌 ${titulo}`
        : (actual?.summary || `📌 ${titulo}`)
      const g = await updateTimedCalendarEvent(sel.data.google_event_id, {
        summary,
        fecha: input.fecha,
        hora,
        durationMin: dur ?? actual?.durationMin ?? 45,
      })
      if (!g.ok) gcalError = g.error
    } catch (e) {
      gcalError = e instanceof Error ? e.message : 'error de red'
    }
  }

  refrescar()
  return { ok: true, gcalError }
}

/** Elimina una reunión (y su evento de Google Calendar si está mapeado). */
export async function eliminarReunionCal(id: string): Promise<Result> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden eliminar reuniones.' }

  const service = createServiceClient() as Service
  let sel = await service.from('marca_reuniones').select('id, google_event_id').eq('id', id).maybeSingle()
  if (sel.error && /google_event_id/i.test(sel.error.message ?? '')) {
    sel = await service.from('marca_reuniones').select('id').eq('id', id).maybeSingle()
  }
  /* Un error del SELECT (red, timeout) NO es "ya no existe" — sin esto se
     reportaba éxito sin borrar nada. */
  if (sel.error) return { ok: false, error: sel.error.message }
  if (!sel.data) { refrescar(); return { ok: true } }  // ya no existe de verdad

  const { error } = await service.from('marca_reuniones').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  let gcalError: string | undefined
  if (sel.data.google_event_id) {
    try {
      const g = await deleteCalendarEvent(sel.data.google_event_id)
      if (!g.ok) gcalError = g.error
    } catch (e) {
      gcalError = e instanceof Error ? e.message : 'error de red'
    }
  }

  refrescar()
  return { ok: true, gcalError }
}

/* ====== Eventos que viven SOLO en Google Calendar ======
   Pedro 24-sep-2026: "debo poder entrar al detalle y cambiar tal cual se hace
   en Google Calendar". Editan/borran el evento directo en Google (no hay fila
   en la app). Solo directores. */

const EVENT_ID = /^[a-zA-Z0-9_-]{5,1024}$/

export async function editarEventoGoogle(eventId: string, input: {
  titulo: string; fecha: string; hora: string | null; duracionMin?: number | null
}): Promise<Result> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden editar eventos de Google.' }
  if (!EVENT_ID.test(eventId)) return { ok: false, error: 'Evento inválido.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: 'Fecha inválida.' }
  const titulo = input.titulo.trim().slice(0, 300)
  if (!titulo) return { ok: false, error: 'Ponle un título.' }

  if (input.hora) {
    if (!/^\d{1,2}:\d{2}$/.test(input.hora)) return { ok: false, error: 'Hora inválida.' }
    const dur = Math.max(5, Math.min(24 * 60, Math.round(input.duracionMin ?? 60)))
    const g = await updateTimedCalendarEvent(eventId, { summary: titulo, fecha: input.fecha, hora: input.hora.padStart(5, '0'), durationMin: dur })
    if (!g.ok) return { ok: false, error: `Google Calendar: ${g.error}` }
  } else {
    const g = await updateCalendarEvent(eventId, { summary: titulo, date: input.fecha })
    if (!g.ok) return { ok: false, error: `Google Calendar: ${g.error}` }
  }
  refrescar()
  return { ok: true }
}

export async function eliminarEventoGoogle(eventId: string): Promise<Result> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden eliminar eventos de Google.' }
  if (!EVENT_ID.test(eventId)) return { ok: false, error: 'Evento inválido.' }
  const g = await deleteCalendarEvent(eventId)
  if (!g.ok) return { ok: false, error: `Google Calendar: ${g.error}` }
  refrescar()
  return { ok: true }
}

/* ====== Arrastrar en el calendario: publicaciones y fechas importantes ======
   Cambian solo la FECHA (la publicación mantiene su ventana 6–8 pm; la fecha
   importante es de día completo). Google Calendar se actualiza al instante con
   el sincronizador (lib/calendario/gcal-sync). Solo directores. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function syncGoogleYa() {
  after(() => sincronizarCalendario({ forzar: true }).catch((e) => console.error('[gcal-sync]', e)))
}

export async function moverPublicacion(id: string, fecha: string): Promise<Result> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden mover publicaciones.' }
  if (!UUID_RE.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: 'Datos inválidos.' }
  const service = createServiceClient() as Service
  const { error } = await service.from('publicaciones').update({ fecha_publicacion: fecha }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  syncGoogleYa()
  refrescar()
  return { ok: true }
}

export async function moverFechaImportante(id: string, fecha: string): Promise<Result> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden mover fechas importantes.' }
  if (!UUID_RE.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: 'Datos inválidos.' }
  const service = createServiceClient() as Service
  const { error } = await service.from('fechas_importantes').update({ fecha }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  syncGoogleYa()
  refrescar()
  revalidatePath('/fechas-importantes')
  return { ok: true }
}
