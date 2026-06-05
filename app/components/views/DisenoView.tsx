'use client'

/* DisenoView — módulo de diseño paralelo al de edición.
 *
 * Reusa el patrón de EditorView pero adaptado al workflow del diseñador:
 *   - Métricas: por diseñar, diseñados/mes, urgentes, con portada lista
 *   - Filtros: estado, diseñador, marca, "mi trabajo de hoy"
 *   - Edición inline: nombre, diseñador, fecha diseño, fecha publicación
 *   - Toggles rápidos: portada lista, diseñado
 *   - Acciones: marcar para diseñar hoy, abrir detalle
 *
 * Estilo: Tailwind con tokens del design system (bg-card, text-foreground,
 * etc.) — más conciso que los inline styles del EditorView pero misma
 * vibra visual.
 */

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search, Calendar, Image as ImageIcon, CheckCircle2, AlertTriangle,
  PaintBucket, ChevronDown, ExternalLink, Sparkles, ChevronUp,
} from 'lucide-react'
import {
  updateDisenoEntry,
  marcarParaDisenarHoy,
  desmarcarParaDisenarHoy,
  togglePortadaLista,
  toggleDisenado,
} from '@/app/diseno/_actions'
import {
  type DisenoEntry,
  type DisenadorOption,
  type EstadoPub,
  type SubEstadoDiseno,
  type AlertaFecha,
  calcularAlertaFecha,
} from '@/lib/diseno/types'

/* ============================================================
   Constantes UI
   ============================================================ */

