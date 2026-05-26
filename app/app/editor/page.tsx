// app/app/editor/page.tsx
//
// Vista Editor estilo Notion-like (tabla densa con columnas: proyecto,
// nombre tarea, editor, grilla FIT, estado, fecha edición, plataformas).
// Replica el screenshot Notion que Pedro pidió, pero adentro de la app
// con el nuevo design system Linear/Raycast.
//
// Data: intenta fetch de Supabase. Si falla (ej. dev local sin env vars),
// cae a mock data realista que copia las tareas del screenshot.
// Iter 1: read-only. Iter 2: chips editables con writes a Supabase.

import { EditorView } from '@/components/views/EditorView'
import {
  EDITOR_ENTRIES_MOCK,
  type EditorEntryMock,
  type EstadoPub,
} from '@/lib/mock-editor'

export const dynamic = 'force-dynamic'

/* Mapear estados de BD (pueden diferir del enum de UI) a EstadoPub */
function normalizeEstado(estadoBD: string | null | undefined): EstadoPub {
  const s = (estadoBD ?? '').toLowerCase().trim()
  if (s.includes('editar') || s === 'edicion') return 'editar'
  if (s.includes('aprobar') || s === 'revisar') return 'aprobar'
  if (s.includes('programar') || s === 'agendar') return 'programar'
  if (s.includes('publicar')) return 'publicar'
  if (s.includes('publicado') || s === 'enviado') return 'publicado'
  return 'borrador'
}

async function fetchFromSupabase(): Promise<EditorEntryMock[] | null> {
  try {
    /* Lazy imports — si la lib falla por env vars vacías, el try/catch
       captura sin crashear el server component. */
    const { createServiceClient } = await import('@/lib/supabase/service')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any

    type RawRow = {
      id: string
      nombre: string
      fecha_publicacion: string | null
      estado: string | null
      estado_tarea: string | null
      plataformas: string[] | null
      editor_id: string | null
      updated_at: string | null
      marca: { slug: string } | { slug: string }[] | null
    }

    const { data, error } = await service
      .from('publicaciones')
      .select(`
        id, nombre, fecha_publicacion, estado, estado_tarea, plataformas,
        editor_id, updated_at,
        marca:marcas(slug)
      `)
      .order('fecha_publicacion', { ascending: false, nullsFirst: false })
      .limit(200)
    if (error || !data) return null
    return (data as RawRow[]).map((r) => {
      const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
      const platformsAbbr = (r.plataformas ?? []).map((p) => {
        const u = p.toLowerCase()
        if (u.includes('insta')) return 'IG'
        if (u.includes('face')) return 'FB'
        if (u.includes('tik')) return 'TT'
        if (u.includes('linke')) return 'LI'
        return p.slice(0, 2).toUpperCase()
      })
      return {
        id: r.id,
        marcaSlug: marca?.slug ?? 'unknown',
        nombreTarea: r.nombre,
        editorId: r.editor_id,
        grillaFit: r.fecha_publicacion ?? new Date().toISOString().slice(0, 10),
        estado: normalizeEstado(r.estado),
        fechaEdicion: (r.updated_at ?? new Date().toISOString()).slice(0, 10),
        plataformas: platformsAbbr,
      }
    })
  } catch {
    return null
  }
}

export default async function EditorPage() {
  const entries = (await fetchFromSupabase()) ?? EDITOR_ENTRIES_MOCK
  return <EditorView entries={entries} />
}
