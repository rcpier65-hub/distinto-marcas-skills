'use client'

/* DisenoView v2 — rediseño según feedback Pedro 2026-06-05:
 *
 * Cambios respecto a v1:
 *   - Toggle vista Tabla | Kanban
 *   - Tabla: columnas reducidas (Proyecto, Tarea, Descripción,
 *     Fecha entrega, Fecha diseño, Sub-estado, Diseñar HOY)
 *   - Sub-estado: Sin empezar | En progreso | Listo | Archivado
 *     (archivadas no se muestran por default)
 *   - Botón "+ Nueva tarea" abre modal con formulario condicional
 *     (¿es para publicar?)
 *   - Kanban: 3 columnas con drag-and-drop HTML5 nativo
 *   - Quitado: Diseñador, Publicación, Portada lista, Diseñado
 */

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Palette as IcoPaleta, ImageIcon as IcoPost, GalleryHorizontalEnd as IcoCarrusel, CircleFadingPlus as IcoHistoria, Briefcase as IcoInterno, X as IcoX, CalendarDays as IcoCal, Video as IcoVideo, Sun as IcoHoy, Check as IcoCheck, ChevronDown as IcoChevron, Sparkles as IcoMagia, Loader2 as IcoCargando, Clock as IcoReloj, ChevronLeft as IcoAnt, ChevronRight as IcoSig, Plus as IcoMas, Link2 as IcoLink, Trash2 as IcoBorrar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MarcaSelect } from '@/components/marca-select'
import { calendarioMarcaParaDiseno, crearEntregables, type PubCalendario } from '@/app/diseno/_entregables-actions'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { hoyLima } from '@/lib/fechas/hoy'
import {
  updateDisenoEntry,
  marcarParaDisenarHoy,
  desmarcarParaDisenarHoy,
  archivarTarea,
  crearDisenoTask,
  obtenerCorreosDeMarca,
  interpretarReunionEntrega, agendarReunionEntrega,
} from '@/app/diseno/_actions'
import {
  type DisenoEntry,
  type EstadoPub,
  type SubEstadoDiseno,
  type AlertaFecha,
  calcularAlertaFecha,
  formatDateTimeES,
  formatDuracion,
} from '@/lib/diseno/types'

/* ============================================================
   Constantes UI
   ============================================================ */