const ESTADO_CONFIG: Record<EstadoPub, { label: string; color: string; bg: string }> = {
  disenar:   { label: 'Diseñar',   color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
  editar:    { label: 'Editar',    color: '#f2c94c', bg: 'rgba(242, 201, 76, 0.12)' },
  aprobar:   { label: 'Aprobar',   color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  programar: { label: 'Programar', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  publicar:  { label: 'Publicar',  color: '#4cb782', bg: 'rgba(76, 183, 130, 0.12)' },
  publicado: { label: 'Publicado', color: '#737373', bg: 'rgba(115, 115, 115, 0.10)' },
  borrador:  { label: 'Borrador',  color: '#737373', bg: 'rgba(115, 115, 115, 0.08)' },
}

const SUBESTADO_CONFIG: Record<SubEstadoDiseno, { label: string; color: string; bg: string }> = {
  sin_empezar:  { label: 'Sin empezar', color: '#737373', bg: 'rgba(115, 115, 115, 0.10)' },
  en_progreso:  { label: 'En progreso', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  listo:        { label: 'Listo',       color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
}

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

type SortField = 'marca' | 'nombre' | 'disenador' | 'fechaDiseno' | 'fechaPublicacion'
type SortDir = 'asc' | 'desc'

type Filters = {
  subEstado: SubEstadoDiseno | 'todos'
  disenadorId: string | 'todos' | '_sin'
  marcaSlug: string | 'todas'
  soloHoy: boolean
  conPortadaLista: 'todos' | 'si' | 'no'
}

type Props = {
  entries: DisenoEntry[]
  disenadores: DisenadorOption[]
  marcas: MarcaOption[]
  migrationPendiente?: boolean
  rangoDesde: string
  rangoHasta: string
}

/* ============================================================
   Component
   ============================================================ */

export function DisenoView({
  entries: initialEntries, disenadores, marcas, migrationPendiente,
  rangoDesde, rangoHasta,
}: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({
    subEstado: 'todos',
    disenadorId: 'todos',
    marcaSlug: 'todas',
    soloHoy: false,
    conPortadaLista: 'todos',
  })
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir } | null>(null)

  const marcaBySlug = useMemo(() => new Map(marcas.map((m) => [m.slug, m])), [marcas])
  const disenadorById = useMemo(() => new Map(disenadores.map((d) => [d.id, d])), [disenadores])
  const hoy = new Date().toISOString().slice(0, 10)

  /* ============ Métricas ============ */
  const metricas = useMemo(() => {
    /* Diseñados/mes: contar las que tienen disenado=true Y cuya
       fecha_diseno cae en el rango cargado (mayo + junio en v1). */
    const enRango = entries
    const disenadosMes = enRango.filter((e) => e.disenado).length
    const totalMes = enRango.length

    /* Por diseñar = no diseñado todavía */
    const porDisenar = entries.filter((e) => !e.disenado).length

    /* Portada lista pero falta diseño final (Ailyn ya armó la referencia
       pero aún no terminó). Útil para identificar trabajo a medias. */
    const portadaLista = entries.filter((e) => e.portadaLista && !e.disenado).length

    /* Urgentes: fecha_diseno está cerca o pasó la fecha_publicacion */
    const urgentes = entries.filter((e) =>
      !e.disenado && calcularAlertaFecha(e.fechaDiseno, e.fechaPublicacion) === 'rojo'
    ).length

    /* Marcadas como "diseñar hoy" */
    const hoyMarcadas = entries.filter((e) => e.fechaMarcadaParaDisenar === hoy).length

    return { disenadosMes, totalMes, porDisenar, portadaLista, urgentes, hoyMarcadas }
  }, [entries, hoy])

  /* ============ Filtros + búsqueda + sort ============ */
  const visible = useMemo(() => {
    let list = entries.filter((e) => {
      /* "Mi trabajo de hoy" ignora otros filtros de estado para
         mostrar todo lo marcado hoy, aunque ya esté diseñado. */
      if (filters.soloHoy) {
        if (e.fechaMarcadaParaDisenar !== hoy) return false
      } else {
        if (filters.subEstado !== 'todos' && e.subEstado !== filters.subEstado) return false
      }
      if (filters.disenadorId !== 'todos') {
        if (filters.disenadorId === '_sin') {
          if (e.disenadorId) return false
        } else if (e.disenadorId !== filters.disenadorId) return false
      }
      if (filters.marcaSlug !== 'todas' && e.marcaSlug !== filters.marcaSlug) return false
      if (filters.conPortadaLista === 'si' && !e.portadaLista) return false
      if (filters.conPortadaLista === 'no' && e.portadaLista) return false
      if (search) {
        const q = search.toLowerCase()
        const marca = marcaBySlug.get(e.marcaSlug)
        if (
          !e.nombreTarea.toLowerCase().includes(q) &&
          !marca?.nombre.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    if (sort) {
      list = [...list].sort((a, b) => {
        const av = sortValue(a, sort.field, marcaBySlug, disenadorById)
        const bv = sortValue(b, sort.field, marcaBySlug, disenadorById)
        if (av < bv) return sort.dir === 'asc' ? -1 : 1
        if (av > bv) return sort.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [entries, filters, search, sort, marcaBySlug, disenadorById, hoy])

  const hasActiveFilters =
    filters.subEstado !== 'todos' ||
    filters.disenadorId !== 'todos' ||
    filters.marcaSlug !== 'todas' ||
    filters.conPortadaLista !== 'todos' ||
    filters.soloHoy ||
    !!search

  /* ============ Edit handlers ============ */

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
        toast.error(`Error al guardar: ${r.error}`)
      } else {
        toast.success(mensaje, { duration: 1500 })
      }
    })
  }

  function setDisenador(id: string, disenadorId: string | null) {
    const nombre = disenadorId ? disenadorById.get(disenadorId)?.nombre ?? null : null
    persist(
      id,
      { disenadorId, disenadorNombre: nombre },
      () => updateDisenoEntry(id, { disenadorId }),
      `Diseñador → ${nombre ?? 'Sin asignar'}`,
    )
  }
  function setNombre(id: string, nombre: string) {
    const trimmed = nombre.trim()
    if (!trimmed) { toast.error('El nombre no puede estar vacío'); return }
    persist(id, { nombreTarea: trimmed }, () => updateDisenoEntry(id, { nombre: trimmed }), 'Tarea renombrada')
  }
  function setFechaDiseno(id: string, fechaDiseno: string) {
    persist(id, { fechaDiseno }, () => updateDisenoEntry(id, { fechaDiseno }), `Fecha diseño → ${formatDateES(fechaDiseno)}`)
  }
  function setFechaPub(id: string, fechaPublicacion: string) {
    persist(id, { fechaPublicacion }, () => updateDisenoEntry(id, { fechaPublicacion }), `Fecha pub → ${formatDateES(fechaPublicacion)}`)
  }
  function setSubEstado(id: string, subEstado: SubEstadoDiseno) {
    persist(id, { subEstado }, () => updateDisenoEntry(id, { subEstado }), `Estado → ${SUBESTADO_CONFIG[subEstado].label}`)
  }
  function togglePortada(id: string, value: boolean) {
    persist(id, { portadaLista: value }, () => togglePortadaLista(id, value), value ? 'Portada lista ✓' : 'Portada des-marcada')
  }
  function toggleDisenadoVal(id: string, value: boolean) {
    persist(id, { disenado: value }, () => toggleDisenado(id, value), value ? '¡Diseñado! 🎨' : 'Reabierto')
  }
  function toggleDisenarHoy(id: string, estaMarcada: boolean) {
    if (migrationPendiente) {
      toast.error('Migration pendiente. Aplicar 20260605200001_disenadores.sql en Supabase Dashboard.')
      return
    }
    if (estaMarcada) {
      persist(id, { fechaMarcadaParaDisenar: null }, () => desmarcarParaDisenarHoy(id), 'Quitada de "Hoy"')
    } else {
      persist(id, { fechaMarcadaParaDisenar: hoy }, () => marcarParaDisenarHoy(id), 'Agregada a "Mi trabajo de hoy"')
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
    setFilters({ subEstado: 'todos', disenadorId: 'todos', marcaSlug: 'todas', soloHoy: false, conPortadaLista: 'todos' })
    setSearch('')
    setSort(null)
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      {/* HEADER breadcrumb + warnings */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-1.5 text-sm">
          <PaintBucket className="w-4 h-4 text-[#a78bfa]" />
          <span className="text-muted-foreground">Módulo</span>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-foreground font-medium">Diseño</span>
          <span className="text-[11px] text-muted-foreground/60 ml-2">
            {formatDateES(rangoDesde)} → {formatDateES(rangoHasta)}
          </span>
        </div>
        <div className="flex-1" />
        {migrationPendiente && (
          <span className="text-[11px] text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-md">
            ⚠ Migration disenadores pendiente — algunas columnas no disponibles
          </span>
        )}
      </header>

      {/* DASHBOARD de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 py-4 border-b border-border bg-muted/20">
        <MetricCard
          icon={<Sparkles className="w-4 h-4" />}
          label="Diseñados"
          value={`${metricas.disenadosMes} / ${metricas.totalMes}`}
          subtitle="del rango"
          color="#a78bfa"
        />
        <MetricCard
          icon={<PaintBucket className="w-4 h-4" />}
          label="Por diseñar"
          value={metricas.porDisenar}
          subtitle="pendientes"
          color="#60a5fa"
        />
        <MetricCard
          icon={<ImageIcon className="w-4 h-4" />}
          label="Portada lista"
          value={metricas.portadaLista}
          subtitle="referencia ✓"
          color="#34d399"
        />
        <MetricCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Urgentes"
          value={metricas.urgentes}
          subtitle="< 1 día margen"
          color="#fb7185"
        />
        <MetricCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Mi trabajo HOY"
          value={metricas.hoyMarcadas}
          subtitle="marcadas"
          color="#fbbf24"
        />
      </div>

      {/* TOOLBAR de filtros */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 border-b border-border bg-background">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o marca…"
            className="pl-8 pr-3 py-1.5 w-64 text-sm bg-muted/40 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/30"
          />
        </div>

        <FilterSelect
          label="Estado"
          value={filters.subEstado}
          onChange={(v) => setFilters((f) => ({ ...f, subEstado: v as Filters['subEstado'] }))}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'sin_empezar', label: 'Sin empezar' },
            { value: 'en_progreso', label: 'En progreso' },
            { value: 'listo', label: 'Listo' },
          ]}
        />

        <FilterSelect
          label="Diseñador"
          value={filters.disenadorId}
          onChange={(v) => setFilters((f) => ({ ...f, disenadorId: v }))}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: '_sin', label: 'Sin asignar' },
            ...disenadores.map((d) => ({ value: d.id, label: d.nombre })),
          ]}
        />

        <FilterSelect
          label="Marca"
          value={filters.marcaSlug}
          onChange={(v) => setFilters((f) => ({ ...f, marcaSlug: v }))}
          options={[
            { value: 'todas', label: 'Todas' },
            ...marcas.map((m) => ({ value: m.slug, label: m.nombre })),
          ]}
        />

        <FilterSelect
          label="Portada"
          value={filters.conPortadaLista}
          onChange={(v) => setFilters((f) => ({ ...f, conPortadaLista: v as Filters['conPortadaLista'] }))}
          options={[
            { value: 'todos', label: 'Todas' },
            { value: 'si', label: 'Con portada lista' },
            { value: 'no', label: 'Sin portada' },
          ]}
        />

        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, soloHoy: !f.soloHoy }))}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            filters.soloHoy
              ? 'bg-[#fbbf24]/15 border-[#fbbf24]/40 text-[#fbbf24]'
              : 'bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          ☀ Mi trabajo HOY
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </button>
        )}

        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{visible.length} de {entries.length}</span>
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-muted/40 backdrop-blur z-10 border-b border-border">
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <TH onClick={() => toggleSort('marca')} sort={sort} field="marca">Marca</TH>
              <TH onClick={() => toggleSort('nombre')} sort={sort} field="nombre">Tarea</TH>
              <TH onClick={() => toggleSort('disenador')} sort={sort} field="disenador">Diseñador</TH>
              <TH onClick={() => toggleSort('fechaDiseno')} sort={sort} field="fechaDiseno">Fecha diseño</TH>
              <TH onClick={() => toggleSort('fechaPublicacion')} sort={sort} field="fechaPublicacion">Publicación</TH>
              <th className="text-left px-3 py-2 font-medium">Estado</th>
              <th className="text-center px-2 py-2 font-medium">Portada</th>
              <th className="text-center px-2 py-2 font-medium">Diseñado</th>
              <th className="text-center px-2 py-2 font-medium">Hoy</th>
              <th className="text-center px-2 py-2 font-medium">Abrir</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-muted-foreground">
                  {hasActiveFilters
                    ? <>No hay resultados con los filtros aplicados. <button onClick={clearAll} className="text-[#a78bfa] underline">Limpiar</button></>
                    : 'No hay tareas de diseño en este rango.'}
                </td>
              </tr>
            ) : visible.map((entry) => {
              const marca = marcaBySlug.get(entry.marcaSlug)
              const disenador = entry.disenadorId ? disenadorById.get(entry.disenadorId) : null
              const alerta = calcularAlertaFecha(entry.fechaDiseno, entry.fechaPublicacion)
              const estaMarcada = entry.fechaMarcadaParaDisenar === hoy
              const sub = SUBESTADO_CONFIG[entry.subEstado]
              return (
                <tr
                  key={entry.id}
                  className="border-b border-border/60 hover:bg-muted/30 transition-colors group"
                >
                  {/* Marca */}
                  <td className="px-3 py-2 align-middle">
                    {marca ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
                        style={{ backgroundColor: `${marca.color}1f`, color: marca.color }}
                      >
                        {marca.emoji && <span>{marca.emoji}</span>}
                        <span className="truncate max-w-[110px]">{marca.nombre}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </td>

                  {/* Nombre (editable inline) */}
                  <td className="px-3 py-2 align-middle min-w-[200px]">
                    <InlineText
                      value={entry.nombreTarea}
                      onSave={(v) => setNombre(entry.id, v)}
                    />
                    {entry.tipoContenido.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {entry.tipoContenido.slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Diseñador */}
                  <td className="px-3 py-2 align-middle">
                    <InlineSelect
                      value={entry.disenadorId ?? ''}
                      onChange={(v) => setDisenador(entry.id, v || null)}
                      options={[
                        { value: '', label: '— Sin asignar' },
                        ...disenadores.map((d) => ({ value: d.id, label: d.nombre })),
                      ]}
                      chipColor={disenador?.color}
                    />
                  </td>

                  {/* Fecha diseño */}
                  <td className="px-3 py-2 align-middle whitespace-nowrap">
                    <input
                      type="date"
                      value={entry.fechaDiseno}
                      onChange={(e) => setFechaDiseno(entry.id, e.target.value)}
                      className="text-[12px] bg-transparent border-0 px-1 py-0.5 rounded hover:bg-muted/50 focus:outline-none focus:bg-muted/50 focus:ring-1 focus:ring-[#a78bfa]/40"
                      style={{ color: ALERTA_COLOR[alerta].fg }}
                    />
                  </td>

                  {/* Fecha publicación */}
                  <td className="px-3 py-2 align-middle whitespace-nowrap">
                    <input
                      type="date"
                      value={entry.fechaPublicacion ?? ''}
                      onChange={(e) => setFechaPub(entry.id, e.target.value)}
                      className="text-[12px] bg-transparent border-0 px-1 py-0.5 rounded text-muted-foreground hover:bg-muted/50 focus:outline-none focus:bg-muted/50 focus:ring-1 focus:ring-[#a78bfa]/40"
                    />
                  </td>

                  {/* Sub-estado (chip clickeable que abre dropdown) */}
                  <td className="px-3 py-2 align-middle">
                    <InlineSelect
                      value={entry.subEstado}
                      onChange={(v) => setSubEstado(entry.id, v as SubEstadoDiseno)}
                      options={[
                        { value: 'sin_empezar', label: 'Sin empezar' },
                        { value: 'en_progreso', label: 'En progreso' },
                        { value: 'listo', label: 'Listo' },
                      ]}
                      chipColor={sub.color}
                      chipBg={sub.bg}
                    />
                  </td>

                  {/* Portada lista */}
                  <td className="px-2 py-2 text-center align-middle">
                    <button
                      onClick={() => togglePortada(entry.id, !entry.portadaLista)}
                      title={entry.portadaLista ? 'Quitar portada lista' : 'Marcar portada lista'}
                      className={`w-5 h-5 rounded border transition-colors ${
                        entry.portadaLista
                          ? 'bg-[#34d399] border-[#34d399] text-white'
                          : 'bg-transparent border-border hover:border-[#34d399]/60'
                      }`}
                    >
                      {entry.portadaLista && '✓'}
                    </button>
                  </td>

                  {/* Diseñado */}
                  <td className="px-2 py-2 text-center align-middle">
                    <button
                      onClick={() => toggleDisenadoVal(entry.id, !entry.disenado)}
                      title={entry.disenado ? 'Quitar diseñado' : 'Marcar diseñado'}
                      className={`w-5 h-5 rounded border transition-colors ${
                        entry.disenado
                          ? 'bg-[#a78bfa] border-[#a78bfa] text-white'
                          : 'bg-transparent border-border hover:border-[#a78bfa]/60'
                      }`}
                    >
                      {entry.disenado && '✓'}
                    </button>
                  </td>

                  {/* Diseñar hoy */}
                  <td className="px-2 py-2 text-center align-middle">
                    <button
                      onClick={() => toggleDisenarHoy(entry.id, estaMarcada)}
                      title={estaMarcada ? 'Quitar de "Hoy"' : 'Marcar para diseñar hoy'}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        estaMarcada
                          ? 'bg-[#fbbf24]/20 text-[#fbbf24] ring-1 ring-[#fbbf24]/40'
                          : 'text-muted-foreground/50 hover:text-[#fbbf24]'
                      }`}
                    >
                      ☀
                    </button>
                  </td>

                  {/* Abrir detalle */}
                  <td className="px-2 py-2 text-center align-middle">
                    <button
                      onClick={() => router.push(`/publicaciones/${entry.id}`)}
                      className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Abrir detalle"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-componentes
   ============================================================ */

function MetricCard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  subtitle: string
  color: string
}) {
  return (
    <div className="bg-card rounded-xl ring-1 ring-border p-3 flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-xl font-semibold text-foreground leading-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground/70">{subtitle}</div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none pl-2.5 pr-7 py-1.5 text-xs bg-muted/40 border border-border/40 rounded-md hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/30"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
      </div>
    </label>
  )
}

function TH({ children, onClick, sort, field }: {
  children: React.ReactNode
  onClick: () => void
  sort: { field: SortField; dir: SortDir } | null
  field: SortField
}) {
  const active = sort?.field === field
  return (
    <th
      className="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  )
}

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== value) onSave(v); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setV(value); setEditing(false) }
        }}
        className="w-full px-1.5 py-0.5 text-sm bg-background border border-[#a78bfa]/40 rounded focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/30"
      />
    )
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-sm text-foreground hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors"
    >
      {value || <span className="text-muted-foreground italic">Sin nombre</span>}
    </button>
  )
}

function InlineSelect({ value, onChange, options, chipColor, chipBg }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  chipColor?: string
  chipBg?: string
}) {
  const current = options.find((o) => o.value === value) ?? options[0]
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-2 pr-6 py-0.5 text-[12px] rounded bg-muted/40 border border-transparent hover:border-border/60 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/30"
        style={chipColor && chipBg ? { color: chipColor, backgroundColor: chipBg } : chipColor ? { color: chipColor } : undefined}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: 'var(--foreground)', backgroundColor: 'var(--background)' }}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50" />
      {/* Tooltip-like span para mostrar el label en pantalla pequeña */}
      <span className="sr-only">{current.label}</span>
    </div>
  )
}

/* ============================================================
   Sort helper
   ============================================================ */

function sortValue(
  e: DisenoEntry,
  field: SortField,
  marcaBySlug: Map<string, MarcaOption>,
  disenadorById: Map<string, DisenadorOption>,
): string {
  switch (field) {
    case 'marca':     return marcaBySlug.get(e.marcaSlug)?.nombre ?? ''
    case 'nombre':    return e.nombreTarea
    case 'disenador': return e.disenadorId ? disenadorById.get(e.disenadorId)?.nombre ?? '' : ''
    case 'fechaDiseno': return e.fechaDiseno
    case 'fechaPublicacion': return e.fechaPublicacion ?? ''
  }
}
