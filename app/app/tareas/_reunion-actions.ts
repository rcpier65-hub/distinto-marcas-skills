'use server'
/* "Para reunión" en las tarjetas de Tareas (Pedro 19-oct-2026): la tarea entra
   o sale de los temas de la próxima reunión de su marca (tabla reunion_temas).
   No cambia la tarea en sí. */
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { mayEditTask } from '@/lib/tareas/access-server'
import { marcaDeTarea } from '@/lib/reuniones/temas'

export async function marcarTareaParaReunion(id: string, activa: boolean): Promise<{ ok: boolean; error?: string; marca?: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const perm = await mayEditTask(service, user.id, id)
  if (!perm.ok) return perm

  if (!activa) {
    const { error } = await service.from('reunion_temas').delete().eq('tarea_id', id).eq('estado', 'pendiente')
    if (error) return { ok: false, error: 'No se pudo quitar de la reunión.' }
    revalidatePath('/tareas')
    return { ok: true }
  }

  const { data: t } = await service.from('tareas').select('marca_slug, categoria').eq('id', id).maybeSingle()
  if (!t) return { ok: false, error: 'Tarea no encontrada.' }
  const marca = await marcaDeTarea(service, t)
  if (!marca) return { ok: false, error: 'Primero mueve la tarea a la columna de una marca.' }

  const { data: me } = await service.from('team_members').select('id').eq('auth_user_id', user.id).maybeSingle()
  const { error } = await service.from('reunion_temas').insert({ marca_id: marca.id, tarea_id: id, created_by: me?.id ?? null })
  /* 23505 = ya estaba en la lista: se considera hecho. */
  if (error && error.code !== '23505') return { ok: false, error: 'No se pudo agregar a la reunión.' }
  revalidatePath('/tareas')
  return { ok: true, marca: marca.nombre }
}
