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

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MarcaSelect } from '@/components/marca-select'
import {
  updateDisenoEntry,
  marcarParaDisenarHoy,
  desmarcarParaDisenarHoy,
  archivarTarea,
  crearDisenoTask,
  obtenerCorreosDeMarca,
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
  listo:        { label: 'Listo',       color: '#34d399', bg: 'rgba(52, 211, 153, 0.14)' },
  archivado:    { label: 'Archivado',   color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.10)' },
}

/* Orden de columnas del kanban. Pedro pidió incluir 'archivado' como
   4ta columna — útil para mover cards terminadas/canceladas sin
   perderlas, y arrastrarlas devuelta si fue por error. */
const KANBAN_COLUMNS: SubEstadoDiseno[] = ['sin_empezar', 'en_progreso', 'listo', 'archivado']

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
}

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
  })
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  /* Si la URL trajo ?nuevo=1 (desde el botón en /grilla), abrir el modal
     de creación inmediatamente. Solo la primera vez (luego lo cierra
     manual o tras crear). */
  useEffect(() => {
    if (initialNuevo) setModalOpen(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const marcaBySlug = useMemo(() => new Map(marcas.map((m) => [m.slug, m])), [marcas])
  const hoy = new Date().toISOString().slice(0, 10)

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
      if (filters.marcaSlug !== 'todas' && e.marcaSlug !== filters.marcaSlug) return false
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
    if (migrationPendiente) {
      toast.error('Migration pendiente. Aplicar 20260605200001_disenadores.sql.')
      return
    }
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
    setFilters({ subEstado: 'activas', marcaSlug: 'todas', soloHoy: false, mostrarArchivadas: false })
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
    setEntries((cur) => [nueva, ...cur])
    toast.success(`Tarea creada: ${nueva.nombreTarea}`)
    setModalOpen(false)
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--mk-bg-base)' }}>
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
            if (filters.marcaSlug !== 'todas' && e.marcaSlug !== filters.marcaSlug) return false
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
  entries, onMoveCard, onOpenCard, onArchive,
}: {
  entries: DisenoEntry[]
  onMoveCard: (id: string, newSub: SubEstadoDiseno) => void
  onOpenCard: (id: string) => void
  onArchive: (id: string) => void
}) {
  const [dragOver, setDragOver] = useState<SubEstadoDiseno | null>(null)

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
        maxWidth: 1200, margin: '0 auto', padding: '18px 20px',
        display: 'grid', gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))', gap: 14,
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
                {items.map((entry) => (
                  <KanbanCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => onOpenCard(entry.id)}
                    onDragStart={(e) => onDragStart(e, entry.id)}
                    onArchive={() => onArchive(entry.id)}
                  />
                ))}
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

