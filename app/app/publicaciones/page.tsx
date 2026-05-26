// app/app/publicaciones/page.tsx
//
// Nueva vista con tabs Calendario | Listado. Reemplaza la vista
// vieja de cards. Default tab: Listado (Pedro pidió "listado ayuda
// a entender mejor"). Calendario muestra grid mensual con dots
// coloreados por marca.
//
// Server component: intenta fetch Supabase, fallback mock.

import { PublicacionesView } from '@/components/views/PublicacionesView'
import {
  PUBLICACIONES_MOCK,
  type PublicacionMock,
  type EstadoPubMetricool,
  type Red,
  type TipoContenido,
} from '@/lib/mock-publicaciones'

export const dynamic = 'force-dynamic'

function normalizeEstadoPub(s: string | null | undefined): EstadoPubMetricool {
  const v = (s ?? '').toLowerCase().trim()
  if (v === 'publicado' || v === 'enviado') return 'publicado'
  if (v === 'publicando' || v === 'en_proceso') return 'publicando'
  if (v === 'error' || v === 'fallido') return 'error'
  if (v === 'borrador' || v === 'draft') return 'borrador'
  return 'pendiente'
}

function normalizeRed(r: string): Red | null {
  const v = r.toLowerCase()
  if (v.includes('insta')) return 'instagram'
  if (v.includes('face')) return 'facebook'
  if (v.includes('tik')) return 'tiktok'
  if (v.includes('linke')) return 'linkedin'
  return null
}

function normalizeTipo(t: string | null | undefined): TipoContenido {
  const v = (t ?? '').toLowerCase()
  if (v.includes('reel')) return 'reel'
  if (v.includes('carrus')) return 'carrusel'
  if (v.includes('story') || v.includes('storie')) return 'story'
  if (v.includes('video')) return 'video'
  return 'post'
}

async function fetchFromSupabase(): Promise<PublicacionMock[] | null> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    type RawRow = {
      id: string
      nombre: string
      fecha_publicacion: string | null
      hora_publicacion: string | null
      estado: string | null
      plataformas: string[] | null
      tipo_contenido: string[] | null
      copy: string | null
      editor_id: string | null
      marca: { slug: string } | { slug: string }[] | null
    }
    const { data, error } = await service
      .from('publicaciones')
      .select(`
        id, nombre, fecha_publicacion, hora_publicacion, estado,
        plataformas, tipo_contenido, copy, editor_id,
        marca:marcas(slug)
      `)
      .order('fecha_publicacion', { ascending: false, nullsFirst: false })
      .limit(200)
    if (error || !data) return null
    return (data as RawRow[]).map((r) => {
      const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
      const redes = (r.plataformas ?? []).map(normalizeRed).filter(Boolean) as Red[]
      const tipo = normalizeTipo((r.tipo_contenido ?? [])[0])
      return {
        id: r.id,
        marcaSlug: marca?.slug ?? 'unknown',
        fecha: r.fecha_publicacion ?? new Date().toISOString().slice(0, 10),
        hora: (r.hora_publicacion ?? '12:00').slice(0, 5),
        caption: r.copy ?? r.nombre ?? '(sin título)',
        thumbnail: null,
        redes,
        tipo,
        estado: normalizeEstadoPub(r.estado),
        editorId: r.editor_id,
      }
    })
  } catch {
    return null
  }
}

export default async function PublicacionesPage() {
  const pubs = (await fetchFromSupabase()) ?? PUBLICACIONES_MOCK
  return <PublicacionesView publicaciones={pubs} />
}
