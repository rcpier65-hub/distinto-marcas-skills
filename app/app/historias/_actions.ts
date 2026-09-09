'use server'

// Planificador de historias compartido (Ailyn diseño + Lorena publicaciones).
// Ticket e7e50df4-92ac-4855-8fc5-23171a14ed5f.

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { tieneAcceso } from '@/lib/team/types'

export type HistoriaEstado = 'planificada' | 'lista' | 'publicada' | 'cancelada'

async function autorizadoEscritura() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const p = await getCurrentMemberPermisos()
  /* Admin/owner (sin team_member), director, o quien tenga diseño o publicaciones. */
  const ok =
    !p ||
    p.member.rol_base === 'director' ||
    p.member.rol_base === 'admin' ||
    tieneAcceso(p.permisos, 'diseno') ||
    tieneAcceso(p.permisos, 'publicaciones')
  return { service, user, me: p?.member ?? null, ok }
}

function revalidateHistorias() {
  revalidatePath('/historias')
  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/calendario')
}

export async function crearHistoria(input: {
  marcaId: string
  titulo: string
  fecha: string
  hora?: string | null
  plataformas?: string[]
  copy?: string | null
  nota?: string | null
  estado?: HistoriaEstado
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { service, me, ok } = await autorizadoEscritura()
  if (!ok) return { ok: false, error: 'No autorizado' }
  if (!input.marcaId) return { ok: false, error: 'Elige una marca' }
  if (!input.titulo.trim()) return { ok: false, error: 'Falta el título' }
  if (!input.fecha) return { ok: false, error: 'Falta la fecha' }

  const plataformas = (input.plataformas ?? ['Instagram']).filter(Boolean)
  const { data, error } = await service.from('historias').insert({
    marca_id: input.marcaId,
    titulo: input.titulo.trim(),
    fecha: input.fecha,
    hora: input.hora?.trim() || null,
    plataformas: plataformas.length ? plataformas : ['Instagram'],
    copy: input.copy?.trim() || null,
    nota: input.nota?.trim() || null,
    estado: input.estado ?? 'planificada',
    created_by: me?.id ?? null,
  }).select('id').single()

  if (error) return { ok: false, error: error.message }
  revalidateHistorias()
  return { ok: true, id: data.id as string }
}

export async function actualizarHistoria(input: {
  id: string
  marcaId?: string
  titulo?: string
  fecha?: string
  hora?: string | null
  plataformas?: string[]
  copy?: string | null
  nota?: string | null
  estado?: HistoriaEstado
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { service, ok } = await autorizadoEscritura()
  if (!ok) return { ok: false, error: 'No autorizado' }
  if (!input.id) return { ok: false, error: 'Falta id' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {}
  if (input.marcaId !== undefined) patch.marca_id = input.marcaId
  if (input.titulo !== undefined) {
    if (!input.titulo.trim()) return { ok: false, error: 'Falta el título' }
    patch.titulo = input.titulo.trim()
  }
  if (input.fecha !== undefined) patch.fecha = input.fecha
  if (input.hora !== undefined) patch.hora = input.hora?.trim() || null
  if (input.plataformas !== undefined) {
    const plats = input.plataformas.filter(Boolean)
    patch.plataformas = plats.length ? plats : ['Instagram']
  }
  if (input.copy !== undefined) patch.copy = input.copy?.trim() || null
  if (input.nota !== undefined) patch.nota = input.nota?.trim() || null
  if (input.estado !== undefined) patch.estado = input.estado

  const { error } = await service.from('historias').update(patch).eq('id', input.id)
  if (error) return { ok: false, error: error.message }
  revalidateHistorias()
  return { ok: true }
}

export async function eliminarHistoria(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { service, ok } = await autorizadoEscritura()
  if (!ok) return { ok: false, error: 'No autorizado' }
  if (!id) return { ok: false, error: 'Falta id' }
  const { error } = await service.from('historias').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidateHistorias()
  return { ok: true }
}
