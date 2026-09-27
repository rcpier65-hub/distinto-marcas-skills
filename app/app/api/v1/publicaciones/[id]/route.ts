// GET   /api/v1/publicaciones/:id
// PATCH /api/v1/publicaciones/:id
//
// Auth: Bearer JWT o dst_live_ con alcance owner. Mismo módulo publicaciones
// y marcas_acceso que la sesión web. PATCH además exige puede_editar.
// No acepta CRON_SECRET. No devuelve tokens de Metricool.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { appBase } from '@/lib/api/lima'
import { apiJsonError, denyMarcaAcceso, requireSessionMember } from '@/lib/api/session-member'
import { parsePublicacionPatch } from '@/lib/api/publicacion-patch'
import { colorDeMarca } from '@/lib/marcas/branding'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const OPTIONAL_COLS = [
  'frase',
  'descripcion',
  'fecha_entrega',
  'drive_material_url',
  'drive_resultado_url',
  'link_tiktok',
  'link_instagram',
  'video_sin_musica_url',
  'video_con_musica_url',
  'es_tarea_diseno',
]

const BASE_SELECT = `
  id, nombre, copy, guion, notas, estado, estado_tarea,
  fecha_publicacion, fecha_edicion, fecha_diseno,
  plataformas, tipo_contenido, editor_nombre, marca_id,
  enlace_tomas, enlace_musica, portada_cruda_url, portada_editada_url,
  copy_listo, musica_lista, portada_lista, disenado, editado, video_aprobado,
  marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
`

type DbErr = { code?: string; message?: string } | null

