'use server'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { loadTaskAccess } from '@/lib/tareas/access-server'

export type TareaFlotante = { id: string; texto: string; categoria: string; estado: string; en_proceso_desde: string | null; tiempo_seg: number }
export async function listarTareasFlotantes(): Promise<TareaFlotante[]> {
  const user = await requireUser()
  const service = createServiceClient()
  const { access } = await loadTaskAccess(service, user.id)
  if (!access.active || !access.memberId) return []
  const { data, error } = await service.from('tareas')
    .select('id, texto, categoria, estado, en_proceso_desde, tiempo_seg')
    .eq('team_member_id', access.memberId).eq('completada', false)
    .neq('estado', 'archivado')
    .order('en_proceso_desde', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('No se pudieron cargar tus pendientes.')
  return (data ?? []) as TareaFlotante[]
}
