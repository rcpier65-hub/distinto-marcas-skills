'use server'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { loadTaskAccess } from '@/lib/tareas/access-server'

export type TareaFlotante = { id: string; texto: string; en_proceso_desde: string | null; tiempo_seg: number }
export async function listarTareasFlotantes(): Promise<TareaFlotante[]> {
  const user = await requireUser()
  const service = createServiceClient()
  const { access } = await loadTaskAccess(service, user.id)
  if (!access.active || !access.memberId) return []
  const { data, error } = await service.from('tareas').select('id, texto, en_proceso_desde, tiempo_seg').eq('team_member_id', access.memberId).eq('completada', false).eq('estado', 'en_proceso').order('en_proceso_desde', { ascending: false, nullsFirst: false }).limit(10)
  if (error) throw new Error('No se pudieron cargar los cronómetros.')
  return (data ?? []) as TareaFlotante[]
}