function isMissingColumn(error: DbErr): boolean {
  if (!error) return false
  const message = error.message ?? ''
  return error.code === '42703' || error.code === 'PGRST204'
    || /does not exist/i.test(message)
    || /could not find the .*column/i.test(message)
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asYmd(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 10) return null
  return value.slice(0, 10)
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asBool(value: unknown): boolean {
  return value === true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shapePublicacion(row: any) {
  const marca = one<Record<string, unknown>>(row.marca)
  const slug = typeof marca?.slug === 'string' ? marca.slug : null
  const nombreMarca = typeof marca?.nombre === 'string' && marca.nombre.trim() ? marca.nombre.trim() : slug
  return {
    id: String(row.id),
    nombre: typeof row.nombre === 'string' && row.nombre.trim() ? row.nombre.trim() : '(sin título)',
    copy: asText(row.copy),
    guion: asText(row.guion),
    frase: asText(row.frase),
    notas: asText(row.notas),
    descripcion: asText(row.descripcion),
    estado: typeof row.estado === 'string' ? row.estado : null,
    estado_tarea: typeof row.estado_tarea === 'string' ? row.estado_tarea : null,
    fecha_publicacion: asYmd(row.fecha_publicacion),
    fecha_edicion: asYmd(row.fecha_edicion),
    fecha_diseno: asYmd(row.fecha_diseno),
    fecha_entrega: asYmd(row.fecha_entrega),
    plataformas: asList(row.plataformas),
    tipo_contenido: asList(row.tipo_contenido),
    editor: asText(row.editor_nombre),
    drive_material_url: asText(row.drive_material_url),
    drive_resultado_url: asText(row.drive_resultado_url),
    enlace_tomas: asText(row.enlace_tomas),
    enlace_musica: asText(row.enlace_musica),
    link_tiktok: asText(row.link_tiktok),
    link_instagram: asText(row.link_instagram),
    portada_cruda_url: asText(row.portada_cruda_url),
    portada_editada_url: asText(row.portada_editada_url),
    video_sin_musica_url: asText(row.video_sin_musica_url),
    video_con_musica_url: asText(row.video_con_musica_url),
    copy_listo: asBool(row.copy_listo),
    musica_lista: asBool(row.musica_lista),
    portada_lista: asBool(row.portada_lista),
    disenado: asBool(row.disenado),
    editado: asBool(row.editado),
    video_aprobado: asBool(row.video_aprobado),
    es_tarea_diseno: row.es_tarea_diseno === true,
    marca: slug
      ? {
          slug,
          nombre: nombreMarca,
          color: colorDeMarca(slug, typeof marca?.color_primario_hex === 'string' ? marca.color_primario_hex : null),
          emoji: typeof marca?.emoji_marca === 'string' ? marca.emoji_marca : null,
        }
      : null,
    link: `${appBase()}/publicaciones/${row.id}`,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPublicacion(service: any, id: string) {
  let optional = [...OPTIONAL_COLS]
  for (let attempt = 0; attempt <= OPTIONAL_COLS.length; attempt++) {
    const select = optional.length > 0 ? `${BASE_SELECT}, ${optional.join(', ')}` : BASE_SELECT
    const { data, error } = await service.from('publicaciones').select(select).eq('id', id).maybeSingle()
    if (!error) return { data }
    if (!isMissingColumn(error)) return { error }
    const message = error.message ?? ''
    const offending = optional.find((col) => message.includes(col))
    if (!offending) return { error }
    optional = optional.filter((col) => col !== offending)
  }
  return { error: { message: 'No se pudo leer la publicación' } }
}

async function gate(request: Request, write: boolean) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth
  if (!auth.member.puedePublicaciones) {
    return { response: apiJsonError('No tienes acceso a Publicaciones', 403) }
  }
  if (write && !auth.member.puedeEditarPublicaciones) {
    return { response: apiJsonError('No puedes editar publicaciones', 403) }
  }
  return auth
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await gate(request, false)
  if ('response' in auth) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) return apiJsonError('id no es un uuid', 400)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const loaded = await loadPublicacion(service, id)
  if (loaded.error) return apiJsonError(loaded.error.message, 500)
  if (!loaded.data) return apiJsonError('Publicación no encontrada', 404)

  const marcaId = typeof loaded.data.marca_id === 'string' ? loaded.data.marca_id : ''
  const denied = denyMarcaAcceso(auth.member, marcaId)
  if (denied) return denied

  return NextResponse.json({ ok: true, publicacion: shapePublicacion(loaded.data) })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await gate(request, true)
  if ('response' in auth) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) return apiJsonError('id no es un uuid', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJsonError('Body JSON inválido', 400)
  }
  const parsed = parsePublicacionPatch(body)
  if (!parsed.ok) return apiJsonError(parsed.error, 400)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const loaded = await loadPublicacion(service, id)
  if (loaded.error) return apiJsonError(loaded.error.message, 500)
  if (!loaded.data) return apiJsonError('Publicación no encontrada', 404)

  const marcaId = typeof loaded.data.marca_id === 'string' ? loaded.data.marca_id : ''
  const denied = denyMarcaAcceso(auth.member, marcaId)
  if (denied) return denied

  const update: Record<string, unknown> = { ...parsed.patch, updated_by: auth.member.userId }
  const optional = OPTIONAL_COLS.filter((col) => col in update)
  for (let attempt = 0; attempt <= optional.length; attempt++) {
    const { error } = await service.from('publicaciones').update(update).eq('id', id)
    if (!error) break
    if (!isMissingColumn(error) || attempt === optional.length) {
      return apiJsonError(error.message, 500)
    }
    const message = error.message ?? ''
    const offending = optional.find((col) => col in update && message.includes(col))
    if (!offending) return apiJsonError(error.message, 500)
    delete update[offending]
    if (Object.keys(update).length <= 1) {
      return apiJsonError('Esa columna todavía no está en la base', 400)
    }
  }

  const fresh = await loadPublicacion(service, id)
  if (fresh.error || !fresh.data) return apiJsonError(fresh.error?.message ?? 'No se pudo leer la publicación', 500)
  revalidatePath('/publicaciones')
  revalidatePath(`/publicaciones/${id}`)
  return NextResponse.json({ ok: true, publicacion: shapePublicacion(fresh.data) })
}
