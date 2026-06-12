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

type SP = { nuevo?: string; marca?: string }

export default async function DisenoPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  /* Route guard: Pieer (editor) o Lorena (CM) sin acceso a diseño */
  const { ensureAccesoModulo } = await import('@/lib/team/permisos-helper')
  await ensureAccesoModulo('diseno')

  /* Pedro: el botón 'Diseñar para esta marca' en /grilla manda con
     ?nuevo=1&marca=slug. Si llega así, abrimos el modal de nueva
     tarea con la marca pre-seleccionada. */
  const sp = await searchParams
  const initialNuevo = sp.nuevo === '1' ? { marcaSlug: sp.marca ?? '' } : null

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

  /* QUERY UNIFICADA basada en el PIPELINE de diseño.
     Una tarea entra a /diseno si:
       - estado_publicacion = 'disenar' (etapa diseño)
       - portada_lista = false (filtro Notion-style "Diseño Ailyn")

     IMPORTANTE: NO filtramos las archivadas a nivel servidor.
     Pedro pidió que el Kanban tenga columna "Archivado" como 4ta
     bucket; si las filtráramos acá, esa columna quedaría vacía y
     las tareas "desaparecerían" al archivarlas.
     La tabla las oculta cliente-side con filters.mostrarArchivadas
     (default false); el Kanban las muestra siempre. */
  /* MODELO PEDRO (como su Notion): Diseño es una BASE DE DATOS APARTE.
     Solo muestra tareas creadas en este módulo (es_tarea_diseno=true).
     Las publicaciones del pipeline que pasan por etapa 'disenar'
     (sincronizadas de Notion) NO aparecen acá — antes contaminaban el
     tablero de Ailyn con ~110 pubs que no eran suyas.
     La tarea de diseño 'para publicar' SÍ está vinculada al pipeline
     (tiene fecha_publicacion) pero sigue viva acá aunque avance de
     estado — su ciclo en Diseño lo maneja estado_tarea (sub-estado). */
  let res = await service
    .from('publicaciones')
    .select(SELECT)
    .eq('es_tarea_diseno', true)
    .order('fecha_diseno', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1000)

  let migrationPendiente = false
  /* Defensive: si descripcion/fecha_entrega/es_tarea_diseno no existen,
     reintentamos con el filtro viejo para no romper la página. */
  if (
    res.error?.code === '42703' ||
    /descripcion|fecha_entrega|fecha_marcada_para_disenar|es_tarea_diseno/i.test(res.error?.message ?? '')
  ) {
    migrationPendiente = true
    res = await service
      .from('publicaciones')
      .select(FALLBACK_SELECT)
      .eq('estado', 'disenar')
      .eq('portada_lista', false)
      .order('fecha_diseno', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1000)
  }
  const resA = res
  const resB = { data: [] as unknown[], error: null as null }

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
      initialNuevo={initialNuevo}
    />
  )
}
