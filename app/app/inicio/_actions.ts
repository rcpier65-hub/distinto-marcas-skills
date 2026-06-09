// app/app/inicio/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { parsePendiente, type Categoria } from '@/lib/pendientes/parse-pendiente'

export type PendienteRapido = {
  id: string
  titulo: string
  descripcion: string | null
  categoria: Categoria
  prioridad: 1 | 2 | 3
  completado: boolean
  created_at: string
}

/**
 * Crea un pendiente nuevo a partir de texto libre.
 * Parsea con IA (o heurística) y guarda en BD.
 */
export async function crearPendienteRapido(textoOriginal: string): Promise<
  { ok: true; pendiente: PendienteRapido } | { ok: false; error: string }
> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const texto = textoOriginal.trim()
  if (!texto) return { ok: false, error: 'No escribiste nada' }
  if (texto.length > 1000) return { ok: false, error: 'Demasiado largo (máx 1000 caracteres)' }

  /* Resolver team_member del user (null si admin/owner) + su rol_base
     para que la IA categorice mejor */
  const { data: tm } = await service
    .from('team_members')
    .select('id, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const teamMemberId = tm?.id ?? null
  const rolBase = tm?.rol_base ?? 'admin'

  /* Parsear con IA o fallback */
  const parsed = await parsePendiente(texto, rolBase)

  /* Insertar */
  const { data, error } = await service
    .from('pendientes_rapidos')
    .insert({
      team_member_id: teamMemberId,
      texto_original: texto,
      titulo: parsed.titulo,
      descripcion: parsed.descripcion,
      categoria: parsed.categoria,
      prioridad: parsed.prioridad,
      completado: false,
    })
    .select('id, titulo, descripcion, categoria, prioridad, completado, created_at')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/inicio')
  return {
    ok: true,
    pendiente: {
      id: data.id,
      titulo: data.titulo,
      descripcion: data.descripcion,
      categoria: data.categoria as Categoria,
      prioridad: data.prioridad as 1 | 2 | 3,
      completado: data.completado,
      created_at: data.created_at,
    },
  }
}

/** Toggle de completado (con ownership check). */
export async function togglePendienteRapido(id: string): Promise<
  { ok: true; completado: boolean } | { ok: false; error: string }
> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: tm } = await service
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const teamMemberId = tm?.id ?? null

  /* Validar ownership */
  const { data: p } = await service
    .from('pendientes_rapidos')
    .select('id, team_member_id, completado')
    .eq('id', id)
    .maybeSingle()
  if (!p) return { ok: false, error: 'Pendiente no encontrado' }
  if (p.team_member_id !== teamMemberId) return { ok: false, error: 'Este pendiente no es tuyo' }

  const nuevo = !p.completado
  const { error } = await service
    .from('pendientes_rapidos')
    .update({ completado: nuevo, completado_at: nuevo ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/inicio')
  return { ok: true, completado: nuevo }
}

/** Eliminar un pendiente (hard delete con ownership check). */
export async function eliminarPendienteRapido(id: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: tm } = await service
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const teamMemberId = tm?.id ?? null

  const { data: p } = await service
    .from('pendientes_rapidos')
    .select('id, team_member_id')
    .eq('id', id)
    .maybeSingle()
  if (!p) return { ok: false, error: 'Pendiente no encontrado' }
  if (p.team_member_id !== teamMemberId) return { ok: false, error: 'Este pendiente no es tuyo' }

  const { error } = await service.from('pendientes_rapidos').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/inicio')
  return { ok: true }
}
