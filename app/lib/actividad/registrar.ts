// app/lib/actividad/registrar.ts
//
// Registra una acción en el historial de actividad (tabla `actividad`).
// Se llama desde los server actions importantes. Pedro 15-jun-2026: cada
// persona debe tener su historial del día para el reporte "qué hizo y cuánto".
//
// BEST-EFFORT: nunca lanza. Si la tabla todavía no existe (migración pendiente)
// o falla la inserción, simplemente no registra — NUNCA rompe la acción real.

import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { createServiceClient } from '@/lib/supabase/service'

export type ActividadInput = {
  accion: string
  entidad_tipo?: string
  entidad_id?: string
  marca_slug?: string | null
  detalle?: string | null
}

export async function registrarActividad(input: ActividadInput): Promise<void> {
  try {
    const p = await getCurrentMemberPermisos()
    // Si no hay team_member, es el admin/owner (Pedro).
    const actorNombre = p?.member?.nombre ?? 'Pedro (Admin)'
    const teamMemberId = p?.member?.id ?? null
    const rol = (p?.member?.rol_base as string | undefined) ?? 'director'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    await service.from('actividad').insert({
      team_member_id: teamMemberId,
      actor_nombre: actorNombre,
      rol,
      accion: input.accion,
      entidad_tipo: input.entidad_tipo ?? null,
      entidad_id: input.entidad_id ?? null,
      marca_slug: input.marca_slug ?? null,
      detalle: input.detalle ?? null,
    })
  } catch {
    /* tabla ausente / error transitorio → no registramos, no rompemos nada */
  }
}
