'use server'

// Fechas importantes por marca (idea de Lorena 23-jul-2026).
// Solo Lorena + directores (Erick/Pedro) gestionan esto.

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

async function autorizado() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: me } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const ok = !!me && (me.nombre === 'LORENA' || me.rol_base === 'director')
  return { service, me, ok }
}

export async function crearFechaImportante(input: {
  marcaId: string; titulo: string; fecha: string; nota: string; categoria?: string; contenido?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { service, me, ok } = await autorizado()
  if (!ok) return { ok: false, error: 'No autorizado' }
  if (!input.marcaId) return { ok: false, error: 'Elige una marca' }
  if (!input.titulo.trim()) return { ok: false, error: 'Falta el título' }
  if (!input.fecha) return { ok: false, error: 'Falta la fecha' }

  const { error } = await service.from('fechas_importantes').insert({
    marca_id: input.marcaId,
    titulo: input.titulo.trim(),
    fecha: input.fecha,
    nota: input.nota.trim() || null,
    categoria: input.categoria || 'otro',
    contenido: input.contenido || null,
    created_by: me!.id,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/fechas-importantes')
  revalidatePath('/inicio')
  return { ok: true }
}

/* Actualiza el TIPO DE CONTENIDO (post/reel/…) de una fecha. Permite a Lorena/
   directores asignar qué se hará sin tener que borrar y recrear. */
export async function setContenidoFecha(id: string, contenido: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const { service, ok } = await autorizado()
  if (!ok) return { ok: false, error: 'No autorizado' }
  const { error } = await service.from('fechas_importantes').update({ contenido: contenido || null }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/fechas-importantes')
  return { ok: true }
}

export async function eliminarFechaImportante(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { service, ok } = await autorizado()
  if (!ok) return { ok: false, error: 'No autorizado' }
  const { error } = await service.from('fechas_importantes').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/fechas-importantes')
  revalidatePath('/inicio')
  return { ok: true }
}
