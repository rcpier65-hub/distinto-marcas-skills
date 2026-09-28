// GET /api/v1/publicaciones
//   ?desde=YYYY-MM-DD   (opcional, junto con hasta)
//   ?hasta=YYYY-MM-DD
//   ?marca=<slug>       (opcional; 404 si el slug no existe, 403 si está fuera de marcas_acceso)
//
// Lista de solo lectura para el Mac. Por defecto: 21 días atrás y 45 adelante
// (Lima). Misma normalización de estado/tipo que /publicaciones y el mismo
// permiso de módulo. No incluye el mock de la web.
// Auth: Bearer <supabase access_token> o Bearer dst_live_… con alcance owner.

import { NextResponse } from 'next/server'
import { colorDeMarca } from '@/lib/marcas/branding'
import { addDaysYmd, appBase, daysBetweenYmd, isYmd, ymdLima } from '@/lib/api/lima'
import { apiJsonError, denyMarcaAcceso, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const MAX_DAYS = 120

type EstadoPub = 'pendiente' | 'publicando' | 'publicado' | 'error' | 'borrador'
type TipoPub = 'reel' | 'post' | 'carrusel' | 'story' | 'video'
type Red = 'instagram' | 'facebook' | 'tiktok' | 'linkedin'

function normalizeEstado(value: unknown): EstadoPub {
  const v = typeof value === 'string' ? value.toLowerCase().trim() : ''
  if (v === 'publicado' || v === 'enviado') return 'publicado'
  if (v === 'publicando' || v === 'en_proceso') return 'publicando'
  if (v === 'error' || v === 'fallido') return 'error'
  if (v === 'borrador' || v === 'draft') return 'borrador'
  return 'pendiente'
}

function normalizeTipo(value: unknown): TipoPub {
  const v = typeof value === 'string' ? value.toLowerCase() : ''
  if (v.includes('reel')) return 'reel'
  if (v.includes('carrus')) return 'carrusel'
  if (v.includes('story') || v.includes('storie')) return 'story'
  if (v.includes('video')) return 'video'
  return 'post'
}

function normalizeRed(value: string): Red | null {
  const v = value.toLowerCase()
  if (v.includes('insta')) return 'instagram'
  if (v.includes('face')) return 'facebook'
  if (v.includes('tik')) return 'tiktok'
  if (v.includes('linke')) return 'linkedin'
  return null
}

function splitFecha(value: unknown): { fecha: string | null; hora: string | null } {
  if (typeof value !== 'string' || value.length < 10) return { fecha: null, hora: null }
  const fecha = value.slice(0, 10)
  if (!isYmd(fecha)) return { fecha: null, hora: null }
  const time = value.includes('T') ? value.split('T')[1] : ''
  const hora = /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : null
  return { fecha, hora }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member
  if (!member.puedePublicaciones) {
    return apiJsonError('No tienes acceso a Publicaciones', 403)
  }

  const url = new URL(request.url)
  const desdeQ = url.searchParams.get('desde')
  const hastaQ = url.searchParams.get('hasta')
  const hoy = ymdLima()
  let desde = addDaysYmd(hoy, -21)
  let hasta = addDaysYmd(hoy, 45)
  if (desdeQ || hastaQ) {
    if (!isYmd(desdeQ) || !isYmd(hastaQ)) {
      return apiJsonError('desde y hasta tienen que ser YYYY-MM-DD', 400)
    }
    if (desdeQ > hastaQ) return apiJsonError('desde no puede ser posterior a hasta', 400)
    if (daysBetweenYmd(desdeQ, hastaQ) > MAX_DAYS) {
      return apiJsonError('El rango no puede pasar de 120 días', 400)
    }
    desde = desdeQ
    hasta = hastaQ
  }

  const marcaSlug = url.searchParams.get('marca')?.trim() || null

  if (!marcaSlug && member.marcasAcceso && member.marcasAcceso.length === 0) {
    return NextResponse.json({ ok: true, desde, hasta, hoy, marca: null, total: 0, publicaciones: [] })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  let marcaId: string | null = null
  if (marcaSlug) {
    const { data: marca, error: marcaErr } = await service
      .from('marcas')
      .select('id')
      .eq('slug', marcaSlug)
      .maybeSingle()
    if (marcaErr) return apiJsonError(marcaErr.message, 500)
    if (!marca?.id) return apiJsonError(`marca '${marcaSlug}' no existe`, 404)
    marcaId = String(marca.id)
    const denied = denyMarcaAcceso(member, marcaId)
    if (denied) return denied
  }

  const columns = `
    id, nombre, fecha_publicacion, estado, plataformas, tipo_contenido, editor_nombre, marca_id,
    marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
  `
  let query = service
    .from('publicaciones')
    .select(columns)
    .gte('fecha_publicacion', desde)
    .lte('fecha_publicacion', hasta)
    .order('fecha_publicacion', { ascending: true })
    .limit(250)
  if (marcaId) query = query.eq('marca_id', marcaId)
  else if (member.marcasAcceso) query = query.in('marca_id', member.marcasAcceso)

  const { data, error } = await query
  if (error) return apiJsonError(error.message, 500)

  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publicaciones = ((data ?? []) as any[]).flatMap((row) => {
    const estadoRaw = typeof row.estado === 'string' ? row.estado : ''
    const { fecha, hora } = splitFecha(row.fecha_publicacion)
    if (!fecha) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marca = one<any>(row.marca)
    const slug = typeof marca?.slug === 'string' ? marca.slug : null
    const tipos = Array.isArray(row.tipo_contenido) ? row.tipo_contenido : []
    const plataformas = (Array.isArray(row.plataformas) ? row.plataformas : [])
      .map((item: unknown) => (typeof item === 'string' ? normalizeRed(item) : null))
      .filter((item: Red | null): item is Red => item != null)
    const titulo = typeof row.nombre === 'string' && row.nombre.trim() ? row.nombre.trim() : '(sin título)'
    return [{
      id: String(row.id),
      titulo,
      fecha,
      hora,
      estado: normalizeEstado(estadoRaw),
      tipo: normalizeTipo(tipos[0]),
      plataformas,
      editor: typeof row.editor_nombre === 'string' && row.editor_nombre.trim() ? row.editor_nombre.trim() : null,
      marca: slug
        ? {
            slug,
            nombre: typeof marca.nombre === 'string' && marca.nombre.trim() ? marca.nombre.trim() : slug,
            color: colorDeMarca(slug, typeof marca.color_primario_hex === 'string' ? marca.color_primario_hex : null),
            emoji: typeof marca.emoji_marca === 'string' ? marca.emoji_marca : null,
          }
        : null,
      link: `${base}/publicaciones/${row.id}`,
    }]
  })

  return NextResponse.json({
    ok: true,
    desde,
    hasta,
    hoy,
    marca: marcaSlug,
    total: publicaciones.length,
    publicaciones,
  })
}
