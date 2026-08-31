// app/app/grabaciones/calendario/_actions.ts
'use server'

/* Actions del calendario unificado (Pedro 31-ago-2026, "100% sincronizado"):
   - vincularEventoGcal: un evento suelto del Google Calendar de Pedro se
     vincula a una marca como REUNIÓN o GRABACIÓN del sistema (guardando
     google_event_id para dedup y ediciones futuras).
   - editarReunionCal / eliminarReunionCal: editar fecha/hora o borrar una
     reunión desde el calendario — y reflejarlo en Google Calendar. */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { ensureReunionCols } from '@/lib/reuniones/db'
import { updateTimedCalendarEvent, deleteCalendarEvent, getCalendarEvent } from '@/lib/integrations/google-calendar'

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
  fecha: string; hora: string; titulo?: string
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
  const { error } = await service.from('marca_reuniones')
    .update({ titulo, fecha_hora: fechaHoraIso })
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
        durationMin: actual?.durationMin ?? 45,
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
