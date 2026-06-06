// app/app/diseno/page.tsx
//
// Vista Diseño v2 (rediseño Pedro 2026-06-05):
//   - Carga publicaciones con fecha_diseno en mayo+junio 2026 OR
//     tareas standalone (marca = 'interno') sin fecha
//   - Excluye archivadas por default — el filtro está client-side y
//     se puede invertir con toggle
//   - Trae descripcion + fecha_entrega (columnas nuevas, defensive
//     retry sin ellas si la migration aún no se aplicó)

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { DisenoView } from '@/components/views/DisenoView'
import type { DisenoEntry, EstadoPub } from '@/lib/diseno/types'
import { normalizeSubEstado } from '@/lib/diseno/types'

export const dynamic = 'force-dynamic'

const DESDE = '2026-05-01'
const HASTA = '2026-06-30'

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

  /* Traemos:
     - Las publicaciones con fecha_diseno en mayo+junio (sin importar
       si tienen fecha_publicacion). Esto incluye tareas para publicar
       y standalone que ya tienen fecha de diseño asignada.
     - Las publicaciones de marca='interno' SIN fecha_diseno (Manual
       de marca recién creada que no tiene fecha aún) — útil para no
       perderlas en el módulo.
     - Todas las marcas para el dropdown del modal. */
  const SELECT = `
    id, nombre, descripcion,
    fecha_publicacion, fecha_diseno, fecha_entrega,
    estado, estado_tarea,
    plataformas, tipo_contenido,
    fecha_marcada_para_disenar,
    started_at, archived_at,
    marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
  `
  const FALLBACK_SELECT = `
    id, nombre,
    fecha_publicacion, fecha_diseno,
    estado, estado_tarea,
    plataformas, tipo_contenido,
    marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
  `

  /* Antes el query B usaba `.eq('marca.slug', 'interno')` con dot-notation
     sobre la tabla relacionada. PostgREST NO interpreta eso como filter
     INNER — termina trayendo TODAS las pubs sin fecha_diseno (~65) que
     no son internas. Pedro las vió todas en el Kanban (POST DIA DE LA
     MADRE, 6. EDAD DIAGNOSTICO, etc.) como "unknown" porque el JOIN
     fallaba con el filter mal aplicado.
     Fix: resolver el id de la marca 'interno' como UUID primero y
     usar `.eq('marca_id', internoId)` que SÍ filtra correctamente. */
  const { data: internoRow } = await service
    .from('marcas')
    .select('id')
    .eq('slug', 'interno')
    .maybeSingle()
  const internoId = internoRow?.id ?? null

  /* Query A: con fecha_diseno en rango Y portada NO lista Y no archivada.
     Replica el filtro de la vista "Diseño Ailyn" de Notion + excluye
     archivadas (el campo estado_tarea sólo tiene 'sin_empezar' |
     'en_progreso' | 'listo' | 'archivado'). */
  let queryA = service
    .from('publicaciones')
    .select(SELECT)
    .not('fecha_diseno', 'is', null)
    .gte('fecha_diseno', DESDE)
    .lte('fecha_diseno', HASTA)
    .eq('portada_lista', false)
    .neq('estado_tarea', 'archivado')
    .order('fecha_diseno', { ascending: true })
    .limit(500)
  let resA = await queryA

  /* Query B: tareas internas SIN fecha_diseno (recién creadas desde el
     modal "+ Nueva tarea" antes de asignarles fecha). Filtramos por
     marca_id (uuid) — NO por marca.slug — y excluimos archivadas. Si
     internoId es null (marca no creada aún → migration 21 pendiente),
     omitimos la query B. */
  let resB: { data: unknown[] | null; error: { code?: string; message?: string } | null } =
    { data: [], error: null }
  if (internoId) {
    const queryB = service
      .from('publicaciones')
      .select(SELECT)
      .is('fecha_diseno', null)
      .eq('marca_id', internoId)
      .eq('portada_lista', false)
      .neq('estado_tarea', 'archivado')
      .order('created_at', { ascending: false })
      .limit(100)
    resB = await queryB
  }

  let migrationPendiente = false
  /* Defensive: si descripcion/fecha_entrega no existen, reintentamos */
  if (
    resA.error?.code === '42703' ||
    /descripcion|fecha_entrega|fecha_marcada_para_disenar/i.test(resA.error?.message ?? '')
  ) {
    migrationPendiente = true
    queryA = service
      .from('publicaciones')
      .select(FALLBACK_SELECT)
      .not('fecha_diseno', 'is', null)
      .gte('fecha_diseno', DESDE)
      .lte('fecha_diseno', HASTA)
      .eq('portada_lista', false)
      .neq('estado_tarea', 'archivado')
      .order('fecha_diseno', { ascending: true })
      .limit(500)
    resA = await queryA
    if (internoId) {
      const queryB2 = service
        .from('publicaciones')
        .select(FALLBACK_SELECT)
        .is('fecha_diseno', null)
        .eq('marca_id', internoId)
        .eq('portada_lista', false)
        .neq('estado_tarea', 'archivado')
        .order('id', { ascending: false })
        .limit(100)
      resB = await queryB2
    } else {
      resB = { data: [], error: null }
    }
  }

  /* Marcas para el modal de nueva tarea — excluye la "interno" del
     dropdown porque ese es el bucket default cuando NO eligen marca. */
  const marcasResult = await service
    .from('marcas')
    .select('id, slug, nombre, color_primario_hex, emoji_marca')
    .neq('slug', 'interno')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowsA = (resA.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowsB = (resB.data ?? []) as any[]
  // Dedup por id (por si Query B trae uno que también está en A)
  const seen = new Set<string>()
  const allRows = [...rowsA, ...rowsB].filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: DisenoEntry[] = allRows.map((r: any) => {
    const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
    const slug = marca?.slug ?? 'unknown'
    return {
      id: r.id,
      marcaSlug: slug,
      marcaNombre: marca?.nombre ?? slug,
      marcaColor: marca?.color_primario_hex ?? '#737373',
      marcaEmoji: marca?.emoji_marca ?? null,
      esInterno: slug === 'interno',
      nombreTarea: r.nombre,
      descripcion: r.descripcion ?? null,
      fechaPublicacion: r.fecha_publicacion ?? null,
      fechaDiseno: r.fecha_diseno ?? null,
      fechaEntrega: r.fecha_entrega ?? null,
      estado: normalizeEstado(r.estado),
      subEstado: normalizeSubEstado(r.estado_tarea),
      plataformas: (r.plataformas ?? []).map(abbreviatePlataforma),
      tipoContenido: r.tipo_contenido ?? [],
      fechaMarcadaParaDisenar: r.fecha_marcada_para_disenar ?? null,
      startedAt: r.started_at ?? null,
      archivedAt: r.archived_at ?? null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasResult.data ?? []) as any[]

  return (
    <DisenoView
      entries={entries}
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
