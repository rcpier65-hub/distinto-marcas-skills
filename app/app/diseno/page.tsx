// app/app/diseno/page.tsx
//
// Vista Diseño — espejo del módulo /editor pero filtrada por las
// tareas que necesitan diseño (fecha_diseno IS NOT NULL).
//
// Pedro pidió cargar mayo + junio 2026 (rango de la skill actual del
// flujo de Distinto). Hardcodear el rango aquí está ok como v1; si
// después quiere navegación mes a mes se hace url params como en
// /grabaciones/calendario.
//
// Reusa la tabla `publicaciones`. La columna disenador_id viene de la
// migration 20260605200001 — si todavía no se aplicó, retry-fallback
// sin esa columna y bandera marcaMigrationPendiente.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { DisenoView } from '@/components/views/DisenoView'
import type { DisenoEntry, DisenadorOption, EstadoPub } from '@/lib/diseno/types'
import { normalizeSubEstado } from '@/lib/diseno/types'

export const dynamic = 'force-dynamic'

/* Rango temporal default — mayo + junio 2026. Pedro lo pidió explícito.
   Cuando agreguemos navegación por mes, este rango sale a URL params. */
const DESDE = '2026-05-01'
const HASTA = '2026-06-30'

/* Paleta para asignar a diseñadores que no tienen color_hex en BD.
   Hash estable por nombre para que no cambie entre refrescos. */
const COLORS = ['#a78bfa', '#fb7185', '#60a5fa', '#fbbf24', '#34d399', '#f472b6', '#22d3ee', '#fde047']
function colorForName(nombre: string): string {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) & 0xffffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

function normalizeEstado(estadoBD: string | null | undefined): EstadoPub {
  const s = (estadoBD ?? '').toLowerCase().trim()
  if (s.includes('disenar') || s.includes('diseñar') || s === 'diseno') return 'disenar'
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

export default async function DisenoPage() {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Query: publicaciones con fecha_diseno en el rango + diseñadores
     activos + todas las marcas. Solo columnas que la UI usa para
     mantener el payload bajo. */
  const [pubsResult, disenadoresResult, marcasResult] = await Promise.all([
    service
      .from('publicaciones')
      .select(`
        id, nombre, fecha_publicacion, fecha_diseno, estado, estado_tarea,
        plataformas, tipo_contenido,
        disenador_id, disenador_nombre,
        portada_cruda_url, portada_editada_url,
        portada_lista, disenado,
        fecha_marcada_para_disenar,
        marca:marcas(slug)
      `)
      .not('fecha_diseno', 'is', null)
      .gte('fecha_diseno', DESDE)
      .lte('fecha_diseno', HASTA)
      .order('fecha_diseno', { ascending: true })
      .limit(500),
    service
      .from('disenadores')
      .select('id, nombre, activo, color_hex')
      .eq('activo', true)
      .order('nombre'),
    service
      .from('marcas')
      .select('id, slug, nombre, color_primario_hex, emoji_marca'),
  ])

  /* Fallback: si la migration 20260605200001 todavía no corrió, las
     columnas disenador_* y fecha_marcada_para_disenar no existen.
     Reintentamos sin esos campos y mostramos banner. */
  let pubs = pubsResult.data
  let migrationPendiente = false
  if (
    pubsResult.error?.code === '42703' ||
    /disenador_|fecha_marcada_para_disenar/i.test(pubsResult.error?.message ?? '')
  ) {
    migrationPendiente = true
    const retry = await service
      .from('publicaciones')
      .select(`
        id, nombre, fecha_publicacion, fecha_diseno, estado, estado_tarea,
        plataformas, tipo_contenido,
        portada_cruda_url, portada_editada_url,
        portada_lista, disenado,
        marca:marcas(slug)
      `)
      .not('fecha_diseno', 'is', null)
      .gte('fecha_diseno', DESDE)
      .lte('fecha_diseno', HASTA)
      .order('fecha_diseno', { ascending: true })
      .limit(500)
    pubs = retry.data
  }

  // Si la tabla disenadores tampoco existe (mismo escenario pre-migration)
  // disenadoresResult.error → tratamos como lista vacía.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const disenadoresRaw: { id: string; nombre: string; color_hex: string | null }[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (disenadoresResult.data ?? []) as any[]
  const disenadores: DisenadorOption[] = disenadoresRaw.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    color: d.color_hex ?? colorForName(d.nombre),
  }))

  /* Lookup case-insensitive nombre → id para resolver disenador_id
     cuando viene solo el nombre del sync de Notion. */
  const disenadorByName = new Map(disenadoresRaw.map((d) => [d.nombre.toLowerCase().trim(), d.id]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: DisenoEntry[] = (pubs ?? []).map((r: any) => {
    const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
    let disenadorId: string | null = r.disenador_id ?? null
    if (!disenadorId && r.disenador_nombre) {
      disenadorId = disenadorByName.get(String(r.disenador_nombre).toLowerCase().trim()) ?? null
    }

    return {
      id: r.id,
      marcaSlug: marca?.slug ?? 'unknown',
      nombreTarea: r.nombre,
      disenadorId,
      disenadorNombre: r.disenador_nombre ?? null,
      fechaPublicacion: r.fecha_publicacion ?? null,
      fechaDiseno: r.fecha_diseno,  // garantizado por el .not('is', null)
      estado: normalizeEstado(r.estado),
      subEstado: normalizeSubEstado(r.estado_tarea),
      plataformas: (r.plataformas ?? []).map(abbreviatePlataforma),
      tipoContenido: r.tipo_contenido ?? [],
      portadaCrudaUrl: r.portada_cruda_url ?? null,
      portadaEditadaUrl: r.portada_editada_url ?? null,
      portadaLista: r.portada_lista ?? false,
      disenado: r.disenado ?? false,
      fechaMarcadaParaDisenar: r.fecha_marcada_para_disenar ?? null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasResult.data ?? []) as any[]

  return (
    <DisenoView
      entries={entries}
      disenadores={disenadores}
      marcas={marcas.map((m) => ({
        slug: m.slug,
        nombre: m.nombre,
        color: m.color_primario_hex ?? '#737373',
        emoji: m.emoji_marca ?? null,
      }))}
      migrationPendiente={migrationPendiente}
      rangoDesde={DESDE}
      rangoHasta={HASTA}
    />
  )
}
