// app/app/inicio/_agenda-actions.ts
'use server'

/* Asistente "Agendar reunión": el usuario escribe/dicta "agenda para Manrique
   mañana 10am" → interpretarAgenda parsea (marca + fecha + hora); tras confirmar,
   agendarReunion crea el evento en Google Calendar (con Meet + invitados) y
   Google MANDA la invitación por correo al cliente. Solo directores. Pedro 25-ago-2026. */

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { parseAgenda } from '@/lib/reuniones/parse-agenda'
import { ejecutarAgendarGrabacion, ejecutarAgendarReunion } from '@/lib/calendario/agendar-web'

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
   en Google Calendar (persistirGrabacion ya invita a los correos de la marca). */
export async function agendarGrabacion(
  input: Parameters<typeof ejecutarAgendarGrabacion>[0],
): Promise<Awaited<ReturnType<typeof ejecutarAgendarGrabacion>>> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden agendar grabaciones.' }
  return ejecutarAgendarGrabacion(input)
}

export async function agendarReunion(
  input: Parameters<typeof ejecutarAgendarReunion>[0],
): Promise<Awaited<ReturnType<typeof ejecutarAgendarReunion>>> {
  await requireUser()
  if (!(await esDirector())) return { ok: false, error: 'Solo los directores pueden agendar reuniones.' }
  return ejecutarAgendarReunion(input)
}
