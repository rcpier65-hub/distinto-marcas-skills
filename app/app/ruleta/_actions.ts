'use server'

// Acciones de "La Ruleta" — sorteo mensual de quién organiza la salida del
// equipo + registro del historial (lugar, fecha, hora, asistentes).
// Pedro 21-jul-2026.

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

async function miembroActual() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: me } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return { service, me }
}

export type GuardarActividadInput = {
  organizadorId: string | null
  organizadorNombre: string
  lugar: string
  fecha: string | null   // YYYY-MM-DD
  hora: string | null    // HH:MM
  asistentes: string[]   // nombres
  notas: string
}

export async function guardarActividadRuleta(
  input: GuardarActividadInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { service, me } = await miembroActual()
  if (!me) return { ok: false, error: 'No autorizado' }

  const nombre = input.organizadorNombre.trim()
  if (!nombre) return { ok: false, error: 'Falta quién organiza' }

  const { error } = await service.from('ruleta_actividades').insert({
    organizador_id: input.organizadorId,
    organizador_nombre: nombre,
    lugar: input.lugar.trim() || null,
    fecha: input.fecha || null,
    hora: input.hora || null,
    asistentes: input.asistentes ?? [],
    notas: input.notas.trim() || null,
    created_by: me.id,
  })
  if (error) {
    console.error('[guardarActividadRuleta]', error)
    return { ok: false, error: error.message }
  }
  revalidatePath('/ruleta')
  return { ok: true }
}

export async function eliminarActividadRuleta(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { service, me } = await miembroActual()
  if (!me) return { ok: false, error: 'No autorizado' }
  const { error } = await service.from('ruleta_actividades').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/ruleta')
  return { ok: true }
}
