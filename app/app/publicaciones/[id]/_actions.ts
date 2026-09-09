// app/app/publicaciones/[id]/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { generarCopysIA } from '@/lib/copys/generar'
import { promptSeedPorSlug } from '@/lib/copys/seeds'
import { registrarActividad } from '@/lib/actividad/registrar'
import { enviarPushAClientesDeMarca, enviarPushAMiembros, marcaAvisaAlEquipo } from '@/lib/push/send'

import {
  updatePublicacion as updatePublicacionImpl,
  type UpdatePublicacionInput,
} from './update-publicacion'

export type { UpdatePublicacionInput }

type ActionResult = { ok: true } | { ok: false; error: string }

/** Local async re-export — Next forbids `export { fn } from` in "use server" files. */
export async function updatePublicacion(
  id: string,
  input: UpdatePublicacionInput,
): Promise<ActionResult> {
  return updatePublicacionImpl(id, input)
}

export async function togglePublicacionField(
  id: string,
  field: 'copy_listo' | 'musica_lista' | 'portada_lista' | 'disenado' | 'editado' | 'video_aprobado' | 'es_tarea_diseno',
  value: boolean,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('publicaciones')
    .update({ [field]: value, updated_by: user.id })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/publicaciones/${id}`)
  if (field === 'es_tarea_diseno') revalidatePath('/diseno')
  return { ok: true }
}

export async function marcarParaDiseno(
  id: string,
  value: boolean,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { es_tarea_diseno: value, updated_by: user.id }
  if (value) update.estado_tarea = 'sin_empezar'

  const { error } = await service.from('publicaciones').update(update).eq('id', id)
  if (error) return { ok: false, error: error.message }

  await registrarActividad({
    accion: value ? 'Mandó a diseño' : 'Quitó de diseño',
    entidad_tipo: 'publicacion',
    entidad_id: id,
  })

  revalidatePath(`/publicaciones/${id}`)
  revalidatePath('/diseno')
  return { ok: true }
}

export async function updateGuionTexto(
  id: string,
  guion: string,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('publicaciones')
    .update({ guion: guion || null, updated_by: user.id })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

export async function generarCopysConIA(input: {
  publicacionId: string
  guion: string
  nombre: string
  tipoContenido: string[]
  plataformas: string[]
  copyActual?: string
  transcript?: string
}): Promise<{ ok: true; opciones: string[] } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: pub } = await service
    .from('publicaciones')
    .select('marca_id')
    .eq('id', input.publicacionId)
    .maybeSingle()
  if (!pub?.marca_id) {
    return { ok: false, error: 'No pude identificar la marca de esta publicación.' }
  }

  const [{ data: marca }, { data: facts }] = await Promise.all([
    service.from('marcas').select('nombre, slug, tono_voz').eq('id', pub.marca_id).maybeSingle(),
    service.from('marca_facts').select('*').eq('marca_id', pub.marca_id).maybeSingle(),
  ])
  if (!marca) return { ok: false, error: 'Marca no encontrada.' }

  const tonoVoz = (marca.tono_voz && typeof marca.tono_voz === 'object') ? marca.tono_voz as Record<string, unknown> : {}
  const promptGuardado = typeof tonoVoz.prompt_copy === 'string' ? tonoVoz.prompt_copy.trim() : ''
  const promptMarca = promptGuardado || promptSeedPorSlug(marca.slug as string | null) || null

  const res = await generarCopysIA({
    marcaNombre: marca.nombre as string,
    tonoVoz: marca.tono_voz,
    promptMarca,
    transcript: input.transcript ?? null,
    facts: facts
      ? {
          nombre_comercial: facts.nombre_comercial,
          web_principal: facts.web_principal,
          whatsapp_principal: facts.whatsapp_principal,
          puntos_venta: facts.puntos_venta,
          proximamente: facts.proximamente,
          productos_datos: facts.productos_datos,
          frases_prohibidas: facts.frases_prohibidas,
          frases_canon: facts.frases_canon,
          notas: facts.notas,
        }
      : null,
    nombre: input.nombre,
    guion: input.guion,
    tipoContenido: input.tipoContenido ?? [],
    plataformas: input.plataformas ?? [],
    copyActual: input.copyActual,
  })
  if (res.ok) {
    await registrarActividad({
      accion: 'Generó copy con IA',
      entidad_tipo: 'publicacion',
      entidad_id: input.publicacionId,
      marca_slug: (marca.slug as string | null) ?? undefined,
      detalle: input.transcript ? 'desde un audio' : 'desde el guion / contexto',
    })
  }
  return res
}

export async function guardarPromptMarca(
  marcaId: string,
  prompt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  if (!marcaId) return { ok: false, error: 'Falta la marca.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: marca, error: readErr } = await service
    .from('marcas')
    .select('tono_voz')
    .eq('id', marcaId)
    .maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }

  const tonoVoz = (marca?.tono_voz && typeof marca.tono_voz === 'object')
    ? { ...(marca.tono_voz as Record<string, unknown>) }
    : {}
  tonoVoz.prompt_copy = prompt

  const { error } = await service.from('marcas').update({ tono_voz: tonoVoz }).eq('id', marcaId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deletePublicacion(
  id: string,
  returnTo: string = '/publicaciones',
): Promise<void> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service.from('publicaciones').delete().eq('id', id)
  if (error) {
    console.error('[deletePublicacion] error:', error)
    throw new Error(`No se pudo eliminar: ${error.message}`)
  }

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  revalidatePath('/diseno')
  revalidatePath('/editor')
  revalidatePath('/cockpit')
  revalidatePath('/inicio')

  const safeReturn = returnTo.startsWith('/') ? returnTo : '/publicaciones'
  redirect(safeReturn)
}

export async function avisarClientePublicado(
  id: string,
  input: { linkTiktok?: string | null; linkInstagram?: string | null },
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: pub } = await service
    .from('publicaciones')
    .select('nombre, plataformas, video_con_musica_url, marca:marcas(id, nombre, slug, emoji_marca)')
    .eq('id', id)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { estado: 'publicado', publicado_at: new Date().toISOString(), updated_by: user.id }
  if (input.linkTiktok !== undefined) update.link_tiktok = (input.linkTiktok || '').trim() || null
  if (input.linkInstagram !== undefined) update.link_instagram = (input.linkInstagram || '').trim() || null

  const { error } = await service.from('publicaciones').update(update).eq('id', id)
  if (error) return { ok: false, error: error.message }

  const m = pub ? (Array.isArray(pub.marca) ? pub.marca[0] : pub.marca) : null
  const marcaNombre = m?.nombre ?? 'Marca'
  const hora = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date())

  if (m?.id) {
    await enviarPushAClientesDeMarca(m.id, {
      title: `✅ ¡Tu video se publicó! ${m.emoji_marca ?? ''}`.trim(),
      body: `${pub?.nombre ?? marcaNombre} — ya puedes verlo en tus redes sociales 🎉`,
      url: `/cliente?pub=${id}`,
      tag: `cliente-pub-${id}`,
    })
    if (marcaAvisaAlEquipo(m.slug, m.nombre)) {
      await enviarPushAMiembros(['erick'], {
        title: `✅ Video publicado · ${marcaNombre}`,
        body: `${pub?.nombre ?? marcaNombre} · ${hora}`,
        url: `/publicaciones/${id}`,
        tag: `pub-publicado-eq-${id}`,
      })
    }
  }

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/publicar-hoy')
  revalidatePath('/cliente')
  revalidatePath('/inicio')
  return { ok: true }
}
