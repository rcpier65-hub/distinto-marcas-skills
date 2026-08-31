// app/app/influencers/_actions.ts
'use server'

// Módulo Influencers (por marca): pedidos a influencers y su avance.
// Estados: pedido_enviado → pedido_entregado → video_enviado.
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import {
  crearInfluencerDb, actualizarInfluencerDb, eliminarInfluencerDb, setInfluencersActivoDb,
  type EstadoInfluencer,
} from '@/lib/influencers/db'

type Result = { ok: true } | { ok: false; error: string }

const ESTADOS: EstadoInfluencer[] = ['pedido_enviado', 'pedido_entregado', 'video_enviado']

function limpiarIg(u: string): string {
  return (u ?? '').trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/+$/, '')
}

export async function crearInfluencer(input: {
  marcaSlug: string; usuarioIg: string; nombre?: string; estado?: EstadoInfluencer; notas?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireUser()
  const usuario = limpiarIg(input.usuarioIg)
  if (!usuario) return { ok: false, error: 'Falta el usuario de Instagram' }
  const estado = ESTADOS.includes(input.estado as EstadoInfluencer) ? (input.estado as EstadoInfluencer) : 'pedido_enviado'
  try {
    const id = await crearInfluencerDb({
      marcaSlug: (input.marcaSlug ?? 'little-joe').trim() || 'little-joe',
      usuarioIg: usuario,
      nombre: (input.nombre ?? '').trim() || null,
      estado,
      notas: (input.notas ?? '').trim() || null,
    })
    revalidatePath('/influencers')
    revalidatePath('/cliente')
    return { ok: true, id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function moverInfluencer(id: string, estado: EstadoInfluencer): Promise<Result> {
  await requireUser()
  if (!ESTADOS.includes(estado)) return { ok: false, error: 'Estado inválido' }
  try {
    await actualizarInfluencerDb(id, { estado })
    revalidatePath('/influencers')
    revalidatePath('/cliente')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function editarInfluencer(id: string, patch: {
  usuarioIg?: string; nombre?: string; videoUrl?: string; notas?: string
}): Promise<Result> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = {}
  if (patch.usuarioIg !== undefined) {
    const u = limpiarIg(patch.usuarioIg)
    if (!u) return { ok: false, error: 'El usuario de IG no puede quedar vacío' }
    p.usuario_ig = u
  }
  if (patch.nombre !== undefined) p.nombre = patch.nombre.trim() || null
  if (patch.videoUrl !== undefined) {
    const v = patch.videoUrl.trim()
    if (v && !/^https?:\/\//i.test(v)) return { ok: false, error: 'El enlace del video debe empezar con http(s)://' }
    p.video_url = v || null
  }
  if (patch.notas !== undefined) p.notas = patch.notas.trim() || null
  try {
    await actualizarInfluencerDb(id, p)
    revalidatePath('/influencers')
    revalidatePath('/cliente')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function eliminarInfluencer(id: string): Promise<Result> {
  await requireUser()
  try {
    await eliminarInfluencerDb(id)
    revalidatePath('/influencers')
    revalidatePath('/cliente')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Activa/desactiva el módulo Influencers para una marca (solo directores).
 * Controla en qué marcas aparece el módulo (sidebar + tabs de /influencers).
 */
export async function toggleInfluencersMarca(marcaSlug: string, activo: boolean): Promise<Result> {
  await requireUser()
  const permisos = await getCurrentMemberPermisos()
  const esDirector = !permisos || permisos.member.rol_base === 'director' || permisos.member.rol_base === 'admin'
  if (!esDirector) return { ok: false, error: 'Solo los directores pueden activar Influencers por marca.' }
  const slug = (marcaSlug ?? '').trim()
  if (!slug) return { ok: false, error: 'Falta la marca.' }
  try {
    await setInfluencersActivoDb(slug, activo)
    revalidatePath('/influencers')
    revalidatePath('/cliente')
    revalidatePath('/', 'layout')  // refresca el sidebar (gate por marca)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