function KanbanCard({ entry, onClick, onDragStart, onArchive }: {
  entry: DisenoEntry
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onArchive: () => void
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
        border: `1px solid ${hover ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.05)'}`,
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
  const [esParaPublicar, setEsParaPublicar] = useState(false)
  const [fechaPublicacion, setFechaPublicacion] = useState('')
  const [fechaEdicion, setFechaEdicion] = useState('')
  /* Reunión de revisión opcional */
  const [agregarReunion, setAgregarReunion] = useState(false)
  const [horaReunion, setHoraReunion] = useState('')
  const [invitadosInput, setInvitadosInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* Auto-fetch correos de cliente cuando elige marca: mejora UX para
     que el usuario no tenga que escribir manualmente los emails. */
  useEffect(() => {
    if (!marcaSlug || marcaSlug === 'interno') {
      return
    }
    let cancelado = false
    obtenerCorreosDeMarca(marcaSlug).then((r) => {
      if (cancelado) return
      if (r.ok && r.correos.length > 0) {
        /* Solo precargo si el usuario NO escribió nada todavía,
           para no pisar lo que esté tipeando. */
        setInvitadosInput((cur) => cur.trim() ? cur : r.correos.join(', '))
      }
    })
    return () => { cancelado = true }
  }, [marcaSlug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { toast.error('Falta nombre'); return }
    if (esParaPublicar && !marcaSlug) { toast.error('Selecciona la marca'); return }
    if (esParaPublicar && !fechaPublicacion) { toast.error('Falta fecha de publicación'); return }
    if (agregarReunion && !horaReunion) { toast.error('Falta hora de reunión'); return }

    /* Parse invitados — soporta separadores comunes: coma, salto de
       línea, punto y coma. Filtra strings que parezcan email válido
       (contiene @ y al menos un punto después). */
    const invitados = agregarReunion
      ? invitadosInput
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter((s) => /@.+\./.test(s))
      : []

    setSubmitting(true)
    const r = await crearDisenoTask({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      fechaDiseno: fechaDiseno || null,
      fechaEntrega: fechaEntrega || null,
      /* Marca siempre se manda (incluso para tareas no publicables).
         Si está vacío y NO es para publicar, el server default a "interno". */
      marcaSlug: marcaSlug || undefined,
      marcasExtras: Array.from(marcasExtras),
      esParaPublicar,
      fechaPublicacion: esParaPublicar ? fechaPublicacion : null,
      fechaEdicion: esParaPublicar ? fechaEdicion || null : null,
      horaReunion: agregarReunion ? horaReunion : null,
      invitadosEmails: agregarReunion ? invitados : null,
    })
    setSubmitting(false)
    if (!r.ok) { toast.error(r.error); return }

    /* Si Ailyn replicó en marcas extras, mostramos toast confirmando.
       Las extras no van al optimistic update; aparecerán cuando recargue
       o se haga revalidatePath (que ya pasa en server). */
    if (r.data!.extrasCreadas > 0) {
      toast.success(`Tarea creada en ${r.data!.extrasCreadas + 1} marcas (principal + ${r.data!.extrasCreadas} replicada${r.data!.extrasCreadas > 1 ? 's' : ''})`)
    }

    /* Para el optimistic update local, busco la marca que se eligió;
       si quedó vacío, uso el placeholder "interno". */
    const marca = marcaSlug ? marcas.find((m) => m.slug === marcaSlug) : null
    onCreated({
      id: r.data!.id,
      marcaSlug: marca?.slug ?? 'interno',
      marcaNombre: marca?.nombre ?? 'Distinto · Interno',
      marcaColor: marca?.color ?? '#a78bfa',
      marcaEmoji: marca?.emoji ?? null,
      esInterno: !marca,
      nombreTarea: nombre.trim(),
      descripcion: descripcion.trim() || null,
      fechaPublicacion: esParaPublicar ? fechaPublicacion : null,
      fechaDiseno: fechaDiseno || null,
      fechaEntrega: fechaEntrega || null,
      /* Mismo estado que usamos en el insert del server action */
      estado: 'disenar',
      subEstado: 'sin_empezar',
      plataformas: [],
      tipoContenido: [],
      fechaMarcadaParaDisenar: null,
      startedAt: null,
      archivedAt: null,
    })
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        /* Modal con 3 zonas: header arriba (fijo), body en el medio
           (scrolleable cuando el contenido crece), footer abajo (fijo
           con los botones). Sin esto, cuando Pedro activaba ambos
           toggles (publicar + reunión), el modal crecía más allá del
           viewport y los botones quedaban cortados.
           maxHeight: 90vh deja un margen de 10vh para que se vea el
           backdrop oscuro alrededor del modal. */
        style={{
          width: '100%', maxWidth: 540,
          maxHeight: '90vh',
          background: 'var(--mk-bg-overlay)',
          border: '1px solid var(--mk-border-default)',
          borderRadius: 'var(--mk-radius-lg)',
          boxShadow: 'var(--mk-shadow-lg)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',  /* clip al border-radius */
        }}
      >
        {/* HEADER fijo */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 14px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 'var(--mk-text-base)', fontWeight: 600, color: 'var(--mk-text-primary)', margin: 0 }}>
            Nueva tarea de diseño
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--mk-text-tertiary)', cursor: 'pointer', padding: 4 }}>
            ✕
          </button>
        </div>

        {/* BODY scrolleable — TODO el contenido del form va acá */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>

        <Field label="Nombre de la tarea*">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Banner web Kintu"
            autoFocus
            style={inputStyle}
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Brief de la tarea. ¿Qué hay que diseñar? ¿Referencias?"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
          />
        </Field>

        {/* Marca SIEMPRE visible (Pedro pidió poder elegir marca incluso
            cuando la tarea NO es para publicar). Al elegir, se
            auto-precargan los correos de cliente como invitados de la
            reunión (si tiene reunión). */}
        <Field label="Marca / cliente">
          <MarcaSelect marcas={marcas} value={marcaSlug} onChange={setMarcaSlug} />
        </Field>

        {/* Pedro: 'que se puedan seleccionar más de una marca cuando se
            hace diseño'. Si Ailyn elige una marca principal, debajo
            aparece la opción de replicar en otras marcas (chips
            toggleables). Se crea una tarea por cada marca seleccionada. */}
        {marcaSlug && marcaSlug !== 'interno' && marcas.length > 1 && (
          <div style={{ marginTop: 6 }}>
            <div style={{
              fontSize: 11, color: '#6b7280', marginBottom: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span>
                ¿Replicar en más marcas? <span style={{ color: '#9ca3af' }}>(opcional)</span>
              </span>
              {marcasExtras.size > 0 && (
                <button
                  type="button"
                  onClick={() => setMarcasExtras(new Set())}
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#6b7280', fontSize: 11,
                    cursor: 'pointer', padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {marcas
                .filter((m) => m.slug !== marcaSlug && m.slug !== 'interno')
                .map((m) => {
                  const checked = marcasExtras.has(m.slug)
                  return (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => {
                        setMarcasExtras((prev) => {
                          const next = new Set(prev)
                          if (next.has(m.slug)) next.delete(m.slug)
                          else next.add(m.slug)
                          return next
                        })
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 11px',
                        borderRadius: 999,
                        background: checked ? `${m.color}1a` : '#f9fafb',
                        border: `1px solid ${checked ? m.color + '66' : '#e5e7eb'}`,
                        color: checked ? m.color : '#374151',
                        fontSize: 11.5, fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 120ms',
                      }}
                    >
                      {checked && <span>✓</span>}
                      {m.emoji && <span style={{ fontSize: 12 }}>{m.emoji}</span>}
                      <span>{m.nombre}</span>
                    </button>
                  )
                })}
            </div>
            {marcasExtras.size > 0 && (
              <div style={{
                fontSize: 11, color: '#374151',
                marginTop: 8, padding: '6px 10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
              }}>
                ✓ Se crearán <strong>{marcasExtras.size + 1}</strong> tareas idénticas
                (principal + {marcasExtras.size} replicada{marcasExtras.size > 1 ? 's' : ''})
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Fecha de entrega">
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              style={{ ...inputStyle, cursor: 'pointer' }}
            />
          </Field>
          <Field label="Fecha de diseño">
            <input
              type="date"
              value={fechaDiseno}
              onChange={(e) => setFechaDiseno(e.target.value)}
              onFocus={openPickerOnFocus}
              onClick={openPickerOnFocus}
              style={{ ...inputStyle, cursor: 'pointer' }}
            />
          </Field>
        </div>

        {/* Toggle ¿Es para publicar? — solo aparece si NO es interno
            (tener marca elegida). Para tareas internas no se publica. */}
        <div
          onClick={() => setEsParaPublicar((v) => !v)}
          style={{
            padding: 12, borderRadius: 'var(--mk-radius-md)',
            border: `1px solid ${esParaPublicar ? 'var(--mk-accent)' : 'var(--mk-border-subtle)'}`,
            background: esParaPublicar ? 'rgba(113, 112, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
          }}
        >
          <input
            type="checkbox"
            checked={esParaPublicar}
            onChange={(e) => setEsParaPublicar(e.target.checked)}
            style={{ accentColor: 'var(--mk-accent)', width: 14, height: 14 }}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', fontWeight: 500 }}>
              ¿Es un diseño para publicar?
            </span>
            <span style={{ fontSize: 11, color: 'var(--mk-text-tertiary)' }}>
              Si lo marcas, también se agrega al calendario de publicaciones.
            </span>
          </div>
        </div>

        {esParaPublicar && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: 12, marginTop: -4,
            background: 'rgba(167, 139, 250, 0.03)',
            border: '1px solid rgba(167, 139, 250, 0.20)',
            borderRadius: 'var(--mk-radius-md)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Fecha de publicación*">
                <input
                  type="date"
                  value={fechaPublicacion}
                  onChange={(e) => setFechaPublicacion(e.target.value)}
                  onFocus={openPickerOnFocus}
                  onClick={openPickerOnFocus}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                />
              </Field>
              <Field label="Fecha de edición">
                <input
                  type="date"
                  value={fechaEdicion}
                  onChange={(e) => setFechaEdicion(e.target.value)}
                  onFocus={openPickerOnFocus}
                  onClick={openPickerOnFocus}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Toggle Reunión de revisión */}
        <div
          onClick={() => setAgregarReunion((v) => !v)}
          style={{
            padding: 12, borderRadius: 'var(--mk-radius-md)',
            border: `1px solid ${agregarReunion ? '#34d399' : 'var(--mk-border-subtle)'}`,
            background: agregarReunion ? 'rgba(52, 211, 153, 0.06)' : 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'all 120ms ease',
          }}
        >
          <input
            type="checkbox"
            checked={agregarReunion}
            onChange={(e) => setAgregarReunion(e.target.checked)}
            style={{ accentColor: '#34d399', width: 14, height: 14 }}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', fontWeight: 500 }}>
              📹 Agendar reunión de revisión
            </span>
            <span style={{ fontSize: 11, color: 'var(--mk-text-tertiary)' }}>
              Genera evento de Google Calendar + link Meet con invitados.
            </span>
          </div>
        </div>

        {agregarReunion && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: 12, marginTop: -4,
            background: 'rgba(52, 211, 153, 0.03)',
            border: '1px solid rgba(52, 211, 153, 0.20)',
            borderRadius: 'var(--mk-radius-md)',
          }}>
            <Field label="Hora de la reunión*">
              <input
                type="time"
                value={horaReunion}
                onChange={(e) => setHoraReunion(e.target.value)}
                onFocus={openPickerOnFocus}
                onClick={openPickerOnFocus}
                style={{ ...inputStyle, cursor: 'pointer' }}
              />
            </Field>
            <Field label="Invitados (correos separados por coma)">
              <textarea
                value={invitadosInput}
                onChange={(e) => setInvitadosInput(e.target.value)}
                placeholder={
                  marcaSlug && marcaSlug !== 'interno'
                    ? 'Auto-llenado con los correos de la marca…'
                    : 'cliente@ejemplo.com, otrocorreo@cliente.com'
                }
                rows={2}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: 50 }}
              />
              <span style={{ fontSize: 10, color: 'var(--mk-text-quaternary)', marginTop: 2 }}>
                💡 Se cargan automáticamente al elegir marca. Edítalos desde Settings → Marca.
              </span>
            </Field>
            <div style={{
              padding: '8px 10px', borderRadius: 6,
              background: 'rgba(167, 139, 250, 0.08)',
              fontSize: 11, color: 'var(--mk-text-tertiary)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ⚠ Sync con Google Calendar en proceso. Por ahora se guarda la reunión y se sincroniza luego automáticamente.
            </div>
          </div>
        )}

        </div>{/* fin BODY scrolleable */}

        {/* FOOTER fijo con los botones — siempre visible incluso
            cuando el body tiene mucho contenido. */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '14px 24px 18px',
          borderTop: '1px solid var(--mk-border-subtle)',
          background: 'var(--mk-bg-overlay)',
          flexShrink: 0,
        }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: '8px 14px', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
              background: 'transparent', color: 'var(--mk-text-secondary)',
              border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-md)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={submitting}
            style={{
              padding: '8px 18px', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
              background: 'var(--mk-accent)', color: 'white',
              border: 'none', borderRadius: 'var(--mk-radius-md)',
              cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Creando…' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </div>
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
