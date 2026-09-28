// app/lib/calendario/agendar-web.ts
//
// Cuerpo de "Agendar reunión o grabación" (inicio/_agenda-actions.ts y el
// asistente del calendario). La página exige sesión + director antes de
// llamar; /api/v1 hace la misma comprobación con JWT o dst_live_ owner.

import 'server-only'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { createReunionEvent, getGoogleCalendarStatus } from '@/lib/integrations/google-calendar'
import { enviarPushAClientesDeMarca } from '@/lib/push/send'
import { persistirGrabacion } from '@/lib/grabaciones/persistir'
import { ensureReunionCols } from '@/lib/reuniones/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export type AgendarGrabacionInput = {
  marcaSlug: string
  fecha: string
  hora: string
  durationMin: number
  titulo: string
  invitados: string[]
}

export type AgendarReunionInput = {
  marcaId: string
  marcaNombre: string
  fecha: string
  hora: string
  durationMin: number
  titulo: string
  correos: string[]
  guardarCorreos?: boolean
  correosGuardar?: string[]
}

/* Crea una GRABACIÓN desde el asistente: queda en Grabaciones de la marca y
   en Google Calendar (persistirGrabacion ya invita a los correos de la marca). */
export async function ejecutarAgendarGrabacion(input: AgendarGrabacionInput): Promise<
  | { ok: true; id: string; gcalSynced: boolean; meetLink: string | null }
  | { ok: false; error: string }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: 'Fecha inválida.' }
  if (!/^\d{1,2}:\d{2}$/.test(input.hora)) return { ok: false, error: 'Hora inválida.' }
  const r = await persistirGrabacion({
    marca_slug: input.marcaSlug,
    titulo: input.titulo.trim() || undefined,
    fecha_planeada: input.fecha,
    hora_planeada: input.hora.padStart(5, '0'),
    duracion_min: input.durationMin > 0 ? input.durationMin : 120,
    invitados_emails: [...new Set(input.invitados.map((c) => c.trim().toLowerCase()).filter((c) => /@.+\./.test(c)))],
  })
  if (!r.ok) return { ok: false, error: r.error }
  revalidatePath('/inicio')
  revalidatePath('/grabaciones/calendario')
  revalidatePath('/grabaciones')
  return { ok: true, id: r.id, gcalSynced: r.gcalSynced, meetLink: r.meetLink }
}

export async function ejecutarAgendarReunion(input: AgendarReunionInput): Promise<
  { ok: true; meetLink: string | null; invitados: number } | { ok: false; error: string }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: 'Fecha inválida.' }
  if (!/^\d{1,2}:\d{2}$/.test(input.hora)) return { ok: false, error: 'Hora inválida.' }

  const correos = [...new Set((input.correos ?? []).map((c) => c.trim().toLowerCase()).filter((c) => /@.+\./.test(c)))]

  const status = await getGoogleCalendarStatus()
  if (!status.connected) {
    return { ok: false, error: 'Google Calendar no está conectado. Conéctalo en Grabaciones → "Conectar Google Calendar".' }
  }

  const gen = await createReunionEvent({
    summary: `📌 ${(input.titulo || 'Reunión').trim()}`,
    description: `Reunión agendada desde Agencia Distinto${input.marcaNombre ? ` · ${input.marcaNombre}` : ''}.`,
    fecha: input.fecha,
    hora: input.hora,
    durationMin: input.durationMin > 0 ? input.durationMin : 45,
    attendees: correos,
    enviarInvitacion: correos.length > 0,
  })
  if (!gen.ok) {
    return { ok: false, error: gen.error === 'not_connected' ? 'Conecta Google Calendar primero.' : gen.error }
  }

  const service = createServiceClient() as Service

  const fechaHoraIso = new Date(`${input.fecha}T${input.hora}:00-05:00`).toISOString()
  try {
    const fila = {
      marca_id: input.marcaId,
      titulo: (input.titulo || 'Reunión').trim(),
      fecha_hora: fechaHoraIso,
      modalidad: 'virtual',
      lugar_enlace: gen.meetLink,
      notas: null,
      google_event_id: gen.eventId,
      duracion_min: input.durationMin > 0 ? Math.round(input.durationMin) : 45,
    }
    let ins = await service.from('marca_reuniones').insert(fila)
    if (ins.error && /google_event_id|schema cache|42703/i.test(ins.error.message ?? '')) {
      try { await ensureReunionCols() } catch { /* reintento igual */ }
      ins = await service.from('marca_reuniones').insert(fila)
      if (ins.error) {
        const { google_event_id: _omit, ...sinCol } = fila
        void _omit
        ins = await service.from('marca_reuniones').insert(sinCol)
      }
    }
    if (ins.error) console.error('[agendarReunion] insert marca_reuniones falló:', ins.error.message)
  } catch { /* el evento ya se creó en Calendar igual */ }

  const aGuardar = [...new Set((input.correosGuardar ?? input.correos ?? [])
    .map((c) => c.trim().toLowerCase()).filter((c) => /@.+\./.test(c)))]
  if (input.guardarCorreos && aGuardar.length > 0) {
    try { await service.from('marcas').update({ correos_clientes: aGuardar }).eq('id', input.marcaId) } catch { /* noop */ }
  }

  try {
    await enviarPushAClientesDeMarca(input.marcaId, {
      title: '📅 Reunión agendada',
      body: `${(input.titulo || 'Reunión').trim()} · ${input.fecha} ${input.hora}`,
      url: '/cliente',
      tag: `reunion-${input.marcaId}-${input.fecha}`,
    })
  } catch { /* noop */ }

  revalidatePath('/inicio')
  revalidatePath('/grabaciones/calendario')
  return { ok: true, meetLink: gen.meetLink, invitados: correos.length }
}
