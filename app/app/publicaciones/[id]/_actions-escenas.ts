// app/app/publicaciones/[id]/_actions-escenas.ts
// Server actions específicas para el guion técnico (escenas) de una publicación.
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

/**
 * Crea una nueva escena al final del guion (escena_num = max + 1).
 * Devuelve el id de la nueva escena para que el cliente pueda enfocarla.
 */
export async function createEscena(publicacionId: string): Promise<Result<{ id: string; escena_num: number }>> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Obtener el máximo escena_num actual para esta publicación
  const { data: ultima } = await service
    .from('escenas')
    .select('escena_num')
    .eq('publicacion_id', publicacionId)
    .order('escena_num', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNum = (ultima?.escena_num ?? 0) + 1

  const { data, error } = await service
    .from('escenas')
    .insert({
      publicacion_id: publicacionId,
      escena_num: nextNum,
      dialogo: null,
      plano: null,
      duracion_seg: null,
      notas: null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id, escena_num')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/publicaciones/${publicacionId}`)
  return { ok: true, data: { id: data.id, escena_num: data.escena_num } }
}

/**
 * Actualiza un campo (o varios) de una escena específica.
 * Auto-save: el cliente llama esto en onBlur de cada celda.
 */
export async function updateEscena(
  escenaId: string,
  publicacionId: string,
  changes: {
    dialogo?: string | null
    plano?: string | null
    duracion_seg?: number | null
    notas?: string | null
    escena_num?: number
  },
): Promise<Result> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { updated_by: user.id }
  for (const [k, v] of Object.entries(changes)) {
    if (v !== undefined) update[k] = v
  }

  const { error } = await service.from('escenas').update(update).eq('id', escenaId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/publicaciones/${publicacionId}`)
  return { ok: true }
}

/**
 * Elimina una escena. Renumera el resto para que queden 1, 2, 3, ... sin huecos.
 */
export async function deleteEscena(escenaId: string, publicacionId: string): Promise<Result> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Borrar la escena
  const { error: delErr } = await service.from('escenas').delete().eq('id', escenaId)
  if (delErr) return { ok: false, error: delErr.message }

  // 2. Re-fetch escenas restantes ordenadas y renumerar
  const { data: restantes } = await service
    .from('escenas')
    .select('id, escena_num')
    .eq('publicacion_id', publicacionId)
    .order('escena_num', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (let i = 0; i < (restantes?.length ?? 0); i++) {
    const e = (restantes as any[])[i]
    const expectedNum = i + 1
    if (e.escena_num !== expectedNum) {
      // Para evitar conflict con UNIQUE (publicacion_id, escena_num),
      // primero seteamos a un número provisorio negativo, después al correcto.
      await service.from('escenas').update({ escena_num: -1000 - i }).eq('id', e.id)
    }
  }
  for (let i = 0; i < (restantes?.length ?? 0); i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = (restantes as any[])[i]
    const expectedNum = i + 1
    await service.from('escenas').update({ escena_num: expectedNum }).eq('id', e.id)
  }

  revalidatePath(`/publicaciones/${publicacionId}`)
  return { ok: true }
}
