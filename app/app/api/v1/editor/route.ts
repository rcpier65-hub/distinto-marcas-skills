// GET /api/v1/editor
// Cola de edición (solo lectura). El detalle sigue en /editor.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { one, texto, textoOrNull, ymdOrNull } from '@/lib/api/mac-json'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

type Estado = 'editar' | 'aprobar' | 'programar' | 'publicar' | 'publicado' | 'borrador'

const COLA: Estado[] = ['editar', 'aprobar', 'programar', 'publicar', 'borrador']

function normalizeEstado(value: unknown): Estado {
  const s = texto(value).toLowerCase()
  if (s.includes('editar') || s === 'edicion' || s === 'editando') return 'editar'
  if (s.includes('aprobar') || s === 'revisar') return 'aprobar'
  if (s.includes('programar') || s === 'agendar') return 'programar'
  if (s.includes('publicar') && !s.includes('publicado')) return 'publicar'
  if (s.includes('publicado') || s === 'enviado') return 'publicado'
  return 'borrador'
}

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!auth.member.puedeEditor) return apiJsonError('No tienes acceso a Editor', 403)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const full = `
    id, nombre, fecha_publicacion, fecha_edicion, estado, plataformas,
    editor_nombre, es_tarea_diseno, marca:marcas(slug, nombre, emoji_marca)
  `
  let res = await service
    .from('publicaciones')
    .select(full)
    .order('fecha_publicacion', { ascending: false, nullsFirst: false })
    .limit(500)
  if (res.error && /es_tarea_diseno/i.test(res.error.message ?? '')) {
    res = await service
      .from('publicaciones')
      .select(`
        id, nombre, fecha_publicacion, fecha_edicion, estado, plataformas,
        editor_nombre, marca:marcas(slug, nombre, emoji_marca)
      `)
      .order('fecha_publicacion', { ascending: false, nullsFirst: false })
      .limit(500)
  }
  if (res.error) return apiJsonError(res.error.message, 500)

  const conteos: Record<Estado, number> = {
    editar: 0,
    aprobar: 0,
    programar: 0,
    publicar: 0,
    publicado: 0,
    borrador: 0,
  }
  const base = appBase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const piezas = ((res.data ?? []) as any[]).flatMap((row) => {
    if (row.es_tarea_diseno === true && !row.fecha_publicacion) return []
    const estado = normalizeEstado(row.estado)
    conteos[estado] += 1
    if (!COLA.includes(estado)) return []
    const marca = one(row.marca)
    return [{
      id: String(row.id),
      nombre: texto(row.nombre, 'Sin título'),
      estado,
      fecha: ymdOrNull(row.fecha_edicion) ?? ymdOrNull(row.fecha_publicacion),
      editor_nombre: textoOrNull(row.editor_nombre),
      plataformas: Array.isArray(row.plataformas) ? row.plataformas.filter((p: unknown) => typeof p === 'string') : [],
      marca: marca
        ? {
            slug: texto(marca.slug),
            nombre: texto(marca.nombre, texto(marca.slug, 'Marca')),
            emoji: textoOrNull(marca.emoji_marca),
          }
        : null,
      link: `${base}/editor`,
    }]
  }).slice(0, 180)

  return NextResponse.json({
    ok: true,
    total: piezas.length,
    conteos,
    piezas,
  })
}
