// app/app/tareas/_plan-actions.ts
'use server'

/* Actions de la vista PLAN de tareas (estados + fechas + Gantt/calendario).
   Pedro 31-ago-2026: estados sin_empezar/en_proceso/archivado dentro de la
   card, fecha de entrega y de inicio, para que el equipo trabaje y el
   cliente VEA el avance. Solo el EQUIPO cambia estado/fechas (el cliente
   los ve en su portal). Columnas self-healing vía ensureTareasProCols. */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureTareasProCols, ESTADOS_TAREA, type EstadoTarea } from '@/lib/tareas/pro-db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

/* Cualquier miembro ACTIVO del equipo puede mover estado/fechas (el avance
   es colaborativo). Un cliente del portal no tiene team_member → rechazado. */
async function esMiembroEquipo(service: Service, authUserId: string): Promise<boolean> {
  try {
    const { data } = await service
      .from('team_members')
      .select('id, activo')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (data) return data.activo !== false
    /* Sin team_member: puede ser el dueño (Pedro). Si existe como cliente
       del portal, NO es equipo. */
    const { data: cli } = await service
      .from('marca_clientes')
      .select('id')
      .eq('auth_user_id', authUserId)
      .limit(1)
      .maybeSingle()
    return !cli
  } catch { return false }
}

function refrescar() {
  revalidatePath('/tareas')
  revalidatePath('/tareas/plan')
  revalidatePath('/cliente')
  revalidatePath('/inicio')
}

export async function setEstadoTarea(id: string, estado: EstadoTarea): Promise<Result> {
  const user = await requireUser()
  if (!ESTADOS_TAREA.includes(estado)) return { ok: false, error: 'Estado inválido' }
  const service = createServiceClient() as Service
  if (!(await esMiembroEquipo(service, user.id))) {
    return { ok: false, error: 'Solo el equipo puede cambiar el estado.' }
  }

  let r = await service.from('tareas').update({ estado }).eq('id', id)
  if (r.error && /estado|schema cache|42703/i.test(r.error.message ?? '')) {
    try { await ensureTareasProCols() } catch { /* reintento igual */ }
    r = await service.from('tareas').update({ estado }).eq('id', id)
  }
  if (r.error) return { ok: false, error: r.error.message }
  refrescar()
  return { ok: true }
}

export async function setFechasTarea(id: string, input: {
  fechaInicio?: string | null
  fechaEntrega?: string | null
}): Promise<Result> {
  const user = await requireUser()
  const val = (s: string | null | undefined) => {
    if (s === undefined) return undefined
    if (s === null || s === '') return null
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined
  }
  const fi = val(input.fechaInicio)
  const fe = val(input.fechaEntrega)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {}
  if (fi !== undefined) patch.fecha_inicio = fi
  if (fe !== undefined) patch.fecha_entrega = fe
  if (Object.keys(patch).length === 0) return { ok: false, error: 'Fecha inválida (usa AAAA-MM-DD).' }
  if (patch.fecha_inicio && patch.fecha_entrega && patch.fecha_inicio > patch.fecha_entrega) {
    return { ok: false, error: 'La fecha de inicio no puede ser después de la entrega.' }
  }

  const service = createServiceClient() as Service
  if (!(await esMiembroEquipo(service, user.id))) {
    return { ok: false, error: 'Solo el equipo puede cambiar las fechas.' }
  }

  let r = await service.from('tareas').update(patch).eq('id', id)
  if (r.error && /fecha_inicio|fecha_entrega|schema cache|42703/i.test(r.error.message ?? '')) {
    try { await ensureTareasProCols() } catch { /* reintento igual */ }
    r = await service.from('tareas').update(patch).eq('id', id)
  }
  if (r.error) return { ok: false, error: r.error.message }
  refrescar()
  return { ok: true }
}
