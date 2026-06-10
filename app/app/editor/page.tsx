// app/app/editor/page.tsx
//
// Vista Editor — tabla densa estilo Linear con edición INLINE de todas
// las columnas (nombre, editor, estado, fechas, enlace tomas), botón
// "Editar hoy" por fila, filtro "Mi trabajo para hoy", y dashboard de
// métricas arriba.
//
// Iter 2 (esta versión) — datos REALES de Supabase, persistencia con
// server actions, métricas calculadas server-side.
//
// Fix del bug "el editor no sale": el sync de Notion guarda
// editor_nombre (string) pero NO editor_id (FK). Acá hacemos lookup
// case-insensitive: cuando editor_id es null pero editor_nombre tiene
// algo, buscamos el editor por nombre y devolvemos el id correcto.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { EditorView } from '@/components/views/EditorView'
import type { EditorEntry, EditorOption, EstadoPub } from '@/lib/editor/types'

export const dynamic = 'force-dynamic'
/* El sync de Notion (acción sincronizarNotionDirecto) puede tardar ~1-2 min.
   Damos hasta 5 min a las funciones de esta ruta para que no haga timeout. */
export const maxDuration = 300

/* Paleta de colores para asignar a editores que no tienen color en BD.
   Estable por nombre (mismo nombre → mismo color), así no cambia entre
   refrescos. */
const EDITOR_COLORS = ['#a78bfa', '#fb7185', '#60a5fa', '#fbbf24', '#34d399', '#f472b6', '#22d3ee', '#fde047']

function colorForName(nombre: string): string {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xffffffff
  return EDITOR_COLORS[Math.abs(hash) % EDITOR_COLORS.length]
}

function normalizeEstado(estadoBD: string | null | undefined): EstadoPub {
  const s = (estadoBD ?? '').toLowerCase().trim()
  if (s.includes('editar') || s === 'edicion' || s === 'editando') return 'editar'
  if (s.includes('aprobar') || s === 'revisar') return 'aprobar'
  if (s.includes('programar') || s === 'agendar') return 'programar'
  if (s.includes('publicar')) return 'publicar'
  if (s.includes('publicado') || s === 'enviado') return 'publicado'
  return 'borrador'
}

function abbreviatePlataforma(p: string): string {
  const u = p.toLowerCase()
  if (u.includes('insta')) return 'IG'
  if (u.includes('face')) return 'FB'
  if (u.includes('tik')) return 'TT'
  if (u.includes('linke')) return 'LI'
  if (u.includes('you')) return 'YT'
  return p.slice(0, 2).toUpperCase()
}

export default async function EditorPage() {
  await requireUser()
  /* Route guard: Ailyn (diseñadora) no debe poder llegar acá por URL */
  const { ensureAccesoModulo } = await import('@/lib/team/permisos-helper')
  await ensureAccesoModulo('editor')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Traemos publicaciones, editores y marcas en paralelo. Solo pedimos
     las columnas que la UI realmente usa para mantener el payload chico. */
  const [pubsResult, editoresResult, marcasResult] = await Promise.all([
    service
      .from('publicaciones')
      .select(`
        id, nombre, fecha_publicacion, fecha_edicion, estado, plataformas,
        editor_id, editor_nombre, enlace_tomas, guion, fecha_marcada_para_editar,
        iniciado_edicion_at, editado_at,
        marca:marcas(slug)
      `)
      .order('fecha_publicacion', { ascending: true, nullsFirst: false })
      .limit(500),
    service
      .from('editores')
      .select('id, nombre, activo')
      .eq('activo', true)
      .order('nombre'),
    service
      .from('marcas')
      .select('id, slug, nombre, color_primario_hex, emoji_marca'),
  ])

  /* Si alguna columna de las migrations recientes no existe (026 o 027),
     reintentamos sin esas columnas. Las features asociadas se
     deshabilitan en UI pero el resto sigue funcionando.
     026 = fecha_marcada_para_editar (Editar hoy)
     027 = iniciado_edicion_at + editado_at (tiempo edición + reporte) */
  let pubs = pubsResult.data
  let marcaMigrationPendiente = false
  /* Reintenta con columnas base ante CUALQUIER error de la primera query
     (columna nueva ausente, timeout puntual, etc.) para que el editor NUNCA
     quede vacío por un fallo de fetch. Si el error es por columnas de
     migrations recientes, marcamos el flag para avisar en la UI. */
  if (pubsResult.error) {
    marcaMigrationPendiente =
      pubsResult.error.code === '42703' ||
      /fecha_marcada_para_editar|iniciado_edicion_at|editado_at/i.test(pubsResult.error.message ?? '')
    const retry = await service
      .from('publicaciones')
      .select(`
        id, nombre, fecha_publicacion, fecha_edicion, estado, plataformas,
        editor_id, editor_nombre, enlace_tomas, guion,
        marca:marcas(slug)
      `)
      .order('fecha_publicacion', { ascending: true, nullsFirst: false })
      .limit(500)
    pubs = retry.data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editoresRaw: { id: string; nombre: string }[] = (editoresResult.data ?? []) as any[]
  const editores: EditorOption[] = editoresRaw.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    color: colorForName(e.nombre),
  }))

  /* Lookup case-insensitive de editor_id por editor_nombre. Necesario
     porque el sync de Notion guarda solo editor_nombre. */
  const editorByName = new Map(editoresRaw.map((e) => [e.nombre.toLowerCase().trim(), e.id]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: EditorEntry[] = (pubs ?? []).map((r: any) => {
    const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
    /* Resuelve editor_id: si la columna está vacía pero hay
       editor_nombre del sync de Notion, buscamos el id por nombre. */
    let editorId: string | null = r.editor_id ?? null
    if (!editorId && r.editor_nombre) {
      editorId = editorByName.get(String(r.editor_nombre).toLowerCase().trim()) ?? null
    }

    return {
      id: r.id,
      marcaSlug: marca?.slug ?? 'unknown',
      nombreTarea: r.nombre,
      editorId,
      editorNombre: r.editor_nombre ?? null,
      grillaFit: r.fecha_publicacion ?? new Date().toISOString().slice(0, 10),
      estado: normalizeEstado(r.estado),
      estadoRaw: r.estado ?? null,
      fechaEdicion: r.fecha_edicion ?? r.fecha_publicacion ?? new Date().toISOString().slice(0, 10),
      plataformas: (r.plataformas ?? []).map(abbreviatePlataforma),
      enlaceTomas: r.enlace_tomas ?? null,
      guion: r.guion ?? null,
      fechaMarcadaParaEditar: r.fecha_marcada_para_editar ?? null,
      iniciadoEdicionAt: r.iniciado_edicion_at ?? null,
      editadoAt: r.editado_at ?? null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasResult.data ?? []) as any[]

  return (
    <EditorView
      entries={entries}
      editores={editores}
      marcas={marcas.map((m) => ({
        id: m.id,
        slug: m.slug,
        nombre: m.nombre,
        nombreCorto: m.nombre,
        color: m.color_primario_hex ?? '#737373',
        emoji: m.emoji_marca ?? null,
      }))}
      marcaMigrationPendiente={marcaMigrationPendiente}
    />
  )
}