const SUBESTADO_CONFIG: Record<SubEstadoDiseno, { label: string; color: string; bg: string }> = {
  sin_empezar:  { label: 'Sin empezar', color: '#737373', bg: 'rgba(115, 115, 115, 0.14)' },
  en_progreso:  { label: 'En progreso', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.14)' },
  pausada:      { label: 'Pausada',     color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' },
  listo:        { label: 'Listo',       color: '#34d399', bg: 'rgba(52, 211, 153, 0.14)' },
  enviado:      { label: 'Enviado',     color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.14)' },
  archivado:    { label: 'Archivado',   color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.10)' },
}

/* Orden de columnas del kanban = flujo completo de Aylin:
   Sin empezar → En progreso → Pausada (no avanza) → Listo → Enviado →
   Archivado. Todas las etapas son columnas para que NINGUNA card
   desaparezca al cambiarle el estado. */
const KANBAN_COLUMNS: SubEstadoDiseno[] = ['sin_empezar', 'en_progreso', 'pausada', 'listo', 'enviado', 'archivado']

const ALERTA_COLOR: Record<AlertaFecha, { fg: string; bg: string; label: string }> = {
  rojo:     { fg: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)', label: 'urgente' },
  amarillo: { fg: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)',  label: 'atención' },
  verde:    { fg: '#34d399', bg: 'rgba(52, 211, 153, 0.10)',  label: 'a tiempo' },
}

function formatDateES(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}

/* ============================================================
   Tipos públicos
   ============================================================ */

export type MarcaOption = {
  slug: string
  nombre: string
  color: string
  emoji: string | null
}

type SortField = 'marca' | 'nombre' | 'fechaDiseno' | 'fechaEntrega' | 'subEstado'
type SortDir = 'asc' | 'desc'
type Vista = 'tabla' | 'kanban'

type Filters = {
  subEstado: SubEstadoDiseno | 'activas'  // activas = todas menos archivado
  marcaSlug: string | 'todas'
  soloHoy: boolean
  mostrarArchivadas: boolean
  /* Filtro por fecha (Pedro 23-jun-2026: "saber qué se hizo en tal fecha o
     rangos"). Ambos en formato YYYY-MM-DD; '' = sin límite por ese lado.
     desde===hasta ⇒ un solo día. Se filtra por la fecha "relevante" de la
     tarea (ver fechaRelevante). */
  desde: string
  hasta: string
}

/* Fecha "relevante" de una tarea para el filtro de fechas: priorizamos la
   fecha de diseño (la que se ve en las tarjetas del Kanban), con respaldo a
   entrega y luego publicación, para no esconder tareas que solo tengan una
   de esas. Si no tiene ninguna, devuelve null. */
function fechaRelevante(e: DisenoEntry): string | null {
  return e.fechaDiseno ?? e.fechaEntrega ?? e.fechaPublicacion ?? null
}

/* ¿La tarea cae dentro del rango [desde, hasta]? Las fechas YYYY-MM-DD se
   comparan como strings (orden lexicográfico === orden cronológico). Una
   tarea SIN fecha relevante NO entra cuando hay filtro de fechas activo. */
function pasaRangoFecha(e: DisenoEntry, desde: string, hasta: string): boolean {
  if (!desde && !hasta) return true
  const f = fechaRelevante(e)
  if (!f) return false
  if (desde && f < desde) return false
  if (hasta && f > hasta) return false
  return true
}

/* Clave para recordar la vista/filtros entre navegaciones (sessionStorage).
   Fix Pedro 15-jun-2026: en "Mi trabajo de hoy" entrabas a una tarea y al
   volver se perdía el filtro. Ahora se restaura al montar. */
const DISENO_VIEW_STATE_KEY = 'diseno-view-state-v1'

type Props = {
  entries: DisenoEntry[]
  marcas: MarcaOption[]
  migrationPendiente?: boolean
  rangoDesde: string
  rangoHasta: string
  /* Si la URL viene con ?nuevo=1 (desde /grilla), abrimos el modal de
     nueva tarea con la marca pre-cargada. */
  initialNuevo?: { marcaSlug: string } | null
}

/* ============================================================
   Component
   ============================================================ */

export function DisenoView({
  entries: initialEntries, marcas, migrationPendiente, rangoDesde, rangoHasta,
  initialNuevo,
}: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [, startTransition] = useTransition()
  /* Default Kanban: Pedro confirmó que es la vista principal del
     diseñador. La tabla queda como vista secundaria para edición masiva. */
  const [vista, setVista] = useState<Vista>('kanban')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({
    subEstado: 'activas',
    marcaSlug: 'todas',
    soloHoy: false,
    mostrarArchivadas: false,
    desde: '',
    hasta: '',
  })
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  /* Restaurar vista/filtros guardados (al montar). Sobrevive a entrar a una
     tarea y volver, al botón "Volver" y a re-entrar desde el menú. El flag
     `restaurado` evita que el efecto de guardado pise el storage con los
     valores por defecto antes de leerlos. */
  const [restaurado, setRestaurado] = useState(false)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISENO_VIEW_STATE_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.vista === 'tabla' || s.vista === 'kanban') setVista(s.vista)
        if (typeof s.search === 'string') setSearch(s.search)
        if (s.filters && typeof s.filters === 'object') {
          setFilters((f) => ({ ...f, ...s.filters }))
        }
      }
    } catch {}
    setRestaurado(true)
  }, [])
  useEffect(() => {
    if (!restaurado) return
    try {
      sessionStorage.setItem(
        DISENO_VIEW_STATE_KEY,
        JSON.stringify({ vista, search, filters }),
      )
    } catch {}
  }, [restaurado, vista, search, filters])

  /* Si la URL trajo ?nuevo=1 (desde el botón en /grilla), abrir el modal
     de creación inmediatamente. Solo la primera vez (luego lo cierra
     manual o tras crear). */
  useEffect(() => {
    if (initialNuevo) setModalOpen(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const marcaBySlug = useMemo(() => new Map(marcas.map((m) => [m.slug, m])), [marcas])
  const hoy = hoyLima() // hora Lima, no UTC (ver lib/fechas/hoy)

  /* ============ Métricas ============ */
  const metricas = useMemo(() => {
    const activas = entries.filter((e) => e.subEstado !== 'archivado')
    const sinEmpezar = activas.filter((e) => e.subEstado === 'sin_empezar').length
    const enProgreso = activas.filter((e) => e.subEstado === 'en_progreso').length
    const listo = activas.filter((e) => e.subEstado === 'listo').length
    const archivadas = entries.filter((e) => e.subEstado === 'archivado').length
    const urgentes = activas.filter((e) =>
      e.subEstado !== 'listo' && calcularAlertaFecha(e.fechaDiseno, e.fechaEntrega) === 'rojo',
    ).length
    const hoyMarcadas = activas.filter((e) => e.fechaMarcadaParaDisenar === hoy).length
    return { sinEmpezar, enProgreso, listo, archivadas, urgentes, hoyMarcadas, total: activas.length }
  }, [entries, hoy])

  /* ============ Filtrado ============ */
  const visible = useMemo(() => {
    let list = entries.filter((e) => {
      if (!filters.mostrarArchivadas && e.subEstado === 'archivado') return false
      if (filters.soloHoy && e.fechaMarcadaParaDisenar !== hoy) return false
      if (filters.subEstado !== 'activas' && e.subEstado !== filters.subEstado) return false
      if (filters.marcaSlug !== 'todas' && !e.marcasTags.some((t) => t.slug === filters.marcaSlug)) return false
      if (!pasaRangoFecha(e, filters.desde, filters.hasta)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !e.nombreTarea.toLowerCase().includes(q) &&
          !e.marcaNombre.toLowerCase().includes(q) &&
          !(e.descripcion ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    if (sort) {
      list = [...list].sort((a, b) => {
        const av = sortValue(a, sort.field)
        const bv = sortValue(b, sort.field)
        if (av < bv) return sort.dir === 'asc' ? -1 : 1
        if (av > bv) return sort.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [entries, filters, search, sort, hoy])

  const hasActiveFilters =
    filters.subEstado !== 'activas' ||
    filters.marcaSlug !== 'todas' ||
    filters.soloHoy ||
    filters.mostrarArchivadas ||
    !!filters.desde ||
    !!filters.hasta ||
    !!search

  /* ============ Persist helper (optimistic + revert) ============ */

  function persist(
    id: string,
    patch: Partial<DisenoEntry>,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    mensaje: string,
  ) {
    const prev = entries.find((e) => e.id === id)
    if (!prev) return
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    startTransition(async () => {
      const r = await action()
      if (!r.ok) {
        setEntries((cur) => cur.map((e) => (e.id === id ? prev : e)))
        toast.error(`Error: ${r.error}`)
      } else {
        toast.success(mensaje, { duration: 1200 })
      }
    })
  }

  function setSubEstado(id: string, subEstado: SubEstadoDiseno) {
    persist(id, { subEstado }, () => updateDisenoEntry(id, { subEstado }), `→ ${SUBESTADO_CONFIG[subEstado].label}`)
  }
  function setNombre(id: string, nombre: string) {
    const t = nombre.trim()
    if (!t) { toast.error('El nombre no puede estar vacío'); return }
    persist(id, { nombreTarea: t }, () => updateDisenoEntry(id, { nombre: t }), 'Renombrada')
  }
  function setDescripcion(id: string, descripcion: string) {
    const t = descripcion.trim()
    persist(id, { descripcion: t || null }, () => updateDisenoEntry(id, { descripcion: t || null }), 'Descripción guardada')
  }
  function setFechaDiseno(id: string, fechaDiseno: string) {
    persist(id, { fechaDiseno }, () => updateDisenoEntry(id, { fechaDiseno }), `Fecha diseño → ${formatDateES(fechaDiseno)}`)
  }
  function setFechaEntrega(id: string, fechaEntrega: string) {
    persist(id, { fechaEntrega }, () => updateDisenoEntry(id, { fechaEntrega }), `Fecha entrega → ${formatDateES(fechaEntrega)}`)
  }
  function archivarVal(id: string, archivar: boolean) {
    const newSub: SubEstadoDiseno = archivar ? 'archivado' : 'sin_empezar'
    persist(id, { subEstado: newSub }, () => archivarTarea(id, archivar), archivar ? 'Archivada 📦' : 'Reactivada')
  }
  function toggleDisenarHoy(id: string, estaMarcada: boolean) {
    /* Bug (23-jun-2026): antes bloqueábamos con `migrationPendiente` + un mensaje
       de disenadores.sql (migración YA aplicada). Pero ese flag se prende por
       `marcas_extra` (OTRA migración, sin correr), NO por la columna que esto
       necesita — `fecha_marcada_para_disenar`, que SÍ existe. Resultado: Ailyn
       no podía marcar "hoy". Quitamos el guard: la acción solo toca esa columna
       (existe) y si algo fallara, `persist` revierte + avisa con el error real. */
    if (estaMarcada) {
      persist(id, { fechaMarcadaParaDisenar: null }, () => desmarcarParaDisenarHoy(id), 'Quitada de "Hoy"')
    } else {
      persist(id, { fechaMarcadaParaDisenar: hoy }, () => marcarParaDisenarHoy(id), 'Agregada a "Hoy"')
    }
  }

  function toggleSort(field: SortField) {
    setSort((s) => {
      if (!s || s.field !== field) return { field, dir: 'asc' }
      if (s.dir === 'asc') return { field, dir: 'desc' }
      return null
    })
  }

  function clearAll() {
    setFilters({ subEstado: 'activas', marcaSlug: 'todas', soloHoy: false, mostrarArchivadas: false, desde: '', hasta: '' })
    setSearch('')
    setSort(null)
  }

  /* Routing del detalle según el tipo de tarea:
     - Tarea para publicar (marca cliente real): vista completa del
       form de publicación con Copy/Música/Portada/Tomas/Guion.
     - Tarea standalone (marca='interno', ej. Manual de marca): vista
       simple con solo lo relevante para diseño puro.
     Pedro pidió que las standalone no se "ensucien" con campos de
     publicación que no aplican. */
  function openRow(id: string) {
    const entry = entries.find((e) => e.id === id)
    // "Para publicar" (tiene fecha de publicación) → vista de publicación completa.
    // Standalone / reunión (sin fecha) → vista simple de diseño, AUNQUE tenga marca.
    if (entry?.fechaPublicacion) {
      router.push(`/publicaciones/${id}`)
    } else {
      router.push(`/diseno/${id}`)
    }
  }

  /* Callback del modal cuando se crea una tarea — la agregamos al
     estado local para que aparezca sin recargar la página. La forma
     "limpia" sería router.refresh(), pero genera flash; el optimistic
     update se siente mejor. */
  function onTareaCreada(nueva: DisenoEntry) {
    setEntries((cur) => cur.some((entry) => entry.id === nueva.id) ? cur : [nueva, ...cur])
    toast.success(`Tarea creada: ${nueva.nombreTarea}`)
    setModalOpen(false)
  }

  return (
    <div className="mk-workview" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--mk-bg-base)' }}>
      {/* HEADER */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
          <span style={{ color: 'var(--mk-text-tertiary)' }}>Publicaciones</span>
          <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>Diseño</span>
          <span style={{ marginLeft: 10, fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-quaternary)' }}>
            {formatDateES(rangoDesde)} → {formatDateES(rangoHasta)}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {migrationPendiente && (
          <span style={{ fontSize: 'var(--mk-text-xs)', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', padding: '4px 10px', borderRadius: 'var(--mk-radius-sm)' }}>
            ⚠ Migration pendiente
          </span>
        )}
        {/* Toggle vista Tabla | Kanban. El botón "+ Nueva tarea" se
            movió del header al filter bar (línea de "Mi trabajo HOY")
            — Pedro pidió que esté a la altura de los filtros, no del
            header, porque es una acción de la LISTA (agregar item),
            no del módulo entero. */}
        <div style={{
          display: 'inline-flex', padding: 2,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--mk-border-subtle)',
          borderRadius: 'var(--mk-radius-md)',
        }}>
          <ViewToggleBtn active={vista === 'tabla'} onClick={() => setVista('tabla')}>
            <IconTable /> Tabla
          </ViewToggleBtn>
          <ViewToggleBtn active={vista === 'kanban'} onClick={() => setVista('kanban')}>
            <IconKanban /> Kanban
          </ViewToggleBtn>
        </div>
      </header>

      {/* MÉTRICAS rápidas inline */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--mk-border-subtle)',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        background: 'rgba(255, 255, 255, 0.01)',
      }}>
        <MiniStat label="Sin empezar" value={metricas.sinEmpezar} color="#737373" />
        <MiniStat label="En progreso" value={metricas.enProgreso} color="#60a5fa" />
        <MiniStat label="Listo" value={metricas.listo} color="#34d399" />
        <MiniStat label="Urgentes" value={metricas.urgentes} color={metricas.urgentes > 0 ? '#fb7185' : '#737373'} />
        <MiniStat label="HOY" value={metricas.hoyMarcadas} color="#fbbf24" />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>
          {metricas.archivadas > 0 && `${metricas.archivadas} archivadas · `}
          {metricas.total} activas
        </span>
      </div>

      {/* FILTER BAR */}
      <div style={filterBarStyle}>
        <div style={{ position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--mk-text-tertiary)' }}>
            <IconSearch />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarea, marca o descripción…"
            className="mk-focusable"
            style={{
              width: '100%', height: 'var(--mk-button-height-lg)',
              padding: '0 8px 0 28px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--mk-border-subtle)',
              borderRadius: 'var(--mk-radius-md)',
              color: 'var(--mk-text-primary)',
              fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
              outline: 'none',
            }}
          />
        </div>

        <FilterPill
          label="Estado"
          value={filters.subEstado === 'activas' ? null : SUBESTADO_CONFIG[filters.subEstado].label}
          dotColor={filters.subEstado === 'activas' ? null : SUBESTADO_CONFIG[filters.subEstado].color}
          options={[
            { id: 'activas', label: 'Todas activas' },
            { id: 'sin_empezar', label: 'Sin empezar', color: '#737373' },
            { id: 'en_progreso', label: 'En progreso', color: '#60a5fa' },
            { id: 'listo', label: 'Listo', color: '#34d399' },
            { id: 'archivado', label: 'Archivadas', color: '#a78bfa' },
          ]}
          onSelect={(id) => setFilters((f) => ({
            ...f,
            subEstado: id as Filters['subEstado'],
            mostrarArchivadas: id === 'archivado',
          }))}
        />
        <FilterPill
          label="Marca"
          value={filters.marcaSlug === 'todas' ? null : marcaBySlug.get(filters.marcaSlug)?.nombre ?? null}
          dotColor={filters.marcaSlug === 'todas' ? null : marcaBySlug.get(filters.marcaSlug)?.color ?? null}
          options={[
            { id: 'todas', label: 'Todas' },
            { id: 'interno', label: 'Internas (sin cliente)', color: '#a78bfa' },
            /* Emoji de la marca para mostrar logo en el dropdown.
               m.emoji es string|null en BD; FilterOption espera string?,
               por eso el ?? undefined. */
            ...marcas.map((m) => ({ id: m.slug, label: m.nombre, color: m.color, emoji: m.emoji ?? undefined })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, marcaSlug: id }))}
        />
        <RangoFechasFilter
          desde={filters.desde}
          hasta={filters.hasta}
          hoy={hoy}
          onChange={(desde, hasta) => setFilters((f) => ({ ...f, desde, hasta }))}
        />
        {hasActiveFilters && (
          <button onClick={clearAll} style={clearBtnStyle}>Limpiar</button>
        )}

        <button
          onClick={() => setFilters((f) => ({ ...f, soloHoy: !f.soloHoy }))}
          style={{
            ...miTrabajoBtnStyle,
            background: filters.soloHoy ? 'var(--mk-accent)' : 'rgba(255, 255, 255, 0.03)',
            color: filters.soloHoy ? 'white' : 'var(--mk-text-secondary)',
            border: `1px solid ${filters.soloHoy ? 'var(--mk-accent)' : 'var(--mk-border-subtle)'}`,
            boxShadow: filters.soloHoy ? '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)' : 'none',
          }}
        >
          <IconToday />
          Mi trabajo HOY
          {filters.soloHoy && (
            <span style={{ marginLeft: 4, padding: '0 6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
              {visible.length}
            </span>
          )}
        </button>

        <div style={{ flex: 1 }} />

        {/* Botón "+ Nueva tarea" — pasado del header al filter bar a
            pedido de Pedro. Misma altura/línea que "Mi trabajo HOY",
            pero alineado a la derecha del filter bar para que sea el
            CTA primario de la fila. Tamaño un poco más chico que en
            el header anterior para que entre en altura del filter bar
            sin romper la línea de los pills. */}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px',
            fontSize: 'var(--mk-text-xs)', fontWeight: 500, fontFamily: 'inherit',
            background: 'var(--mk-accent)', color: 'white',
            border: '1px solid var(--mk-accent)', borderRadius: 'var(--mk-radius-md)',
            cursor: 'pointer',
            boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
          }}
        >
          <span style={{ fontSize: 13 }}>＋</span>
          Nueva tarea
        </button>

        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', marginLeft: 4 }}>
          {visible.length} {visible.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      {/* CONTENT: Tabla o Kanban */}
      {vista === 'tabla' ? (
        <TablaVista
          entries={visible}
          marcaBySlug={marcaBySlug}
          hoy={hoy}
          sort={sort}
          onSort={toggleSort}
          onOpenRow={openRow}
          onSetNombre={setNombre}
          onSetFechaDis={setFechaDiseno}
          onSetFechaEntrega={setFechaEntrega}
          onSetSubEstado={setSubEstado}
          onArchivar={archivarVal}
          onToggleHoy={toggleDisenarHoy}
          onCreateNew={() => setModalOpen(true)}
        />
      ) : (
        /* Kanban muestra TODAS las entries (incluyendo archivadas en
            su propia columna) — Pedro pidió tener archivado como
            estado destino visible. */
        <KanbanVista
          entries={entries.filter((e) => {
            /* Replicar filtros relevantes para Kanban, pero ignorar
               filters.subEstado (que en tabla esconde por default
               las archivadas). En Kanban queremos ver TODOS los
               estados como columnas. */
            if (filters.soloHoy && e.fechaMarcadaParaDisenar !== hoy) return false
            if (filters.marcaSlug !== 'todas' && !e.marcasTags.some((t) => t.slug === filters.marcaSlug)) return false
            if (!pasaRangoFecha(e, filters.desde, filters.hasta)) return false
            if (search) {
              const q = search.toLowerCase()
              if (
                !e.nombreTarea.toLowerCase().includes(q) &&
                !e.marcaNombre.toLowerCase().includes(q) &&
                !(e.descripcion ?? '').toLowerCase().includes(q)
              ) return false
            }
            return true
          })}
          onMoveCard={(id, newSub) => setSubEstado(id, newSub)}
          onOpenCard={openRow}
          onArchive={(id) => archivarVal(id, true)}
          onToggleHoy={toggleDisenarHoy}
          hoy={hoy}
        />
      )}

      {/* MODAL Nueva tarea */}
      {modalOpen && (
        <NuevaTareaModal
          marcas={marcas}
          onClose={() => setModalOpen(false)}
          onCreated={onTareaCreada}
          initialMarcaSlug={initialNuevo?.marcaSlug ?? ''}
        />
      )}
    </div>
  )
}

/* ============================================================
   TablaVista
   ============================================================ */

function TablaVista({
  entries, marcaBySlug, hoy, sort, onSort, onOpenRow,
  onSetNombre, onSetFechaDis, onSetFechaEntrega,
  onSetSubEstado, onArchivar, onToggleHoy, onCreateNew,
}: {
  entries: DisenoEntry[]
  marcaBySlug: Map<string, MarcaOption>
  hoy: string
  sort: { field: SortField; dir: SortDir } | null
  onSort: (f: SortField) => void
  onOpenRow: (id: string) => void
  onSetNombre: (id: string, n: string) => void
  onSetFechaDis: (id: string, d: string) => void
  onSetFechaEntrega: (id: string, d: string) => void
  onSetSubEstado: (id: string, s: SubEstadoDiseno) => void
  onArchivar: (id: string, v: boolean) => void
  onToggleHoy: (id: string, estaMarcada: boolean) => void
  onCreateNew: () => void
}) {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 'var(--mk-text-sm)' }}>
        <thead>
          <tr>
            <Th width="160px" sortable field="marca"        sort={sort} onSort={onSort}>Proyecto</Th>
            <Th              sortable field="nombre"        sort={sort} onSort={onSort}>Nombre de la tarea</Th>
            <Th width="130px" sortable field="fechaEntrega" sort={sort} onSort={onSort}>Fecha entrega</Th>
            <Th width="130px" sortable field="fechaDiseno"  sort={sort} onSort={onSort}>Fecha diseño</Th>
            <Th width="130px" sortable field="subEstado"    sort={sort} onSort={onSort}>Sub-estado</Th>
            <Th width="110px">Diseñar hoy</Th>
            <Th width="80px" align="center">Archivar</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const marca = marcaBySlug.get(entry.marcaSlug)
            const alerta = calcularAlertaFecha(entry.fechaDiseno, entry.fechaEntrega)
            const estaMarcadaHoy = entry.fechaMarcadaParaDisenar === hoy
            return (
              <tr
                key={entry.id}
                style={{
                  height: 'var(--mk-row-height)',
                  transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
                  cursor: 'pointer',
                  background: estaMarcadaHoy ? 'rgba(167, 139, 250, 0.06)' : 'transparent',
                }}
                onClick={() => onOpenRow(entry.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = estaMarcadaHoy ? 'rgba(167, 139, 250, 0.06)' : 'transparent' }}
              >
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mk-dot" style={{ background: marca?.color, boxShadow: marca?.color ? `0 0 6px ${marca.color}` : undefined, width: 8, height: 8 }} />
                    <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.esInterno && '🎨 '}
                      {marca?.nombre ?? entry.marcaNombre}
                    </span>
                  </div>
                </Td>
                <Td>
                  {/* Nombre editable + botón "abrir tarea" estilo Notion.
                      El botón aparece como icono al costado del nombre,
                      visible siempre (no solo hover) porque Pedro pidió
                      que sea claro que se puede abrir el detalle. */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <InlineText value={entry.nombreTarea} onSave={(v) => onSetNombre(entry.id, v)} />
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenRow(entry.id) }}
                      title="Abrir tarea"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--mk-border-subtle)',
                        color: 'var(--mk-text-tertiary)',
                        cursor: 'pointer',
                        padding: '2px 4px', borderRadius: 'var(--mk-radius-sm)',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontFamily: 'inherit', fontSize: 10,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mk-text-primary)'; e.currentTarget.style.borderColor = 'var(--mk-border-default)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mk-text-tertiary)'; e.currentTarget.style.borderColor = 'var(--mk-border-subtle)' }}
                    >
                      <IconOpenInPage />
                      Abrir
                    </button>
                  </div>
                </Td>
                <Td>
                  {entry.fechaEntrega ? (
                    <InlineDate value={entry.fechaEntrega} onChange={(d) => onSetFechaEntrega(entry.id, d)} />
                  ) : (
                    <ClickToSetDate onSet={(d) => onSetFechaEntrega(entry.id, d)} />
                  )}
                </Td>
                <Td>
                  {entry.fechaDiseno ? (
                    <InlineDate
                      value={entry.fechaDiseno}
                      onChange={(d) => onSetFechaDis(entry.id, d)}
                      colorOverride={ALERTA_COLOR[alerta].fg}
                      bgOverride={ALERTA_COLOR[alerta].bg}
                      alertaLabel={ALERTA_COLOR[alerta].label}
                    />
                  ) : (
                    <ClickToSetDate onSet={(d) => onSetFechaDis(entry.id, d)} />
                  )}
                </Td>
                <Td><EditableSubEstado current={entry.subEstado} onChange={(s) => onSetSubEstado(entry.id, s)} /></Td>
                <Td>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleHoy(entry.id, estaMarcadaHoy) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px',
                      background: estaMarcadaHoy ? 'var(--mk-accent)' : 'rgba(255, 255, 255, 0.04)',
                      color: estaMarcadaHoy ? 'white' : 'var(--mk-text-secondary)',
                      border: 'none', borderRadius: 'var(--mk-radius-md)',
                      fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: estaMarcadaHoy ? '0 0 0 1px rgba(113, 112, 255, 0.30), 0 0 12px rgba(113, 112, 255, 0.30)' : 'none',
                    }}
                    title={estaMarcadaHoy ? 'Quitar de "Hoy"' : 'Marcar para diseñar hoy'}
                  >
                    {estaMarcadaHoy ? '✓ Hoy' : '＋ Hoy'}
                  </button>
                </Td>
                <Td align="center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onArchivar(entry.id, entry.subEstado !== 'archivado') }}
                    style={{
                      padding: 4, background: 'transparent', border: 'none',
                      color: entry.subEstado === 'archivado' ? '#a78bfa' : 'var(--mk-text-tertiary)',
                      cursor: 'pointer', borderRadius: 'var(--mk-radius-sm)',
                      transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
                    }}
                    title={entry.subEstado === 'archivado' ? 'Reactivar' : 'Archivar'}
                  >
                    <IconArchive />
                  </button>
                </Td>
              </tr>
            )
          })}
          {entries.length === 0 && (
            <tr><td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--mk-text-base)', color: 'var(--mk-text-secondary)', fontWeight: 500, marginBottom: 4 }}>
                No hay tareas con esos filtros
              </div>
              <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)', marginBottom: 16 }}>
                Crea una tarea nueva o sincroniza Notion desde /publicaciones.
              </div>
              <button
                onClick={onCreateNew}
                style={{
                  padding: '6px 14px', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
                  background: 'var(--mk-accent)', color: 'white',
                  border: 'none', borderRadius: 'var(--mk-radius-md)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ＋ Crear primera tarea
              </button>
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ============================================================
   KanbanVista — drag & drop HTML5 nativo
   ============================================================ */

function KanbanVista({
  entries, onMoveCard, onOpenCard, onArchive, onToggleHoy, hoy,
}: {
  entries: DisenoEntry[]
  onMoveCard: (id: string, newSub: SubEstadoDiseno) => void
  onOpenCard: (id: string) => void
  onArchive: (id: string) => void
  /* Marcar tarea para "hacer hoy". Setea fecha_marcada_para_disenar = hoy
     (o null si ya estaba marcada → toggle). El filtro "Mi trabajo HOY"
     usa esa columna. */
  onToggleHoy: (id: string, estaMarcadaActual: boolean) => void
  /* Fecha YMD del día actual en zona Lima — para comparar con
     fechaMarcadaParaDisenar y saber si la card está marcada. */
  hoy: string
}) {
  const [dragOver, setDragOver] = useState<SubEstadoDiseno | null>(null)
  const isMobile = useIsMobile()

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e: React.DragEvent, col: SubEstadoDiseno) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(col)
  }
  function onDragLeave() { setDragOver(null) }
  function onDrop(e: React.DragEvent, col: SubEstadoDiseno) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setDragOver(null)
    if (id) onMoveCard(id, col)
  }

  return (
    /* Container con max-width centrado: en pantallas anchas las
       columnas no estiraban hasta 1/4 cada una (Pedro: "demasiado
       ancha, se ve feo"). Ahora máximo 1200px centrado, columnas
       de ~280px cada una — anchos de Linear/Notion modernos. */
    <div style={{
      flex: 1, overflow: 'auto',
      background: 'var(--mk-bg-base)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: isMobile ? '14px 12px' : '18px 20px',
        /* Mobile: columnas apiladas (1 col) → kanban vertical scrolleable.
           En desktop, 4 columnas. (El drag-drop HTML5 no funciona en touch,
           así que en mobile se usa el menú de sub-estado de cada card.) */
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(260px, 1fr))',
        gap: 14,
      }}>
        {KANBAN_COLUMNS.map((col) => {
          const cfg = SUBESTADO_CONFIG[col]
          const items = entries.filter((e) => e.subEstado === col)
          const isOver = dragOver === col
          const isArchived = col === 'archivado'
          return (
            <div
              key={col}
              onDragOver={(e) => onDragOver(e, col)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col)}
              style={{
                /* Estructura visual de columna: gradient sutil arriba
                   con el color del estado, padding más generoso, sin
                   bordes "duros" — sensación de surface flotante.
                   Cuando dragOver, ring del color + bg ligeramente
                   más fuerte para indicar drop zone. */
                /* Columna Archivado: opacity bajada a 0.55 (antes 0.85)
                   + filter saturate(0.6) que apaga los colores —
                   pedido de Pedro: "que se vea con opacidad no tan
                   claro todo". El resto de columnas a 100%. */
                position: 'relative',
                background: isOver ? `${cfg.color}10` : 'rgba(255, 255, 255, 0.018)',
                border: `1px solid ${isOver ? cfg.color : 'rgba(255, 255, 255, 0.06)'}`,
                borderRadius: 12,
                padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
                minHeight: 'calc(100vh - 280px)',
                transition: 'all 120ms ease',
                opacity: isArchived ? 0.55 : 1,
                filter: isArchived ? 'saturate(0.6)' : 'none',
                boxShadow: isOver ? `0 0 0 3px ${cfg.color}20, 0 8px 24px ${cfg.color}15` : 'none',
              }}
            >
              {/* Header de columna: chip color + label + contador. Si
                  archivado, el chip es más sutil porque visualmente
                  no debe competir con sin_empezar/en_progreso/listo. */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 2px 10px',
                marginBottom: 2,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: cfg.color,
                    boxShadow: `0 0 8px ${cfg.color}80`,
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: cfg.color,
                    letterSpacing: '0.02em',
                  }}>
                    {cfg.label}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: 'var(--mk-text-quaternary)',
                  fontVariantNumeric: 'tabular-nums',
                  padding: '2px 8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 999,
                }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((entry) => {
                  const estaMarcadaHoy = entry.fechaMarcadaParaDisenar === hoy
                  return (
                    <KanbanCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => onOpenCard(entry.id)}
                      onDragStart={(e) => onDragStart(e, entry.id)}
                      onArchive={() => onArchive(entry.id)}
                      estaMarcadaHoy={estaMarcadaHoy}
                      onToggleHoy={() => onToggleHoy(entry.id, estaMarcadaHoy)}
                    />
                  )
                })}
                {items.length === 0 && (
                  <div style={{
                    padding: '32px 8px', textAlign: 'center',
                    color: 'var(--mk-text-quaternary)', fontSize: 11,
                    border: '1px dashed rgba(255, 255, 255, 0.06)',
                    borderRadius: 8,
                  }}>
                    Arrastra aquí
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({ entry, onClick, onDragStart, onArchive, estaMarcadaHoy, onToggleHoy }: {
  entry: DisenoEntry
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onArchive: () => void
  /* Si la tarea está en el "set HOY" del diseñador. Cuando es true,
     la card se pinta con un ring violeta sutil + el botón "Hacer hoy"
     se convierte en "✓ HOY" para indicar el estado. */
  estaMarcadaHoy: boolean
  /* Toggle. La server action ya sabe si quitar o agregar según el
     estado actual (el caller pasa el valor de estaMarcadaHoy). */
  onToggleHoy: () => void
}) {
  const alerta = calcularAlertaFecha(entry.fechaDiseno, entry.fechaEntrega)
  const [hover, setHover] = useState(false)
  /* Iniciales de la marca para el avatar circular: si la marca tiene
     emoji, usamos eso (más bonito). Si no, primeras 2 letras. */
  const avatarText = entry.marcaEmoji || entry.marcaNombre.slice(0, 2).toUpperCase()
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        /* Card moderna: bg con leve gradient para sentido de "lift",
           borde casi invisible que se intensifica al hover, accent
           lateral del color de la marca para identificación rápida
           visual sin chip ocupando espacio. */
        position: 'relative',
        padding: '10px 12px 10px 14px',
        background: hover
          ? 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)'
          : 'rgba(255, 255, 255, 0.025)',
        /* Si la tarea está marcada para HOY, ring violeta sutil para que
           Ailyn la vea destacada incluso sin clickear el filtro. Reusa
           el mismo violeta #a78bfa que la fila de tabla tiene (línea 156). */
        border: `1px solid ${
          estaMarcadaHoy
            ? 'rgba(167, 139, 250, 0.45)'
            : hover ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.05)'
        }`,
        borderLeft: `3px solid ${entry.marcaColor}`,
        borderRadius: 10,
        cursor: 'grab',
        transition: 'all 120ms ease',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hover ? '0 4px 12px rgba(0, 0, 0, 0.18)' : 'none',
      }}
    >
      {/* Top row: avatar marca circular + nombre marca + botón archivar
          (este último aparece solo en hover) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: entry.marcaColor,
          color: 'white',
          fontSize: entry.marcaEmoji ? 13 : 10, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 0 1px ${entry.marcaColor}40, 0 2px 4px ${entry.marcaColor}30`,
        }}>
          {avatarText}
        </span>
        <span style={{
          fontSize: 10.5, fontWeight: 500,
          color: 'var(--mk-text-tertiary)',
          letterSpacing: '0.01em',
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.marcaNombre}
        </span>
        <TipoDisenoChip tipos={entry.tipoContenido} />
        {entry.entregables && entry.entregables.total > 0 && (
          <span title={`${entry.entregables.listos} de ${entry.entregables.total} listas`}
            style={{ fontSize: 9.5, fontWeight: 700, height: 17, padding: '0 6px', borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center',
              color: entry.entregables.listos === entry.entregables.total ? '#15803d' : '#475569',
              background: entry.entregables.listos === entry.entregables.total ? '#f0fdf4' : '#f1f5f9' }}>
            {entry.entregables.listos}/{entry.entregables.total}
          </span>
        )}
        {/* Etiquetas extra: puntitos de color (una sola tarea, varias marcas). */}
        {entry.marcasTags.length > 1 && (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
            title={`También: ${entry.marcasTags.slice(1).map((t) => t.nombre).join(', ')}`}
          >
            {entry.marcasTags.slice(1, 5).map((t) => (
              <span key={t.slug} style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 0 1px ${t.color}66` }} />
            ))}
            {entry.marcasTags.length > 5 && (
              <span style={{ fontSize: 9, color: 'var(--mk-text-quaternary)' }}>+{entry.marcasTags.length - 5}</span>
            )}
          </span>
        )}
        {/* Hacer HOY — solo en columnas que NO son archivado. Si ya
            está marcada, queda VISIBLE siempre (con look "activo" violeta
            para que Ailyn vea de un vistazo cuáles son sus de hoy). Si
            no está marcada, aparece solo en hover para no saturar la
            card en estado normal. */}
        {entry.subEstado !== 'archivado' && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleHoy() }}
            title={estaMarcadaHoy ? 'Quitar de "Hoy"' : 'Marcar para hacer HOY'}
            style={{
              padding: '3px 7px',
              background: estaMarcadaHoy
                ? 'rgba(167, 139, 250, 0.18)'
                : 'rgba(255, 255, 255, 0.05)',
              border: estaMarcadaHoy
                ? '1px solid rgba(167, 139, 250, 0.45)'
                : '1px solid transparent',
              borderRadius: 999,
              color: estaMarcadaHoy ? '#c4b5fd' : 'var(--mk-text-tertiary)',
              cursor: 'pointer',
              opacity: estaMarcadaHoy || hover ? 1 : 0,
              transition: 'opacity 120ms ease, background 120ms ease',
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontFamily: 'inherit',
              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {estaMarcadaHoy ? '✓ HOY' : 'HOY'}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onArchive() }}
          title="Archivar tarea"
          style={{
            padding: '3px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: 5,
            color: 'var(--mk-text-tertiary)',
            cursor: 'pointer',
            opacity: hover ? 1 : 0,
            transition: 'opacity 120ms ease',
            display: 'inline-flex', alignItems: 'center',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.10)'; e.currentTarget.style.color = 'var(--mk-text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'var(--mk-text-tertiary)' }}
        >
          <IconArchive />
        </button>
      </div>

      {/* Título de la tarea — el elemento principal de la card */}
      <div style={{
        fontSize: 13.5, fontWeight: 600,
        color: 'var(--mk-text-primary)',
        lineHeight: 1.35,
        marginBottom: entry.descripcion ? 6 : 8,
        letterSpacing: '-0.01em',
      }}>
        {entry.nombreTarea}
      </div>

      {/* Descripción truncada — 2 líneas máximo */}
      {entry.descripcion && (
        <div style={{
          fontSize: 11.5, color: 'var(--mk-text-tertiary)',
          lineHeight: 1.4, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {entry.descripcion}
        </div>
      )}

      {/* Footer adapta su contenido según el estado:
          - Si está archivada: timeline "Archivada: X · Duró: Y"
          - Si no: pills de fecha entrega + fecha diseño con alerta */}
      {entry.subEstado === 'archivado' ? (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '8px 10px',
          background: 'rgba(167, 139, 250, 0.06)',
          border: '1px solid rgba(167, 139, 250, 0.15)',
          borderRadius: 6,
          marginTop: 2,
        }}>
          {entry.archivedAt && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10.5, color: 'var(--mk-text-tertiary)',
            }}>
              <IconArchive />
              <span style={{ fontWeight: 500 }}>Archivada:</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDateTimeES(entry.archivedAt)}
              </span>
            </div>
          )}
          {/* Duración: si tenemos started_at + archived_at calculamos
              el tiempo "en progreso". Si no, mostramos placeholder
              "—" para que el diseño sea consistente. */}
          {entry.startedAt && entry.archivedAt && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10.5, color: 'var(--mk-text-tertiary)',
            }}>
              <IconHourglass />
              <span style={{ fontWeight: 500 }}>Duró:</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: '#a78bfa' }}>
                {formatDuracion(entry.startedAt, entry.archivedAt) ?? '—'}
              </span>
            </div>
          )}
          {!entry.startedAt && entry.archivedAt && (
            <div style={{
              fontSize: 10, fontStyle: 'italic',
              color: 'var(--mk-text-quaternary)',
            }}>
              Sin trackeo (archivada directamente)
            </div>
          )}
        </div>
      ) : (
        (entry.fechaEntrega || entry.fechaDiseno) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {entry.fechaEntrega && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 500,
                padding: '3px 7px',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--mk-text-tertiary)',
                borderRadius: 5,
              }}>
                <IconCalendar /> {formatDateES(entry.fechaEntrega).replace(' 2026', '')}
              </span>
            )}
            {entry.fechaDiseno && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 500,
                padding: '3px 7px',
                background: `${ALERTA_COLOR[alerta].fg}15`,
                color: ALERTA_COLOR[alerta].fg,
                borderRadius: 5,
              }}>
                <IconPalette /> {formatDateES(entry.fechaDiseno).replace(' 2026', '')}
              </span>
            )}
          </div>
        )
      )}
    </div>
  )
}

/* ============================================================
   Modal Nueva Tarea
   ============================================================ */

function NuevaTareaModal({
  marcas, onClose, onCreated, initialMarcaSlug,
}: {
  marcas: MarcaOption[]
  onClose: () => void
  onCreated: (entry: DisenoEntry) => void
  /* Pre-fill cuando se llega desde /grilla con ?marca=slug. */
  initialMarcaSlug?: string
}) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaDiseno, setFechaDiseno] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  /* Marca: SIEMPRE seleccionable (Pedro pidió que aparezca aunque
     no sea "para publicar"). Default vacío = tarea interna.
     Si llega initialMarcaSlug (botón en /grilla), se pre-carga. */
  const [marcaSlug, setMarcaSlug] = useState(initialMarcaSlug ?? '')
  /* Pedro: 'que se puedan seleccionar más de una marca cuando se hace
     diseño'. Set de slugs ADICIONALES a la principal. Si Ailyn elige
     marca=Kintu y extras={Manrique, Lozano}, se crean 3 tareas. */
  const [marcasExtras, setMarcasExtras] = useState<Set<string>>(new Set())
  /* Tipo de diseño: Post / Carrusel / Historia se PUBLICAN (van al
     calendario con su tipo y no se reprograman); Interno no se publica. */
  const [tipo, setTipo] = useState<TipoDiseno | null>(null)
  const esParaPublicar = tipo !== null && tipo !== 'interno'
  const [redes, setRedes] = useState<string[]>(['Instagram', 'Facebook'])
  const [verMasMarcas, setVerMasMarcas] = useState(false)
  /* ENTREGABLES (Post / Carrusel / Historia): días elegidos en el calendario
     de la marca. Cada uno enlaza la publicación que ya existe o crea una. */
  const [entregables, setEntregables] = useState<ItemEntregable[]>([])
  /* Carrusel: cuántos slides lleva (Pedro 02-oct-2026). */
  const [nSlides, setNSlides] = useState(5)
  /* Reunión de ENTREGA (Pedro 30-sep-2026): se escribe en una frase como en el
     calendario ("el viernes 2 de octubre a las 11am") y se agenda al crear. */
  const [reunionTexto, setReunionTexto] = useState('')
  const [reunionFecha, setReunionFecha] = useState('')
  const [reunionHora, setReunionHora] = useState('')
  const [reunionDur, setReunionDur] = useState(45)
  const [reunionTituloManual, setReunionTituloManual] = useState<string | null>(null)
  const [interpretando, setInterpretando] = useState(false)
  const marcaElegida = marcaSlug && marcaSlug !== 'interno' ? marcas.find((m) => m.slug === marcaSlug) ?? null : null
  const reunionTituloAuto = `Diseño ${marcaElegida?.nombre ?? 'Distinto'}${nombre.trim() ? ` · ${nombre.trim()}` : ''}`
  const reunionTitulo = reunionTituloManual ?? reunionTituloAuto
  async function entenderReunion() {
    if (!reunionTexto.trim() || interpretando) return
    setInterpretando(true)
    const r = await interpretarReunionEntrega(reunionTexto)
    setInterpretando(false)
    if (!r.ok) { toast.error(r.error); return }
    if (r.fecha) setReunionFecha(r.fecha)
    if (r.hora) setReunionHora(r.hora)
    setReunionDur(r.durationMin)
    if (!r.fecha) toast('No entendí la fecha, elígela abajo.')
    else if (!r.hora) toast('Falta la hora: ponla abajo.')
  }
  /* Reunión de revisión opcional */
  const [agregarReunion, setAgregarReunion] = useState(false)
  const [horaReunion, setHoraReunion] = useState('')
  const [invitadosInput, setInvitadosInput] = useState('')
  /* "Para hoy": marca la tarea recién creada para trabajarla hoy (Aylin la pidió
     acá también, no solo en el detalle). Pedro 14-jul-2026. */
  const [paraHoy, setParaHoy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitEnCurso = useRef(false)
  const solicitudId = useRef<string | null>(null)

  /* Cierre seguro: si hay algo escrito, confirma antes de descartar (evita
     perder la tarea por error). Sin contenido, cierra directo. */
  function pedirCerrar() {
    if (submitEnCurso.current) return
    const hayContenido = nombre.trim() || descripcion.trim() || marcasExtras.size > 0
    if (hayContenido && !window.confirm('¿Descartar esta tarea? Se perderá lo que escribiste.')) return
    onClose()
  }

  /* Auto-fetch correos de cliente cuando elige marca. Si cambia de marca,
     REEMPLAZA los correos que se habían llenado solos (antes se quedaban los
     de la primera marca — fix 02-oct-2026). Lo que el usuario escribió a
     mano no se pisa. */
  const invitadosAuto = useRef('')
  useEffect(() => {
    const reemplazar = (nuevo: string) => {
      setInvitadosInput((cur) => (!cur.trim() || cur === invitadosAuto.current ? nuevo : cur))
      invitadosAuto.current = nuevo
    }
    if (!marcaSlug || marcaSlug === 'interno') { reemplazar(''); return }
    let cancelado = false
    obtenerCorreosDeMarca(marcaSlug).then((r) => {
      if (cancelado) return
      reemplazar(r.ok ? r.correos.join(', ') : '')
    })
    return () => { cancelado = true }
  }, [marcaSlug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitEnCurso.current) return
    if (!tipo) { toast.error('Elige el tipo: Post, Carrusel, Historia o Interno'); return }
    if (!nombre.trim()) { toast.error('Falta nombre'); return }
    if (esParaPublicar && redes.length === 0) { toast.error('Elige al menos una red'); return }
    if (esParaPublicar && !marcaSlug) { toast.error('Selecciona la marca'); return }
    if (esParaPublicar && entregables.length === 0) { toast.error('Elige en el calendario los días que vas a diseñar'); return }
    if (tipo === 'interno' && !fechaEntrega) { toast.error('Falta la fecha de entrega de diseño'); return }
    if (agregarReunion && !reunionFecha) { toast.error('Falta la fecha de la reunión de entrega'); return }
    if (agregarReunion && !reunionHora) { toast.error('Falta la hora de la reunión de entrega'); return }

    /* Parse invitados — soporta separadores comunes: coma, salto de
       línea, punto y coma. Filtra strings que parezcan email válido
       (contiene @ y al menos un punto después). */
    const invitados = agregarReunion
      ? invitadosInput
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter((s) => /@.+\./.test(s))
      : []

    submitEnCurso.current = true
    setSubmitting(true)
    try {
      // Conservar esta clave si la respuesta se pierde y se vuelve a intentar.
      solicitudId.current ??= crypto.randomUUID()
      const r = await crearDisenoTask({
        solicitudId: solicitudId.current,
        paraHoy,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fechaDiseno: fechaDiseno || null,
        fechaEntrega: fechaEntrega || null,
        /* Marca siempre se manda (incluso para tareas no publicables).
           Si está vacío y NO es para publicar, el server default a "interno". */
        marcaSlug: marcaSlug || undefined,
        marcasExtras: Array.from(marcasExtras),
        tipoDiseno: tipo,
        plataformas: esParaPublicar ? redes : [],
        esParaPublicar,
        /* La tarea madre NO va al calendario: van sus entregables (una
           publicación por día). */
        fechaPublicacion: null,
        fechaEdicion: null,
        /* La reunión de entrega se agenda aparte (abajo), como en el calendario. */
        horaReunion: null,
        invitadosEmails: null,
      })
      if (!r.ok) { toast.error(r.error); return }

      if (esParaPublicar && tipo) {
        const re = await crearEntregables({
          tareaId: r.data!.id, marcaSlug, tipo, plataformas: redes, slides: nSlides,
          items: [...entregables].sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map((e) => ({ publicacionId: e.publicacionId, fecha: e.fecha, hora: e.hora, titulo: e.titulo })),
        })
        if (!re.ok) toast.error(`La tarea se creó, pero no sus ${tipoInfo?.label.toLowerCase() ?? 'entregables'}: ${re.error}`)
      }

      if (agregarReunion) {
        const rr = await agendarReunionEntrega({
          marcaSlug: marcaSlug || null, titulo: reunionTitulo, fecha: reunionFecha, hora: reunionHora,
          durationMin: reunionDur, invitados,
        })
        if (rr.ok) toast.success(`Reunión de entrega agendada${rr.meetLink ? ' con Meet' : ''} · ${reunionTitulo}`)
        else toast.error(`La tarea se creó, pero la reunión no: ${rr.error}`)
      }

      /* Una sola tarea etiquetada con varias marcas (no copias). */
      if (r.data!.extrasCreadas > 0) {
        toast.success(`Tarea etiquetada en ${r.data!.extrasCreadas + 1} marcas`)
      }

      /* Optimistic update: la tarea con la marca principal + las etiquetas extra. */
      const marca = marcaSlug ? marcas.find((m) => m.slug === marcaSlug) : null
      const principalTag = {
        slug: marca?.slug ?? 'interno',
        nombre: marca?.nombre ?? 'Distinto · Interno',
        color: marca?.color ?? '#a78bfa',
        emoji: marca?.emoji ?? null,
      }
      const extrasTags = Array.from(marcasExtras)
        .map((slug) => marcas.find((m) => m.slug === slug))
        .filter(Boolean)
        .map((m) => ({ slug: m!.slug, nombre: m!.nombre, color: m!.color, emoji: m!.emoji ?? null }))
      onCreated({
        id: r.data!.id,
        marcaSlug: marca?.slug ?? 'interno',
        marcaNombre: marca?.nombre ?? 'Distinto · Interno',
        marcaColor: marca?.color ?? '#a78bfa',
        marcaEmoji: marca?.emoji ?? null,
        marcasTags: [principalTag, ...extrasTags],
        esInterno: !marca,
        nombreTarea: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fechaPublicacion: null,
        fechaDiseno: fechaDiseno || null,
        fechaEntrega: fechaEntrega || null,
        /* Mismo estado que usamos en el insert del server action */
        estado: 'disenar',
        subEstado: 'sin_empezar',
        plataformas: esParaPublicar ? redes : [],
        tipoContenido: [TIPOS_DISENO.find((t) => t.id === tipo)?.valor ?? ''],
        /* Si marcó "Trabajar HOY", reflejamos la fecha de hoy (Lima) en la copia
           local — igual que lo guardado en la creación de la tarea. Antes
           estaba fijo en null → la tarea no aparecía en "Mi trabajo HOY" hasta
           recargar. Ese era el bug que reportó Aylin. */
        fechaMarcadaParaDisenar: paraHoy ? hoyLima() : null,
        startedAt: null,
        archivedAt: null,
      })
    } catch {
      toast.error('No pudimos confirmar el guardado. Reintenta: se recuperará la misma tarea sin duplicarla.')
    } finally {
      submitEnCurso.current = false
      setSubmitting(false)
    }
  }

  /* Common props para inputs de fecha/hora: el onFocus llama showPicker()
     para que el calendar/clock se abra automáticamente al enfocar el
     input. Fix del bug que Pedro reportó: "cuando hago clic en fecha de
     entrega no sale el calendario para hacer clic". Las versiones
     viejas de Chrome no tenían showPicker, por eso usamos ?. */
  /* Helper genérico — acepta cualquier SyntheticEvent (focus, click,
     mousedown). El cast del target maneja showPicker que TypeScript
     no conoce todavía. */
  const openPickerOnFocus = (e: React.SyntheticEvent<HTMLInputElement>) => {
    try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch {}
  }

  const tipoInfo = TIPOS_DISENO.find((t) => t.id === tipo) ?? null

  return (
    <div
      /* NO cerramos al hacer clic en el fondo: Aylin perdía la tarea al tocar
         afuera por error. Se cierra con la ✕ o "Cancelar". */
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="mk-modal-diseno"
        style={{
          width: '100%', maxWidth: 580, maxHeight: '92vh',
          background: '#fff', borderRadius: 20,
          boxShadow: '0 24px 64px rgba(15,23,42,0.22), 0 2px 8px rgba(15,23,42,0.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#0f172a',
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px 16px', borderBottom: '1px solid #f1f2f6', flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#7170ff,#ba41f7)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px -6px rgba(113,112,255,0.7)' }}>
            <IcoPaleta size={19} strokeWidth={2.2} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: -0.2 }}>Nueva tarea de diseño</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
              {tipoInfo ? tipoInfo.ayuda : 'Primero elige qué tipo de diseño es.'}
            </p>
          </div>
          <button type="button" onClick={pedirCerrar} disabled={submitting} aria-label="Cerrar"
            className="mk-modal-x" style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcoX size={18} />
          </button>
        </div>

        {/* BODY */}
        {/* El DIV es el que se desliza (un <fieldset> no scrollea bien dentro
            de un flex en Chrome/Safari — por eso no se podía deslizar). */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        <fieldset disabled={submitting} style={{ padding: '18px 22px 16px', border: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* 1 · Tipo */}
          <Seccion titulo="Tipo de diseño">
            <div role="radiogroup" aria-label="Tipo de diseño" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {TIPOS_DISENO.map((t) => {
                const activo = tipo === t.id
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={activo} onClick={() => setTipo(t.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px 10px',
                      borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
                      background: activo ? `${t.color}0f` : '#fff',
                      border: `1.5px solid ${activo ? t.color : '#e8eaf0'}`,
                      boxShadow: activo ? `0 0 0 3px ${t.color}1f` : 'none',
                      transition: 'all 140ms ease',
                    }}>
                    {activo && (
                      <span style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: t.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IcoCheck size={10} strokeWidth={3.5} />
                      </span>
                    )}
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: `${t.color}14`, color: t.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <t.Icon size={18} strokeWidth={2.2} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: activo ? t.color : '#0f172a' }}>{t.label}</span>
                    <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500 }}>{t.id === 'interno' ? 'No se publica' : 'Se publica'}</span>
                  </button>
                )
              })}
            </div>
          </Seccion>

          {/* 2 · Datos */}
          <Seccion titulo="Detalle">
            <Campo label="Nombre de la tarea" requerido>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder={tipo === 'historia' ? 'Ej. Historia promo fin de mes' : tipo === 'carrusel' ? 'Ej. Carrusel 5 beneficios' : tipo === 'interno' ? 'Ej. Presentación para cliente nuevo' : 'Ej. Post lanzamiento producto'}
                autoFocus style={campo} />
            </Campo>
            <Campo label="Descripción / brief">
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                placeholder="¿Qué hay que diseñar? Textos, referencias, medidas…" rows={3}
                style={{ ...campo, height: 'auto', minHeight: 76, padding: '10px 12px', resize: 'vertical', lineHeight: 1.45 }} />
            </Campo>
            <Campo label={esParaPublicar ? 'Marca' : 'Marca (opcional)'} requerido={esParaPublicar}>
              <MarcaSelect marcas={marcas} value={marcaSlug} onChange={setMarcaSlug} />
            </Campo>
            {marcaSlug && marcaSlug !== 'interno' && marcas.length > 1 && (
              <div>
                <button type="button" onClick={() => setVerMasMarcas((v) => !v)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#6d5dfc', fontFamily: 'inherit' }}>
                  <IcoChevron size={14} style={{ transform: verMasMarcas ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                  Etiquetar más marcas{marcasExtras.size > 0 ? ` · ${marcasExtras.size}` : ''}
                </button>
                {verMasMarcas && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {marcas.filter((m) => m.slug !== marcaSlug && m.slug !== 'interno').map((m) => {
                      const checked = marcasExtras.has(m.slug)
                      return (
                        <button key={m.slug} type="button"
                          onClick={() => setMarcasExtras((prev) => { const n = new Set(prev); if (n.has(m.slug)) n.delete(m.slug); else n.add(m.slug); return n })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 999, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: checked ? `${m.color}14` : '#f8fafc', border: `1px solid ${checked ? m.color + '66' : '#e8eaf0'}`, color: checked ? m.color : '#475569' }}>
                          {checked && <IcoCheck size={12} strokeWidth={3} />}
                          {m.emoji && <span style={{ fontSize: 12 }}>{m.emoji}</span>}
                          {m.nombre}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </Seccion>

          {/* 3 · Días del calendario (solo Post / Carrusel / Historia) */}
          {esParaPublicar && tipoInfo && (
            <Seccion titulo={`${tipoInfo.label === 'Post' ? 'Posts' : tipoInfo.label === 'Carrusel' ? 'Carruseles' : 'Historias'} a diseñar`} acento={tipoInfo.color}>
              {!marcaElegida ? (
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', padding: '12px 14px', borderRadius: 12, background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
                  Elige la marca arriba para ver su calendario de publicaciones.
                </p>
              ) : (
                <SelectorEntregables
                  marcaSlug={marcaElegida.slug} marcaNombre={marcaElegida.nombre}
                  tipoLabel={tipoInfo.label} color={tipoInfo.color}
                  items={entregables} onChange={setEntregables}
                />
              )}
              {tipo === 'carrusel' && (
                <Campo label="¿Cuántos slides tendrá cada carrusel?">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                      const on = nSlides === n
                      return (
                        <button key={n} type="button" onClick={() => setNSlides(n)}
                          style={{ width: 40, height: 40, borderRadius: 11, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                            border: `1.5px solid ${on ? tipoInfo.color : '#e2e8f0'}`, background: on ? `${tipoInfo.color}12` : '#fff', color: on ? tipoInfo.color : '#475569',
                            transition: 'all 120ms' }}>
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </Campo>
              )}
              <Campo label="Redes (para las nuevas)">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {REDES_DISENO.map((r) => {
                    const on = redes.includes(r.key)
                    return (
                      <button key={r.key} type="button" onClick={() => setRedes((cur) => on ? cur.filter((x) => x !== r.key) : [...cur, r.key])}
                        style={{ height: 34, padding: '0 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${on ? r.color : '#e8eaf0'}`, background: on ? `${r.color}12` : '#fff', color: on ? r.color : '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {on && <IcoCheck size={13} strokeWidth={3} />}{r.label}
                      </button>
                    )
                  })}
                </div>
              </Campo>
            </Seccion>
          )}

          {/* 4 · Plazos del diseño */}
          {tipo && (
            <Seccion titulo="Plazos del diseño">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="Fecha de diseño">
                  <input type="date" value={fechaDiseno} onChange={(e) => setFechaDiseno(e.target.value)}
                    onFocus={openPickerOnFocus} onClick={openPickerOnFocus} style={{ ...campo, cursor: 'pointer' }} />
                </Campo>
                <Campo label={tipo === 'interno' ? 'Fecha de entrega de diseño' : 'Fecha de entrega'} requerido={tipo === 'interno'}>
                  <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                    onFocus={openPickerOnFocus} onClick={openPickerOnFocus} style={{ ...campo, cursor: 'pointer' }} />
                </Campo>
              </div>
            </Seccion>
          )}

          {/* 5 · Opciones */}
          {tipo && (
            <Seccion titulo="Opciones">
              <Opcion activo={paraHoy} onToggle={() => setParaHoy((v) => !v)} color="#7170ff" Icon={IcoHoy}
                titulo="Trabajar hoy" texto="La agrega a tu lista de hoy." />
              <Opcion activo={agregarReunion} onToggle={() => setAgregarReunion((v) => !v)} color="#10b981" Icon={IcoVideo}
                titulo="¿Esta entrega necesita reunión?" texto="Actívalo si hay que presentar el diseño en una reunión." />
              {agregarReunion && (
                <div style={{ display: 'grid', gap: 12, padding: 14, borderRadius: 14, background: '#f6fdf9', border: '1px solid #d1fae5' }}>
                  {/* Mismo asistente del calendario: una frase y listo. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '4px 4px 4px 12px' }}>
                    <IcoMagia size={15} color="#10b981" style={{ flexShrink: 0 }} />
                    <input value={reunionTexto} onChange={(e) => setReunionTexto(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void entenderReunion() } }}
                      placeholder='Ej: "reunión de entrega el viernes 2 de octubre a las 11am"'
                      style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', background: 'transparent', height: 34, color: '#0f172a' }} />
                    <button type="button" onClick={() => void entenderReunion()} disabled={interpretando || !reunionTexto.trim()}
                      style={{ height: 34, padding: '0 14px', borderRadius: 9, border: 'none', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: interpretando || !reunionTexto.trim() ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {interpretando ? <IcoCargando size={14} className="animate-spin" /> : null} Listo
                    </button>
                  </div>
                  <Campo label="Nombre del evento">
                    <input value={reunionTitulo} onChange={(e) => setReunionTituloManual(e.target.value)} style={campo} />
                  </Campo>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Campo label="Fecha" requerido>
                      <input type="date" value={reunionFecha} onChange={(e) => setReunionFecha(e.target.value)}
                        onFocus={openPickerOnFocus} onClick={openPickerOnFocus} style={{ ...campo, cursor: 'pointer', borderColor: reunionFecha ? '#e2e8f0' : '#fcd34d' }} />
                    </Campo>
                    <Campo label="Hora" requerido>
                      <input type="time" value={reunionHora} onChange={(e) => setReunionHora(e.target.value)}
                        onFocus={openPickerOnFocus} onClick={openPickerOnFocus} style={{ ...campo, cursor: 'pointer', borderColor: reunionHora ? '#e2e8f0' : '#fcd34d' }} />
                    </Campo>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IcoReloj size={13} /> {reunionDur} min · Google Calendar con Meet{marcaElegida ? ` · ${marcaElegida.nombre}` : ''}
                  </p>
                  <Campo label="Invitados (correos separados por coma)">
                    <textarea value={invitadosInput} onChange={(e) => setInvitadosInput(e.target.value)} rows={2}
                      placeholder={marcaElegida ? 'Se llenan solos con los correos de la marca…' : 'cliente@ejemplo.com, otro@cliente.com'}
                      style={{ ...campo, height: 'auto', minHeight: 56, padding: '10px 12px', resize: 'vertical' }} />
                  </Campo>
                </div>
              )}
            </Seccion>
          )}
        </fieldset>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px 18px', borderTop: '1px solid #f1f2f6', background: '#fcfcfd', flexShrink: 0 }}>
          <button type="button" onClick={pedirCerrar} disabled={submitting}
            style={{ height: 40, padding: '0 16px', fontSize: 14, fontWeight: 600, background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting || !tipo}
            style={{ height: 40, padding: '0 20px', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', borderRadius: 11, fontFamily: 'inherit',
              background: 'linear-gradient(135deg,#7170ff,#ba41f7)', boxShadow: '0 8px 18px -8px rgba(113,112,255,0.8)',
              cursor: submitting ? 'wait' : !tipo ? 'not-allowed' : 'pointer', opacity: submitting || !tipo ? 0.55 : 1 }}>
            {submitting ? 'Creando…' : tipoInfo ? `Crear ${tipoInfo.label.toLowerCase()}` : 'Crear tarea'}
          </button>
        </div>
        <style>{'.mk-modal-x:hover{background:#f1f5f9!important;color:#0f172a!important}.mk-modal-diseno input:focus,.mk-modal-diseno textarea:focus{border-color:#7170ff!important;box-shadow:0 0 0 3px rgba(113,112,255,0.15)}@media (max-width:520px){.mk-modal-diseno [role=radiogroup]{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'}</style>
      </form>
    </div>
  )
}

/* Tipo del diseño en la tarjeta (Post / Carrusel / Historia / Interno). */
function TipoDisenoChip({ tipos }: { tipos: string[] | null | undefined }) {
  const v = (tipos?.[0] ?? '').toLowerCase()
  const t = TIPOS_DISENO.find((x) => (x.id === 'historia' ? /historia|stor/.test(v) : x.id === 'post' ? v === 'post' : v.includes(x.id)))
  if (!t) return null
  return (
    <span title={t.id === 'interno' ? 'Interno · no se publica' : `${t.label} · se publica`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 17, padding: '0 6px', borderRadius: 999, flexShrink: 0,
        fontSize: 9.5, fontWeight: 700, color: t.color, background: `${t.color}14`, border: `1px solid ${t.color}33` }}>
      <t.Icon size={10} strokeWidth={2.4} />{t.label}
    </span>
  )
}

/* ===== Selector de días del calendario (entregables) ===== */
type ItemEntregable = { key: string; fecha: string; hora?: string | null; publicacionId: string | null; titulo: string }

function lunesDe(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00Z'); const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10)
}
function sumarDias(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}
function fechaCorta(ymd: string): string {
  return new Date(ymd + 'T12:00:00Z').toLocaleDateString('es-PE', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
}

function SelectorEntregables({ marcaSlug, marcaNombre, tipoLabel, color, items, onChange }: {
  marcaSlug: string; marcaNombre: string; tipoLabel: string; color: string
  items: ItemEntregable[]; onChange: (v: ItemEntregable[]) => void
}) {
  const [inicio, setInicio] = useState(() => lunesDe(hoyLima()))
  const [pubs, setPubs] = useState<PubCalendario[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const fin = sumarDias(inicio, 13)
  useEffect(() => {
    let vivo = true
    setCargando(true)
    calendarioMarcaParaDiseno(marcaSlug, inicio, fin).then((r) => {
      if (!vivo) return
      setCargando(false)
      setPubs(r.ok ? r.pubs : [])
      if (!r.ok) toast.error(r.error)
    })
    return () => { vivo = false }
  }, [marcaSlug, inicio, fin])

  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(inicio, i))
  const hoy = hoyLima()
  const porDia = new Map<string, PubCalendario[]>()
  for (const p of pubs ?? []) { const a = porDia.get(p.fecha) ?? []; a.push(p); porDia.set(p.fecha, a) }
  const elegidaPub = new Set(items.map((i) => i.publicacionId).filter(Boolean) as string[])

  function titulo(n: number, fecha: string) { return `${tipoLabel} ${n} · ${marcaNombre} · ${fechaCorta(fecha)}` }
  function agregarNueva(fecha: string) {
    onChange([...items, { key: crypto.randomUUID(), fecha, publicacionId: null, titulo: titulo(items.length + 1, fecha) }])
  }
  function alternarPub(p: PubCalendario) {
    if (elegidaPub.has(p.id)) onChange(items.filter((i) => i.publicacionId !== p.id))
    else onChange([...items, { key: p.id, fecha: p.fecha, hora: p.hora, publicacionId: p.id, titulo: p.nombre }])
  }
  const ordenados = [...items].sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ border: '1px solid #e8eaf0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid #f1f2f6', background: '#fcfcfd' }}>
          <button type="button" onClick={() => setInicio(sumarDias(inicio, -7))} aria-label="Semana anterior" className="mk-modal-x"
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IcoAnt size={16} /></button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
            {fechaCorta(inicio)} – {fechaCorta(fin)}{cargando ? ' · cargando…' : ''}
          </span>
          <button type="button" onClick={() => setInicio(sumarDias(inicio, 7))} aria-label="Semana siguiente" className="mk-modal-x"
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IcoSig size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {dias.map((d, idx) => {
            const lista = porDia.get(d) ?? []
            const ocupada = lista.some(p => !/hist|stor/i.test(p.tipo ?? ''))
            const nuevas = items.filter((i) => !i.publicacionId && i.fecha === d).length
            const pasado = d < hoy
            return (
              <div key={d} style={{ minHeight: 86, padding: 5, borderRight: (idx % 7) !== 6 ? '1px solid #f1f2f6' : 'none', borderTop: idx >= 7 ? '1px solid #f1f2f6' : 'none', background: d === hoy ? '#f7f6ff' : pasado ? '#fcfcfd' : '#fff', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: d === hoy ? '#6d5dfc' : '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{new Date(d + 'T12:00:00Z').toLocaleDateString('es-PE', { timeZone: 'UTC', weekday: 'narrow' })} {Number(d.slice(8))}</span>
                </div>
                {ocupada && <span style={{ fontSize: 9, color: '#0284c7', fontWeight: 700 }}>Publicación programada</span>}
                {lista.map((p) => {
                  const on = elegidaPub.has(p.id)
                  const bloqueada = p.enlazada && !on
                  return (
                    <button key={p.id} type="button" disabled={bloqueada} onClick={() => alternarPub(p)}
                      title={bloqueada ? `${p.nombre} · ya tiene diseño asignado` : on ? 'Quitar' : `Diseñar: ${p.nombre}`}
                      style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, lineHeight: 1.25, padding: '3px 5px', borderRadius: 6, cursor: bloqueada ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                        border: `1px solid ${on ? color : '#e8eaf0'}`, background: on ? `${color}14` : /hist|stor/i.test(p.tipo ?? '') ? '#fdf2f8' : '#eff6ff', color: on ? color : bloqueada ? '#cbd5e1' : '#475569',
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {on && '✓ '}{p.hora && `${p.hora} · `}{p.tipo ? `${p.tipo.toLowerCase().includes('stor') || p.tipo.toLowerCase().includes('histor') ? 'Hist' : p.tipo.slice(0, 4)} · ` : ''}{p.nombre}
                    </button>
                  )
                })}
                {nuevas > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 5px', borderRadius: 6, background: color, color: '#fff' }}>+{nuevas} {tipoLabel.toLowerCase()}</span>
                )}
                {!pasado && (
                  <button type="button" onClick={() => agregarNueva(d)} title={`Nueva ${tipoLabel.toLowerCase()} este día`}
                    className="mk-dia-mas"
                    style={{ marginTop: 'auto', height: 20, borderRadius: 6, border: '1px dashed #e2e8f0', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IcoMas size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8' }}>
        Los días con publicación muestran una alerta azul para planificar historias. Toca una publicación que ya creó Lorena para enlazarla, o <b>+</b> para crear una nueva ese día.
      </p>
      {ordenados.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {ordenados.map((it, n) => (
            <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 10px', borderRadius: 11, border: '1px solid #e8eaf0', background: '#fff' }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: `${color}14`, color, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n + 1}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', width: 78, flexShrink: 0 }}>{fechaCorta(it.fecha)}</span>
              <input value={it.titulo} onChange={(e) => onChange(items.map((x) => x.key === it.key ? { ...x, titulo: e.target.value } : x))}
                style={{ ...campo, height: 32, fontSize: 13, flex: 1, minWidth: 0 }} />
              <input type="time" aria-label={`Hora de publicación de ${it.titulo}`} value={it.hora ?? ''} onChange={(e) => onChange(items.map(x => x.key === it.key ? { ...x, hora: e.target.value } : x))} style={{ ...campo, width: 100, height: 32 }} />
              {it.publicacionId && <span title="Enlazada a la publicación que ya existe" style={{ color: '#10b981', display: 'inline-flex' }}><IcoLink size={15} /></span>}
              <button type="button" onClick={() => onChange(items.filter((x) => x.key !== it.key))} aria-label="Quitar" className="mk-modal-x"
                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IcoBorrar size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ===== Piezas del modal de nueva tarea de diseño ===== */
type TipoDiseno = 'post' | 'carrusel' | 'historia' | 'interno'
const TIPOS_DISENO: { id: TipoDiseno; label: string; valor: string; color: string; Icon: typeof IcoPost; ayuda: string }[] = [
  { id: 'post', label: 'Post', valor: 'POST', color: '#0284c7', Icon: IcoPost, ayuda: 'Se publica: va al calendario de publicaciones como Post.' },
  { id: 'carrusel', label: 'Carrusel', valor: 'CARRUSEL', color: '#0d9488', Icon: IcoCarrusel, ayuda: 'Se publica: va al calendario de publicaciones como Carrusel.' },
  { id: 'historia', label: 'Historia', valor: 'HISTORIA', color: '#db2777', Icon: IcoHistoria, ayuda: 'Se publica: va al calendario de publicaciones como Historia.' },
  { id: 'interno', label: 'Interno', valor: 'INTERNO', color: '#64748b', Icon: IcoInterno, ayuda: 'No se publica: queda solo como tarea de trabajo.' },
]
const REDES_DISENO = [
  { key: 'Instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'Facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'Tiktok', label: 'TikTok', color: '#111111' },
]
const campo: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', background: '#fff', color: '#0f172a',
  border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: 'inherit', fontSize: 14,
  outline: 'none', colorScheme: 'light', transition: 'border-color 120ms, box-shadow 120ms',
}
function Seccion({ titulo, acento, children }: { titulo: string; acento?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: acento ?? '#94a3b8' }}>
        {titulo}<span style={{ flex: 1, height: 1, background: '#f1f2f6' }} />
      </div>
      {children}
    </section>
  )
}
function Campo({ label, requerido, children }: { label: string; requerido?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{label}{requerido && <span style={{ color: '#ba41f7', marginLeft: 3 }}>*</span>}</span>
      {children}
    </label>
  )
}
function Opcion({ activo, onToggle, color, Icon, titulo, texto }: {
  activo: boolean; onToggle: () => void; color: string; Icon: typeof IcoHoy; titulo: string; texto: string
}) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        background: activo ? `${color}0d` : '#fff', border: `1px solid ${activo ? color + '66' : '#e8eaf0'}`, transition: 'all 140ms' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{titulo}</span>
        <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 1 }}>{texto}</span>
      </span>
      <span style={{ width: 36, height: 21, borderRadius: 999, background: activo ? color : '#e2e8f0', position: 'relative', flexShrink: 0, transition: 'background 140ms' }}>
        <span style={{ position: 'absolute', top: 2.5, left: activo ? 17.5 : 2.5, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 140ms' }} />
      </span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

/* ============================================================
   Cells / primitives
   ============================================================ */

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 'var(--mk-radius-md)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--mk-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)' }}>
        {label}
      </span>
    </div>
  )
}

function ViewToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', fontSize: 'var(--mk-text-xs)', fontWeight: 500,
        background: active ? 'var(--mk-bg-elevated)' : 'transparent',
        color: active ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)',
        border: 'none', borderRadius: 'var(--mk-radius-sm)',
        cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: active ? '0 0 0 1px var(--mk-border-subtle)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function start(e: React.MouseEvent) { e.stopPropagation(); setDraft(value); setEditing(true) }
  function commit() { setEditing(false); if (draft !== value) onSave(draft) }
  function cancel() { setEditing(false); setDraft(value) }
  if (editing) {
    return (
      <input
        autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        style={{
          width: '100%', padding: '4px 6px', margin: '-4px -6px',
          background: 'var(--mk-bg-base)',
          border: '1px solid var(--mk-accent)', borderRadius: 4,
          color: 'var(--mk-text-primary)', fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
          outline: 'none', boxShadow: '0 0 0 3px var(--mk-accent-glow)',
        }}
      />
    )
  }
  return (
    <span onClick={start}
      style={{
        color: 'var(--mk-text-primary)', cursor: 'text',
        padding: '2px 4px', margin: '-2px -4px', borderRadius: 3,
        display: 'inline-block', maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
      title="Click para editar"
    >
      {value}
    </span>
  )
}

function InlineDesc({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function start(e: React.MouseEvent) { e.stopPropagation(); setDraft(value); setEditing(true) }
  function commit() { setEditing(false); if (draft !== value) onSave(draft) }
  if (editing) {
    return (
      <textarea
        autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        rows={3}
        style={{
          width: '100%', padding: '6px 8px', margin: '-4px -6px',
          background: 'var(--mk-bg-base)',
          border: '1px solid var(--mk-accent)', borderRadius: 4,
          color: 'var(--mk-text-primary)', fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)',
          outline: 'none', boxShadow: '0 0 0 3px var(--mk-accent-glow)',
          resize: 'vertical',
        }}
      />
    )
  }
  return (
    <span onClick={start}
      style={{
        color: value ? 'var(--mk-text-secondary)' : 'var(--mk-text-quaternary)',
        fontSize: 'var(--mk-text-xs)', cursor: 'text',
        padding: '2px 4px', margin: '-2px -4px', borderRadius: 3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', maxWidth: '100%',
        fontStyle: value ? 'normal' : 'italic',
      }}
      title="Click para editar"
    >
      {value || 'Sin descripción'}
    </span>
  )
}

function InlineDate({
  value, onChange, colorOverride, bgOverride, alertaLabel,
}: {
  value: string
  onChange: (v: string) => void
  colorOverride?: string
  bgOverride?: string
  alertaLabel?: string
}) {
  const [editing, setEditing] = useState(false)
  function start(e: React.MouseEvent) { e.stopPropagation(); setEditing(true) }
  function commit(newVal: string) { setEditing(false); if (newVal && newVal !== value) onChange(newVal) }
  if (editing) {
    return (
      <input
        autoFocus type="date" defaultValue={value}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value) }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
        }}
        style={{
          padding: '4px 6px', margin: '-4px -6px',
          background: 'var(--mk-bg-base)',
          border: '1px solid var(--mk-accent)', borderRadius: 4,
          color: 'var(--mk-text-primary)', fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
          outline: 'none', boxShadow: '0 0 0 3px var(--mk-accent-glow)', colorScheme: 'dark',
        }}
      />
    )
  }
  return (
    <span onClick={start}
      style={{
        color: colorOverride ?? 'var(--mk-text-secondary)',
        background: bgOverride,
        fontVariantNumeric: 'tabular-nums', cursor: 'text',
        padding: bgOverride ? '3px 8px' : '2px 4px',
        margin: bgOverride ? 0 : '-2px -4px',
        borderRadius: bgOverride ? 'var(--mk-radius-sm)' : 3,
        fontWeight: bgOverride ? 500 : 400,
      }}
      title={alertaLabel ? `${alertaLabel}` : 'Click para cambiar fecha'}
    >
      {formatDateES(value)}
    </span>
  )
}

function ClickToSetDate({ onSet }: { onSet: (d: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <input
        autoFocus type="date"
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => { setEditing(false); if (e.target.value) onSet(e.target.value) }}
        style={{
          padding: '4px 6px', margin: '-4px -6px',
          background: 'var(--mk-bg-base)',
          border: '1px solid var(--mk-accent)', borderRadius: 4,
          color: 'var(--mk-text-primary)', fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
          outline: 'none', colorScheme: 'dark',
        }}
      />
    )
  }
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      style={{
        color: 'var(--mk-text-quaternary)', fontSize: 11, fontStyle: 'italic', cursor: 'text',
      }}
    >
      + agregar
    </span>
  )
}

function EditableSubEstado({ current, onChange }: { current: SubEstadoDiseno; onChange: (e: SubEstadoDiseno) => void }) {
  const [open, setOpen] = useState(false)
  const cfg = SUBESTADO_CONFIG[current]
  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 8px',
          background: cfg.bg, color: cfg.color,
          fontSize: 10.5, fontWeight: 500,
          borderRadius: 'var(--mk-radius-sm)',
          textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span className="mk-dot" style={{ background: cfg.color, width: 5, height: 5 }} />
        {cfg.label}
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)}>
          {(Object.entries(SUBESTADO_CONFIG) as [SubEstadoDiseno, typeof SUBESTADO_CONFIG.sin_empezar][]).map(([k, v]) => (
            <PopoverItem
              key={k}
              onClick={() => { onChange(k); setOpen(false) }}
              selected={k === current}
            >
              <span className="mk-dot" style={{ background: v.color, width: 8, height: 8 }} />
              <span>{v.label}</span>
            </PopoverItem>
          ))}
        </Popover>
      )}
    </div>
  )
}

