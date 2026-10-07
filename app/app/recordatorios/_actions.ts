'use server'

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export type Recordatorio = { id: string; texto: string; listo: boolean; created_at: string }
async function contexto() {
  const user = await requireUser()
  // El cliente del proyecto usa tipos parciales de Supabase.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: member } = await service.from('team_members').select('id').eq('auth_user_id', user.id).eq('activo', true).maybeSingle()
  if (!member) throw new Error('Solo el equipo puede usar recordatorios.')
  return { user, service }
}
export async function listarRecordatorios(): Promise<Recordatorio[]> {
  const { user, service } = await contexto()
  const { data, error } = await service.from('recordatorios').select('id, texto, listo, created_at').eq('auth_user_id', user.id).order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('No se pudieron cargar los recordatorios.')
  return (data ?? []) as Recordatorio[]
}
export async function crearRecordatorio(texto: string) {
  const { user, service } = await contexto()
  const t = texto.trim()
  if (!t || t.length > 500) return { ok: false, error: 'Escribe entre 1 y 500 caracteres.' }
  const { error } = await service.from('recordatorios').insert({ auth_user_id: user.id, texto: t })
  if (error) return { ok: false, error: 'No se pudo guardar el recordatorio.' }
  revalidatePath('/recordatorios')
  return { ok: true }
}
export async function marcarRecordatorio(id: string, listo: boolean) {
  const { user, service } = await contexto()
  const { error } = await service.from('recordatorios').update({ listo }).eq('id', id).eq('auth_user_id', user.id)
  if (error) return { ok: false, error: 'No se pudo actualizar el recordatorio.' }
  revalidatePath('/recordatorios')
  return { ok: true }
}
