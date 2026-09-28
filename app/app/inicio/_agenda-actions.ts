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
import { createGrabacion } from '@/app/grabaciones/_actions'

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

export type MarcaAgenda = { id: string; slug: string; nombre: string; emoji: string | null; correos: string[] }

/* Lo que se entendió de la frase. La tarjeta de confirmación deja completar o
   corregir todo (tipo, marca, fecha, hora, duración) antes de agendar —
   Pedro 24-sep-2026: "grabación para el día 10 de octubre a las 11am" no dice
   la marca → ahora se elige en la tarjeta en vez de dar error. */
export type AgendaPreview =
  | {
      ok: true
      tipo: 'reunion' | 'grabacion'
      marcaId: string | null
      fecha: string | null   // YYYY-MM-DD
      hora: string | null    // HH:MM (24h)
      durationMin: number
      titulo: string         // '' = usar el título por defecto según tipo/marca
      marcas: MarcaAgenda[]
    }
  | { ok: false; error: string }

export async function interpretarAgenda(texto: string): Promise<AgendaPreview> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden agendar.' }
  const t = (texto ?? '').trim()
  if (!t) return { ok: false, error: 'Escribe qué agendar. Ej: "grabación con Kintu el 10 de octubre a las 11am".' }

  const service = createServiceClient() as Service
  const { data: marcasRaw } = await service.from('marcas').select('id, slug, nombre, emoji_marca, correos_clientes').order('nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasRaw ?? []) as any[]
  if (marcas.length === 0) return { ok: false, error: 'No hay marcas configuradas.' }

  const parsed = await parseAgenda(t, marcas.map((m) => ({ slug: m.slug, nombre: m.nombre })))
  const marca = parsed.marcaSlug ? marcas.find((m) => m.slug === parsed.marcaSlug) : null
  /* El título genérico de la IA ("Reunión con X") no sirve para una grabación:
     lo dejamos vacío y la tarjeta arma "Grabación – {marca}". */
  const generico = /^reuni[oó]n( con .*)?$/i.test(parsed.titulo.trim())
  const titulo = parsed.tipo === 'grabacion' && generico ? '' : generico && !marca ? '' : parsed.titulo

  return {
    ok: true,
    tipo: parsed.tipo,
    marcaId: marca?.id ?? null,
    fecha: parsed.fecha,
    hora: parsed.hora,
    durationMin: parsed.durationMin,
    titulo,
    marcas: marcas.map((m) => ({
      id: m.id as string,
      slug: m.slug as string,
      nombre: m.nombre as string,
      emoji: (m.emoji_marca ?? null) as string | null,
      correos: ((m.correos_clientes ?? []) as string[]).filter(Boolean),
    })),
  }
}

/* Crea una GRABACIÓN desde el asistente: queda en Grabaciones de la marca y
   en Google Calendar (createGrabacion ya invita a los correos de la marca). */
export async function agendarGrabacion(input: {
  marcaSlug: string
  fecha: string
  hora: string
  durationMin: number
  titulo: string
  invitados: string[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden agendar grabaciones.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) return { ok: false, error: 'Fecha inválida.' }
  if (!/^\d{1,2}:\d{2}$/.test(input.hora)) return { ok: false, error: 'Hora inválida.' }
  const r = await createGrabacion({
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
  return { ok: true }
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
       existe en Google pero no en el sistema. Guardamos google_event_id para
       poder editar/borrar la reunión desde el calendario con sync a Google;
       si la columna falta, se auto-crea y reintenta (patrón self-healing). */
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
      const { ensureReunionCols } = await import('@/lib/reuniones/db')
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