function Popover({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      <div
        className="mk-anim-scale-in"
        style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 180,
          background: 'var(--mk-bg-overlay)',
          border: '1px solid var(--mk-border-default)',
          borderRadius: 'var(--mk-radius-md)',
          boxShadow: 'var(--mk-shadow-lg)',
          padding: 4, zIndex: 51, maxHeight: 320, overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </>
  )
}

function PopoverItem({ children, onClick, selected }: { children: React.ReactNode; onClick: () => void; selected?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '6px 10px',
        background: selected ? 'var(--mk-bg-selected)' : 'transparent',
        border: 'none', borderRadius: 'var(--mk-radius-sm)',
        color: 'var(--mk-text-primary)', fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
        cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

function Th({
  children, width, align, sortable, field, sort, onSort,
}: {
  children?: React.ReactNode; width?: string; align?: 'left' | 'right' | 'center'
  sortable?: boolean; field?: SortField
  sort?: { field: SortField; dir: SortDir } | null
  onSort?: (f: SortField) => void
}) {
  const isActive = sortable && field && sort?.field === field
  return (
    <th
      onClick={sortable && field && onSort ? () => onSort(field) : undefined}
      style={{
        textAlign: align ?? 'left', padding: '8px 14px',
        fontSize: 'var(--mk-text-xs)', textTransform: 'uppercase',
        letterSpacing: 'var(--mk-tracking-caps)',
        color: isActive ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)',
        fontWeight: 500,
        borderBottom: '1px solid var(--mk-border-subtle)',
        background: 'var(--mk-bg-base)',
        position: 'sticky', top: 0, zIndex: 2, width,
        cursor: sortable ? 'pointer' : 'default', userSelect: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {sortable && (
          <span style={{ opacity: isActive ? 1 : 0.3, fontSize: 8, color: isActive ? 'var(--mk-accent)' : 'inherit' }}>
            {isActive ? (sort!.dir === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        )}
      </span>
    </th>
  )
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <td style={{ padding: '0 14px', textAlign: align ?? 'left', borderBottom: '1px solid var(--mk-border-subtle)', verticalAlign: 'middle' }}>
      {children}
    </td>
  )
}

type FilterOption = { id: string; label: string; color?: string; emoji?: string }

function FilterPill({ label, value, dotColor, options, onSelect }: { label: string; value: string | null; dotColor: string | null; options: FilterOption[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: value ? 'var(--mk-accent-bg)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${value ? 'var(--mk-border-accent)' : 'var(--mk-border-subtle)'}`,
          borderRadius: 'var(--mk-radius-md)',
          color: value ? 'var(--mk-text-primary)' : 'var(--mk-text-secondary)',
          fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)', fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {dotColor && <span className="mk-dot" style={{ background: dotColor, width: 6, height: 6 }} />}
        <span style={{ opacity: 0.7 }}>{label}:</span>
        <span>{value ?? 'Todos'}</span>
        <span style={{ opacity: 0.4, fontSize: 8 }}>▼</span>
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)}>
          {options.map((o) => (
            <PopoverItem key={o.id} onClick={() => { onSelect(o.id); setOpen(false) }}>
              {o.emoji ? (
                <span style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: o.color ? `${o.color}1f` : 'rgba(0,0,0,0.04)',
                  border: o.color ? `1px solid ${o.color}40` : '1px solid rgba(0,0,0,0.08)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, lineHeight: 1, flexShrink: 0,
                }}>{o.emoji}</span>
              ) : (
                o.color && <span className="mk-dot" style={{ background: o.color, width: 8, height: 8 }} />
              )}
              <span>{o.label}</span>
            </PopoverItem>
          ))}
        </Popover>
      )}
    </div>
  )
}

