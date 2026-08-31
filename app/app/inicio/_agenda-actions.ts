// app/app/inicio/_agenda-actions.ts
'use server'

/* Asistente "Agendar reunión": el usuario escribe/dicta "agenda para Manrique
   mañana 10am" → interpretarAgenda parsea (marca + fecha + hora); tras confirmar,
   agendarReunion crea el evento en Google Calendar (con Meet + invitados) y
   Google MANDA la invitación por correo al cliente. Solo directores. Pedro 25-ago-2026. */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { parseAgenda } from '@/lib/reuniones/parse-agenda'
import { createReunionEvent, getGoogleCalendarStatus } from '@/lib/integrations/google-calendar'
import { enviarPushAClientesDeMarca } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

/* Solo directores/admin (Pedro, Erick, admin) pueden agendar. Sin team_member =
   dueño (Pedro) → permitido. */
async function esDirector(): Promise<boolean> {
  try {
    const p = await getCurrentMemberPermisos()
    if (!p) return true
    return p.member.rol_base === 'director' || p.member.rol_base === 'admin'
  } catch { return false }
}

export type AgendaPreview =
  | {
      ok: true
      marcaId: string
      marcaSlug: string
      marcaNombre: string
      marcaEmoji: string | null
      fecha: string          // YYYY-MM-DD
      hora: string           // HH:MM (24h)
      durationMin: number
      titulo: string
      correos: string[]      // correos configurados de la marca (puede venir vacío)
    }
  | { ok: false; error: string; falta?: 'marca' | 'fecha' | 'hora' }

export async function interpretarAgenda(texto: string): Promise<AgendaPreview> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden agendar reuniones.' }
  const t = (texto ?? '').trim()
  if (!t) return { ok: false, error: 'Escribe qué reunión agendar. Ej: "agenda para Manrique mañana 10am".' }

  const service = createServiceClient() as Service
  const { data: marcasRaw } = await service.from('marcas').select('id, slug, nombre, emoji_marca, correos_clientes')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasRaw ?? []) as any[]
  if (marcas.length === 0) return { ok: false, error: 'No hay marcas configuradas.' }

  const parsed = await parseAgenda(t, marcas.map((m) => ({ slug: m.slug, nombre: m.nombre })))
  if (!parsed.marcaSlug) return { ok: false, error: 'No identifiqué la marca. Escribe su nombre, ej: "agenda para Manrique…".', falta: 'marca' }
  const marca = marcas.find((m) => m.slug === parsed.marcaSlug)
  if (!marca) return { ok: false, error: 'No encontré esa marca.', falta: 'marca' }
  if (!parsed.fecha) return { ok: false, error: `¿Qué día? Ej: "agenda para ${marca.nombre} mañana 10am".`, falta: 'fecha' }
  if (!parsed.hora) return { ok: false, error: `¿A qué hora? Ej: "agenda para ${marca.nombre} el ${parsed.fecha} a las 10am".`, falta: 'hora' }

  return {
    ok: true,
    marcaId: marca.id as string,
    marcaSlug: marca.slug as string,
    marcaNombre: marca.nombre as string,
    marcaEmoji: (marca.emoji_marca ?? null) as string | null,
    fecha: parsed.fecha,
    hora: parsed.hora,
    durationMin: parsed.durationMin,
    titulo: parsed.titulo || `Reunión con ${marca.nombre}`,
    correos: ((marca.correos_clientes ?? []) as string[]).filter(Boolean),
  }
}

export async function agendarReunion(input: {
  marcaId: string
  marcaNombre: string
  fecha: string          // YYYY-MM-DD
  hora: string           // HH:MM
  durationMin: number
  titulo: string
  correos: string[]      // a quién invitar (Google les manda el correo)
  guardarCorreos?: boolean
  /* Si viene, al guardar en la marca se persiste SOLO esta sublista (los
     correos del CLIENTE) — así invitar al staff de Distinto o a un correo
     suelto no los mete como "correos del cliente". Pedro 31-ago-2026. */
  correosGuardar?: string[]
}): Promise<{ ok: true; meetLink: string | null; invitados: number } | { ok: false; error: string }> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden agendar reuniones.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: 'Fecha inválida.' }
  if (!/^\d{1,2}:\d{2}$/.test(input.hora)) return { ok: false, error: 'Hora inválida.' }

  const correos = [...new Set((input.correos ?? []).map((c) => c.trim().toLowerCase()).filter((c) => /@.+\./.test(c)))]

  const status = await getGoogleCalendarStatus()
  if (!status.connected) {
    return { ok: false, error: 'Google Calendar no está conectado. Conéctalo en Grabaciones → "Conectar Google Calendar".' }
  }

  // Crear el evento con hora + Google Meet + invitados. Si hay correos, Google
  // MANDA la invitación por correo (enviarInvitacion=true → sendUpdates=all).
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

  // Guardar la reunión en el sistema (aparece en el portal del cliente y en el
  // panel de reuniones de la marca). El Meet queda como lugar/enlace.
  const fechaHoraIso = new Date(`${input.fecha}T${input.hora}:00-05:00`).toISOString()
  try {
    /* supabase-js NO lanza en errores de BD — hay que mirar .error, si no un
       insert fallido (tabla/columna faltante) pasa desapercibido y la reunión
       existe en Google pero no en el sistema. */
    const ins = await service.from('marca_reuniones').insert({
      marca_id: input.marcaId,
      titulo: (input.titulo || 'Reunión').trim(),
      fecha_hora: fechaHoraIso,
      modalidad: 'virtual',
      lugar_enlace: gen.meetLink,
      notas: null,
    })
    if (ins.error) console.error('[agendarReunion] insert marca_reuniones falló:', ins.error.message)
  } catch { /* el evento ya se creó en Calendar igual */ }

  // Recordar los correos DEL CLIENTE en la marca para la próxima (si el
  // usuario lo pidió). correosGuardar acota la lista: staff/correos sueltos
  // invitados no se guardan como correos del cliente.
  const aGuardar = [...new Set((input.correosGuardar ?? input.correos ?? [])
    .map((c) => c.trim().toLowerCase()).filter((c) => /@.+\./.test(c)))]
  if (input.guardarCorreos && aGuardar.length > 0) {
    try { await service.from('marcas').update({ correos_clientes: aGuardar }).eq('id', input.marcaId) } catch { /* noop */ }
  }

  // Aviso push al cliente (además del correo de Google).
  try {
    await enviarPushAClientesDeMarca(input.marcaId, {
      title: '📅 Reunión agendada',
      body: `${(input.titulo || 'Reunión').trim()} · ${input.fecha} ${input.hora}`,
      url: '/cliente',
      tag: `reunion-${input.marcaId}-${input.fecha}`,
    })
  } catch { /* noop */ }

  revalidatePath('/inicio')
  // El asistente también vive en el calendario unificado — refrescarlo para
  // que la reunión recién agendada aparezca al toque.
  revalidatePath('/grabaciones/calendario')
  return { ok: true, meetLink: gen.meetLink, invitados: correos.length }
}
