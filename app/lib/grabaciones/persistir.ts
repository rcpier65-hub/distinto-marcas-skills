// app/lib/grabaciones/persistir.ts
// Cuerpo de createGrabacion (formulario de Grabaciones y "Agendar" del
// calendario). Sin requireUser: quien llama ya autorizó.

import 'server-only'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createCalendarEvent,
  createTimedEvent,
  createReunionEvent,
} from '@/lib/integrations/google-calendar'

/* Lorena dirige TODAS las grabaciones — va invitada a cada evento de
   grabación de cualquier marca (Google le manda invitación + recordatorio).
   Pedro 31-ago-2026. */
const CORREO_DIRECTORA_GRABACIONES = 'lorechavarry@gmail.com'

export async function persistirGrabacion(args: {
  marca_slug: string
  titulo?: string
  fecha_planeada: string
  hora_planeada?: string          // HH:MM — si null/undefined, evento all-day
  duracion_min?: number           // default 60
  descripcion?: string | null
  es_reunion_meet?: boolean
  invitados_emails?: string[]
  // Legacy compat — algunos callers viejos pasan 'notas'.
  notas?: string
}): Promise<
  | { ok: true; id: string; gcalSynced: boolean; meetLink: string | null }
  | { ok: false; error: string }
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Resolver marca_id + nombre + correos_clientes por slug.
  // Pedro: "cada marca tiene sus correos y si se crea un evento deben
  // estar como invitados". Los correos guardados en Settings (columna
  // correos_clientes) se mergean con los que el user pueda haber puesto
  // a mano en el form, dedup por lowercase. Defensive: si la columna
  // no existe (pre-migración) lee solo id+nombre.
  let marca: { id: string; nombre: string; correos_clientes?: string[] | null } | null = null
  {
    const r1 = await service
      .from('marcas')
      .select('id, nombre, correos_clientes')
      .eq('slug', args.marca_slug)
      .maybeSingle()
    if (r1.error && /correos_clientes/i.test(r1.error.message ?? '')) {
      const r2 = await service
        .from('marcas')
        .select('id, nombre')
        .eq('slug', args.marca_slug)
        .maybeSingle()
      marca = r2.data
    } else {
      marca = r1.data
    }
  }
  if (!marca) return { ok: false, error: `Marca '${args.marca_slug}' no encontrada` }

  const titulo = args.titulo?.trim() || `Grabación – ${marca.nombre}`
  const descripcion = args.descripcion?.trim() || args.notas?.trim() || null
  const duracion = Math.max(5, Math.min(720, args.duracion_min ?? 60))
  const esMeet = !!args.es_reunion_meet
  /* Merge: invitados del form + correos_clientes guardados en Settings.
     Dedup por lowercase para evitar duplicados si el user puso a mano
     uno que ya estaba en Settings. */
  const correosMarca = (marca.correos_clientes ?? [])
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => /@/.test(e))
  const correosForm = (args.invitados_emails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /@/.test(e))
  // La directora de grabaciones (Lorena) SIEMPRE va invitada.
  const invitados = Array.from(new Set([CORREO_DIRECTORA_GRABACIONES, ...correosMarca, ...correosForm]))

  // Insert con todas las columnas. Si alguna OPCIONAL no existe en prod
  // (migraciones 028/029 sin aplicar), la PODAMOS y reintentamos — pero
  // conservando SIEMPRE las columnas base, incluida hora_planeada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insert: Record<string, any> = {
    marca_id: marca.id,
    fecha_planeada: args.fecha_planeada,
    hora_planeada: args.hora_planeada ?? null,
    estado: 'planeada',
    notas: descripcion,
    titulo,
    duracion_min: duracion,
    es_reunion_meet: esMeet,
    invitados_emails: invitados.length > 0 ? invitados : null,
  }
  /* BUG corregido (20-jun-2026): antes el fallback usaba un insert mínimo
     hardcodeado que NO incluía hora_planeada. Como `titulo`/`duracion_min`/
     `es_reunion_meet`/`invitados_emails` NO existen en prod, el insert FULL
     siempre fallaba (42703) → caía al fallback → cada grabación nueva nacía
     SIN hora ("Sin hora definida" aunque el user SÍ eligió la hora). Ahora
     solo quitamos las columnas opcionales faltantes y preservamos hora_planeada. */
  const OPCIONALES = ['titulo', 'duracion_min', 'es_reunion_meet', 'invitados_emails', 'meet_link']

  let inserted = await service
    .from('grabaciones')
    .insert(insert)
    .select('id')
    .single()

  if (inserted.error && (
    inserted.error.code === '42703' ||
    inserted.error.code === 'PGRST204' ||
    /column .* does not exist|could not find the .*column.* in the schema cache|titulo|duracion_min|es_reunion_meet|invitados_emails/i.test(inserted.error.message ?? '')
  )) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pruned: Record<string, any> = { ...insert }
    for (const c of OPCIONALES) delete pruned[c]
    inserted = await service
      .from('grabaciones')
      .insert(pruned)
      .select('id')
      .single()
  }
  if (inserted.error) return { ok: false, error: inserted.error.message }
  const grabId = inserted.data.id as string

  // Sync con Google Calendar — elige método según es_reunion_meet + si hay hora.
  // Best-effort: si GCal no está conectado o falla, la grabación queda guardada
  // y reportamos gcalSynced=false para que la UI muestre el mensaje correcto.
  let gcalSynced = false
  let meetLink: string | null = null
  try {
    if (esMeet && args.hora_planeada) {
      const ev = await createReunionEvent({
        summary: titulo,
        description: descripcion ?? `Sesión de grabación – ${marca.nombre}.`,
        fecha: args.fecha_planeada,
        hora: args.hora_planeada,
        durationMin: duracion,
        attendees: invitados,
      })
      if (ev.ok) {
        gcalSynced = true
        meetLink = ev.meetLink
        // Defensive update — si meet_link no existe en BD, ignora silenciosamente.
        await service
          .from('grabaciones')
          .update({ google_event_id: ev.eventId, meet_link: ev.meetLink })
          .eq('id', grabId)
          .then(async (r: { error: { code?: string; message?: string } | null }) => {
            if (r.error && /meet_link/i.test(r.error.message ?? '')) {
              await service
                .from('grabaciones')
                .update({ google_event_id: ev.eventId })
                .eq('id', grabId)
            }
          })
      }
    } else if (args.hora_planeada) {
      // Evento con hora pero sin Meet. Los attendees igual van —
      // Google les manda invitación de calendario aunque no haya Meet.
      const ev = await createTimedEvent({
        summary: titulo,
        description: descripcion ?? `Sesión de grabación – ${marca.nombre}.`,
        fecha: args.fecha_planeada,
        hora: args.hora_planeada,
        durationMin: duracion,
        attendees: invitados.length > 0 ? invitados : undefined,
      })
      if (ev.ok) {
        gcalSynced = true
        await service.from('grabaciones').update({ google_event_id: ev.eventId }).eq('id', grabId)
      }
    } else {
      // Sin hora: evento all-day (comportamiento legacy). Attendees igual
      // van si la marca tiene correos guardados — Google manda invitación.
      const ev = await createCalendarEvent({
        summary: titulo,
        description: descripcion ?? `Sesión de grabación para ${marca.nombre}.`,
        date: args.fecha_planeada,
        attendees: invitados.length > 0 ? invitados : undefined,
      })
      if (ev.ok) {
        gcalSynced = true
        await service.from('grabaciones').update({ google_event_id: ev.eventId }).eq('id', grabId)
      }
    }
  } catch (e) {
    console.error('[grabaciones] GCal sync falló — sigo con la grabación local:', e)
  }

  revalidatePath('/grabaciones')
  revalidatePath('/grabaciones/calendario')
  return { ok: true, id: grabId, gcalSynced, meetLink }
}