/* ============================================================
   RangoFechasFilter — filtro por fecha/rango (Pedro 23-jun-2026)
   ============================================================ */

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DOW_MIN = ['L', 'M', 'M', 'J', 'V', 'S', 'D']  // semana empieza en lunes

/* Helpers de fecha timezone-safe: armamos/leemos YYYY-MM-DD con enteros
   locales (new Date(y, m-1, d)) para evitar el corrimiento de día que
   produce parsear/serializar en UTC. */
function isoYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function addDiasISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return isoYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}
function rangoFechasLabel(desde: string, hasta: string): string | null {
  if (!desde && !hasta) return null
  if (desde && hasta) return desde === hasta ? formatDateES(desde) : `${formatDateES(desde)} – ${formatDateES(hasta)}`
  if (desde) return `Desde ${formatDateES(desde)}`
  return `Hasta ${formatDateES(hasta)}`
}

function RangoFechasFilter({ desde, hasta, hoy, onChange }: {
  desde: string; hasta: string; hoy: string; onChange: (desde: string, hasta: string) => void
}) {
  const [open, setOpen] = useState(false)
  /* Mes mostrado (YYYY-MM): arranca en el mes del 'desde' o, si no hay, en hoy. */
  const [verMes, setVerMes] = useState(() => (desde || hoy).slice(0, 7))
  /* Tras el 1er clic en un día queda true → el siguiente clic CIERRA el rango.
     Un clic = un solo día; dos clics = rango. */
  const [eligiendoFin, setEligiendoFin] = useState(false)

  const activo = !!(desde || hasta)
  const label = rangoFechasLabel(desde, hasta)

  /* Grilla del mes visible (lunes primero). */
  const [vy, vm] = verMes.split('-').map(Number)
  const primerDiaSemana = (new Date(vy, vm - 1, 1).getDay() + 6) % 7  // 0=lunes
  const diasEnMes = new Date(vy, vm, 0).getDate()
  const celdas: (string | null)[] = []
  for (let i = 0; i < primerDiaSemana; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(isoYMD(vy, vm, d))

  function cambiarMes(delta: number) {
    const dt = new Date(vy, vm - 1 + delta, 1)
    setVerMes(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
  }
  function clickDia(iso: string) {
    if (!eligiendoFin) {
      onChange(iso, iso)
      setEligiendoFin(true)
    } else {
      const a = desde || iso
      const lo = iso < a ? iso : a
      const hi = iso < a ? a : iso
      onChange(lo, hi)
      setEligiendoFin(false)
    }
  }
  function aplicarPreset(d: string, h: string) {
    onChange(d, h)
    setEligiendoFin(false)
    setVerMes(d.slice(0, 7))
    setOpen(false)
  }
  function limpiar() {
    onChange('', '')
    setEligiendoFin(false)
  }

  /* Presets calculados desde hoy. */
  const [hy, hm, hd] = hoy.split('-').map(Number)
  const dowHoy = (new Date(hy, hm - 1, hd).getDay() + 6) % 7
  const lunesEstaSem = addDiasISO(hoy, -dowHoy)
  const mesPasadoY = hm === 1 ? hy - 1 : hy
  const mesPasadoM = hm === 1 ? 12 : hm - 1
  const presets = [
    { label: 'Hoy', d: hoy, h: hoy },
    { label: 'Ayer', d: addDiasISO(hoy, -1), h: addDiasISO(hoy, -1) },
    { label: 'Últimos 7 días', d: addDiasISO(hoy, -6), h: hoy },
    { label: 'Esta semana', d: lunesEstaSem, h: addDiasISO(lunesEstaSem, 6) },
    { label: 'Este mes', d: isoYMD(hy, hm, 1), h: isoYMD(hy, hm, new Date(hy, hm, 0).getDate()) },
    { label: 'Mes pasado', d: isoYMD(mesPasadoY, mesPasadoM, 1), h: isoYMD(mesPasadoY, mesPasadoM, new Date(mesPasadoY, mesPasadoM, 0).getDate()) },
  ]

  const chipStyle = (sel: boolean): React.CSSProperties => ({
    padding: '4px 9px', fontSize: 'var(--mk-text-xs)', fontFamily: 'inherit', fontWeight: 500,
    background: sel ? 'var(--mk-accent)' : 'rgba(255, 255, 255, 0.04)',
    color: sel ? '#fff' : 'var(--mk-text-secondary)',
    border: `1px solid ${sel ? 'var(--mk-accent)' : 'var(--mk-border-subtle)'}`,
    borderRadius: 999, cursor: 'pointer',
  })
  const navBtnStyle: React.CSSProperties = {
    width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-sm)',
    color: 'var(--mk-text-secondary)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { if (!open) setEligiendoFin(false); setOpen((o) => !o) }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: activo ? 'var(--mk-accent-bg)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${activo ? 'var(--mk-border-accent)' : 'var(--mk-border-subtle)'}`,
          borderRadius: 'var(--mk-radius-md)',
          color: activo ? 'var(--mk-text-primary)' : 'var(--mk-text-secondary)',
          fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)', fontWeight: 500, cursor: 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span style={{ opacity: 0.7 }}>Fechas:</span>
        <span>{label ?? 'Todas'}</span>
        {activo ? (
          <span
            role="button"
            aria-label="Limpiar fechas"
            onClick={(e) => { e.stopPropagation(); limpiar() }}
            style={{ marginLeft: 2, padding: '0 2px', opacity: 0.6, fontSize: 13, lineHeight: 1 }}
          >×</span>
        ) : (
          <span style={{ opacity: 0.4, fontSize: 8 }}>▼</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div
            className="mk-anim-scale-in"
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 51, width: 290,
              background: 'var(--mk-bg-overlay)', border: '1px solid var(--mk-border-default)',
              borderRadius: 'var(--mk-radius-md)', boxShadow: 'var(--mk-shadow-lg)', padding: 12,
            }}
          >
            {/* Atajos rápidos */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {presets.map((p) => (
                <button key={p.label} onClick={() => aplicarPreset(p.d, p.h)} style={chipStyle(desde === p.d && hasta === p.h)}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Navegación de mes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button onClick={() => cambiarMes(-1)} style={navBtnStyle} aria-label="Mes anterior">‹</button>
              <span style={{ fontSize: 'var(--mk-text-sm)', fontWeight: 600, color: 'var(--mk-text-primary)' }}>
                {MESES_LARGOS[vm - 1]} {vy}
              </span>
              <button onClick={() => cambiarMes(1)} style={navBtnStyle} aria-label="Mes siguiente">›</button>
            </div>

            {/* Cabecera días de la semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DOW_MIN.map((d, i) => (
                <span key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--mk-text-quaternary)', fontWeight: 600 }}>{d}</span>
              ))}
            </div>

            {/* Grilla de días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {celdas.map((iso, i) => {
                if (!iso) return <span key={i} />
                const dNum = Number(iso.slice(8, 10))
                const enRango = !!desde && !!hasta && iso >= desde && iso <= hasta
                const esExtremo = iso === desde || iso === hasta
                const esHoy = iso === hoy
                return (
                  <button
                    key={i}
                    onClick={() => clickDia(iso)}
                    style={{
                      height: 30, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                      background: esExtremo ? 'var(--mk-accent)' : enRango ? 'var(--mk-accent-bg)' : 'transparent',
                      color: esExtremo ? '#fff' : 'var(--mk-text-primary)',
                      fontWeight: esExtremo ? 700 : 400,
                      boxShadow: esHoy && !esExtremo ? 'inset 0 0 0 1px var(--mk-border-accent)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (!esExtremo && !enRango) e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                    onMouseLeave={(e) => { if (!esExtremo && !enRango) e.currentTarget.style.background = 'transparent' }}
                  >
                    {dNum}
                  </button>
                )
              })}
            </div>

            {/* Footer: estado + acciones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--mk-border-subtle)', gap: 8 }}>
              <span style={{ fontSize: 'var(--mk-text-xs)', color: eligiendoFin ? 'var(--mk-accent)' : 'var(--mk-text-tertiary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {eligiendoFin ? 'Elige el fin del rango…' : (label ?? 'Sin filtro de fecha')}
              </span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {activo && <button onClick={limpiar} style={clearBtnStyle}>Limpiar</button>}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '4px 12px', fontSize: 'var(--mk-text-xs)', fontFamily: 'inherit', fontWeight: 500,
                    background: 'var(--mk-accent)', color: '#fff', border: '1px solid var(--mk-accent)',
                    borderRadius: 'var(--mk-radius-md)', cursor: 'pointer',
                  }}
                >Listo</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ============================================================
   Sort + styles + icons
   ============================================================ */

function sortValue(e: DisenoEntry, f: SortField): string | number {
  switch (f) {
    case 'marca':        return e.marcaNombre
    case 'nombre':       return e.nombreTarea
    case 'fechaDiseno':  return e.fechaDiseno ?? 'zzz'
    case 'fechaEntrega': return e.fechaEntrega ?? 'zzz'
    case 'subEstado':    return e.subEstado
  }
}

const headerStyle: React.CSSProperties = {
  height: 'var(--mk-header-height)', padding: '0 20px',
  borderBottom: '1px solid var(--mk-border-subtle)',
  display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
}
const filterBarStyle: React.CSSProperties = {
  padding: '10px 20px', borderBottom: '1px solid var(--mk-border-subtle)',
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  background: 'rgba(255, 255, 255, 0.01)', flexShrink: 0,
}
const clearBtnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 'var(--mk-text-xs)', fontFamily: 'inherit',
  background: 'transparent', border: 'none',
  color: 'var(--mk-text-tertiary)', cursor: 'pointer',
  borderRadius: 'var(--mk-radius-sm)',
}
const miTrabajoBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 12px', fontSize: 'var(--mk-text-xs)', fontFamily: 'inherit',
  fontWeight: 500, borderRadius: 'var(--mk-radius-md)', cursor: 'pointer',
}
const openBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--mk-text-tertiary)', cursor: 'pointer', padding: 4,
  borderRadius: 'var(--mk-radius-sm)',
  display: 'inline-flex', alignItems: 'center',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-primary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
  outline: 'none',
  colorScheme: 'dark',
}

/* SVG icons */
function IconSearch()    { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconArrowOpen() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5H10M10 6.5L7 3.5M10 6.5L7 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function IconToday()     { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 1V3M8 1V3M1.5 5H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> }
function IconTable()     { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="1.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 4.5H9.5M1.5 7H9.5M4 1.5V9.5" stroke="currentColor" strokeWidth="1.2"/></svg> }
function IconKanban()    { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="1.5" width="2.5" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="4.5" y="1.5" width="2.5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7.5" y="1.5" width="2.5" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.2"/></svg> }
function IconArchive()   { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="2" width="10" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 4V10C2.5 10.5 2.8 11 3.5 11H9.5C10.2 11 10.5 10.5 10.5 10V4" stroke="currentColor" strokeWidth="1.2"/><path d="M5 6.5H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> }
/* IconOpenInPage: estilo Notion — flecha diagonal saliendo de un cuadro,
   significa "abrir esta tarea en su página de detalle". */
function IconOpenInPage(){ return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 9V2.5C2 2.2 2.2 2 2.5 2H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M8 2H10V4M10 2L6.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.5 6.5V9C8.5 9.3 8.3 9.5 8 9.5H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> }
/* Icons compactos usados en los footer pills de KanbanCard */
function IconCalendar()  { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M3 1V3M7 1V3M1 4.5H9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> }
function IconPalette()   { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1C2.79 1 1 2.79 1 5C1 6.5 2 7 3 7C3.5 7 3.5 6.5 3.5 6.2C3.5 5.6 4 5.5 4.5 5.5C5.5 5.5 6 6 6 6.5C6 7.5 5.5 8 5 8.5C4.7 8.8 5 9 5 9C7.21 9 9 7.21 9 5C9 2.79 7.21 1 5 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg> }
/* IconHourglass: usado en el footer de archivadas para indicar
   "duración" (tiempo que estuvo en progreso). */
function IconHourglass() { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 1H8M2 9H8M2.5 1V3L5 5L7.5 3V1M2.5 9V7L5 5L7.5 7V9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg> }
