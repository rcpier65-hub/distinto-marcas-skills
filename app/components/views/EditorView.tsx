'use client'

/* EditorView — tabla Linear-style con edición INLINE de todas las
   columnas, persistencia REAL a Supabase, filtro "Mi trabajo para
   hoy", botón "Editar hoy" por fila, y dashboard de métricas arriba.

   Cambios principales vs iter 1:
   - Datos reales (no mock): EditorEntry desde page.tsx
   - Handlers llaman server actions (updateEditorEntry, marcar/desmarcar)
   - Optimistic update + revert si la action falla
   - Editores reales desde tabla editores (no EDITORES_MOCK)
   - Columna "Enlace tomas" con copiable
   - Botón "Editar hoy" por fila (toggle marcado/no marcado)
   - Filtro "Mi trabajo para hoy" al lado de Limpiar
   - Dashboard arriba: editados/mes, por editar, con/sin guion, alertas
   - Color de alerta en fecha edición según calcularAlertaFecha */

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  updateEditorEntry,
  marcarParaEditarHoy,
  desmarcarParaEditarHoy,
  marcarEnEdicion,
  desmarcarEnEdicion,
  crearPublicacion,
} from '@/app/editor/_actions'
import {
  type EditorEntry,
  type EditorOption,
  type EstadoPub,
  type AlertaFecha,
  calcularAlertaFecha,
  fechaLima,
  formatDuracion,
} from '@/lib/editor/types'

/* ============================================================
   Constantes UI (movidas desde mock-editor.ts para que el client
   no dependa del mock ahora que tiene datos reales)
   ============================================================ */

const ESTADO_CONFIG: Record<EstadoPub, { label: string; color: string; bg: string }> = {
  editar:    { label: 'Editar',    color: '#f2c94c', bg: 'rgba(242, 201, 76, 0.12)' },
  aprobar:   { label: 'Aprobar',   color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  programar: { label: 'Programar', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
  publicar:  { label: 'Publicar',  color: '#4cb782', bg: 'rgba(76, 183, 130, 0.12)' },
  publicado: { label: 'Publicado', color: '#737373', bg: 'rgba(255, 255, 255, 0.06)' },
  borrador:  { label: 'Borrador',  color: '#737373', bg: 'rgba(255, 255, 255, 0.04)' },
}

const ALERTA_COLOR: Record<AlertaFecha, { fg: string; bg: string; label: string }> = {
  rojo:     { fg: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)', label: 'urgente' },
  amarillo: { fg: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)',  label: 'atención' },
  verde:    { fg: '#34d399', bg: 'rgba(52, 211, 153, 0.10)',  label: 'a tiempo' },
}

function formatDateES(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}

/* ============================================================
   Tipos públicos del componente
   ============================================================ */

export type MarcaOption = {
  id: string
  slug: string
  nombre: string
  nombreCorto: string
  color: string
  emoji: string | null
}

type SortField = 'marca' | 'nombre' | 'editor' | 'grillaFit' | 'estado' | 'fechaEdicion'
type SortDir = 'asc' | 'desc'

/* "vistaRapida" se setea cuando el editor hace clic en una card del
   dashboard arriba (Por editar / Con guion / Sin guion / Urgentes /
   Editados mes). Cada vista aplica filtros automáticos a la tabla,
   combinables con marca/editor (pero NO con estado, porque la vista
   ya implica un estado). 'todas' = sin vista activa, filtros normales. */
type VistaRapida = 'todas' | 'porEditar' | 'conGuion' | 'sinGuion' | 'urgentes' | 'editadosMes'

type Filters = {
  estado: EstadoPub | 'todos'
  editorId: string | 'todos'
  marcaSlug: string | 'todas'
  soloHoy: boolean
  vistaRapida: VistaRapida
}

type Props = {
  entries: EditorEntry[]
  editores: EditorOption[]
  marcas: MarcaOption[]
  marcaMigrationPendiente?: boolean
}

/* ============================================================
   Component
   ============================================================ */

export function EditorView({ entries: initialEntries, editores, marcas, marcaMigrationPendiente }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({
    estado: 'editar',  /* default: ver lo pendiente */
    editorId: 'todos',
    marcaSlug: 'todas',
    soloHoy: false,
    vistaRapida: 'todas',
  })
  const [reporteOpen, setReporteOpen] = useState(false)
  const [nuevaTareaOpen, setNuevaTareaOpen] = useState(false)

  /* Ticker para actualizar los cronómetros "tiempo editando" cada
     minuto. No re-renderiza si nadie tiene iniciado_edicion_at. */
  const [, setTick] = useState(0)
  useEffect(() => {
    const hayEditando = initialEntries.some((e) => e.iniciadoEdicionAt && !e.editadoAt)
    if (!hayEditando) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [initialEntries])
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir } | null>(null)

  /* Helpers para resolver marca/editor desde slug/id */
  const marcaBySlug = useMemo(() => new Map(marcas.map((m) => [m.slug, m])), [marcas])
  const editorById = useMemo(() => new Map(editores.map((e) => [e.id, e])), [editores])
  const hoy = new Date().toISOString().slice(0, 10)

  /* ============ Métricas del dashboard ============ */
  const metricas = useMemo(() => {
    const ahora = new Date()
    const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`
    const finMesDate = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    const finMes = `${finMesDate.getFullYear()}-${String(finMesDate.getMonth() + 1).padStart(2, '0')}-${String(finMesDate.getDate()).padStart(2, '0')}`

    const enMes = entries.filter((e) => e.fechaEdicion >= inicioMes && e.fechaEdicion <= finMes)
    const ESTADOS_EDITADOS: EstadoPub[] = ['aprobar', 'programar', 'publicar', 'publicado']
    const editadosMes = enMes.filter((e) => ESTADOS_EDITADOS.includes(e.estado)).length
    const objetivoMes = enMes.length

    const porEditar = entries.filter((e) => e.estado === 'editar').length
    const conGuion = entries.filter((e) => e.estado === 'editar' && (e.guion?.trim().length ?? 0) > 0).length
    const sinGuion = entries.filter((e) => e.estado === 'editar' && (e.guion?.trim().length ?? 0) === 0).length
    const urgentes = entries.filter((e) =>
      e.estado === 'editar' && calcularAlertaFecha(e.fechaEdicion, e.grillaFit) === 'rojo'
    ).length

    /* ===== Métrica: editados POR DÍA (basado en editado_at) =====
       Pedro pidió 4 datos:
       - Promedio editados por día (los días que sí editó algo)
       - Días editados al mes (count distinct días con al menos 1 video)
       - Total editados en el mes
       - Tiempo medio de edición (avg(editado_at - iniciado_edicion_at)) */
    const editadosConFecha = entries.filter((e) => e.editadoAt)
    const editadosMesPorFecha = editadosConFecha.filter((e) => {
      const dia = fechaLima(e.editadoAt!)
      return dia >= inicioMes && dia <= finMes
    })
    /* Map<diaLima, count> para "videos por día" */
    const porDiaMap = new Map<string, number>()
    for (const e of editadosMesPorFecha) {
      const dia = fechaLima(e.editadoAt!)
      porDiaMap.set(dia, (porDiaMap.get(dia) ?? 0) + 1)
    }
    const diasEditadosMes = porDiaMap.size
    const promPorDia = diasEditadosMes > 0
      ? Math.round((editadosMesPorFecha.length / diasEditadosMes) * 10) / 10
      : 0

    /* Tiempo medio: solo entries que tienen AMBOS timestamps */
    const conTiempos = editadosMesPorFecha.filter((e) => e.iniciadoEdicionAt)
    const tiempos = conTiempos.map((e) =>
      new Date(e.editadoAt!).getTime() - new Date(e.iniciadoEdicionAt!).getTime()
    ).filter((ms) => ms > 0)
    const tiempoMedioMs = tiempos.length > 0
      ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
      : null

    return {
      editadosMes, objetivoMes, porEditar, conGuion, sinGuion, urgentes,
      promPorDia, diasEditadosMes,
      totalEditadosMes: editadosMesPorFecha.length,
      tiempoMedioMs,
      porDiaMap,
    }
  }, [entries])

  /* ============ Filtrado + búsqueda + sort ============ */
  const visible = useMemo(() => {
    /* Pre-cálculo de rango del mes (para vista "editadosMes") */
    const ahora = new Date()
    const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`
    const finMesDate = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    const finMes = `${finMesDate.getFullYear()}-${String(finMesDate.getMonth() + 1).padStart(2, '0')}-${String(finMesDate.getDate()).padStart(2, '0')}`
    const ESTADOS_EDITADOS: EstadoPub[] = ['aprobar', 'programar', 'publicar', 'publicado']

    let list = entries.filter((e) => {
      /* "Mi trabajo para hoy" tiene prioridad sobre el filtro de
         estado (queremos ver hoy aunque ya esté en aprobar). */
      if (filters.soloHoy) {
        if (e.fechaMarcadaParaEditar !== hoy) return false
      } else if (filters.vistaRapida !== 'todas') {
        /* Vista rápida: cada preset aplica sus propias condiciones y
           IGNORA filters.estado porque la vista ya implica un estado.
           Pero respeta editor/marca/search para drill-down combinable. */
        if (filters.vistaRapida === 'porEditar') {
          if (e.estado !== 'editar') return false
        } else if (filters.vistaRapida === 'conGuion') {
          if (e.estado !== 'editar') return false
          if ((e.guion?.trim().length ?? 0) === 0) return false
        } else if (filters.vistaRapida === 'sinGuion') {
          if (e.estado !== 'editar') return false
          if ((e.guion?.trim().length ?? 0) > 0) return false
        } else if (filters.vistaRapida === 'urgentes') {
          if (e.estado !== 'editar') return false
          if (calcularAlertaFecha(e.fechaEdicion, e.grillaFit) !== 'rojo') return false
        } else if (filters.vistaRapida === 'editadosMes') {
          if (!ESTADOS_EDITADOS.includes(e.estado)) return false
          if (e.fechaEdicion < inicioMes || e.fechaEdicion > finMes) return false
        }
      } else {
        if (filters.estado !== 'todos' && e.estado !== filters.estado) return false
      }
      if (filters.editorId !== 'todos') {
        if (filters.editorId === '_sin') {
          if (e.editorId) return false
        } else if (e.editorId !== filters.editorId) return false
      }
      if (filters.marcaSlug !== 'todas' && e.marcaSlug !== filters.marcaSlug) return false
      if (search) {
        const q = search.toLowerCase()
        const marca = marcaBySlug.get(e.marcaSlug)
        if (
          !e.nombreTarea.toLowerCase().includes(q) &&
          !marca?.nombreCorto.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    if (sort) {
      list = [...list].sort((a, b) => {
        const av = sortValue(a, sort.field, marcaBySlug, editorById)
        const bv = sortValue(b, sort.field, marcaBySlug, editorById)
        if (av < bv) return sort.dir === 'asc' ? -1 : 1
        if (av > bv) return sort.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [entries, filters, search, sort, marcaBySlug, editorById, hoy])

  const hasActiveFilters =
    filters.estado !== 'editar' ||  /* default es editar, no todos */
    filters.editorId !== 'todos' ||
    filters.marcaSlug !== 'todas' ||
    filters.soloHoy ||
    filters.vistaRapida !== 'todas' ||
    !!search

  /* ============ Edit handlers (optimistic + persist a BD) ============ */

  function persist(id: string, patch: Partial<EditorEntry>, action: () => Promise<{ ok: true } | { ok: false; error: string }>, mensaje: string) {
    const prev = entries.find((e) => e.id === id)
    if (!prev) return
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    startTransition(async () => {
      const r = await action()
      if (!r.ok) {
        /* Revert */
        setEntries((cur) => cur.map((e) => (e.id === id ? prev : e)))
        toast.error(`Error al guardar: ${r.error}`)
      } else {
        toast.success(mensaje, { duration: 1500 })
      }
    })
  }

  function setEstado(id: string, estado: EstadoPub) {
    /* Optimistic: si pasa a un estado avanzado y editado_at está null,
       lo seteamos local ya. El backend hace la misma lógica y persiste. */
    const ESTADOS_AVANZADOS: EstadoPub[] = ['aprobar', 'programar', 'publicar', 'publicado']
    const prevEntry = entries.find((e) => e.id === id)
    const patch: Partial<EditorEntry> = { estado }
    if (
      ESTADOS_AVANZADOS.includes(estado) &&
      prevEntry &&
      !prevEntry.editadoAt
    ) {
      patch.editadoAt = new Date().toISOString()
    }
    persist(id, patch, () => updateEditorEntry(id, { estado }), `Estado → ${ESTADO_CONFIG[estado].label}`)
  }
  function setEditor(id: string, editorId: string | null) {
    const nombre = editorId ? editorById.get(editorId)?.nombre ?? null : null
    persist(id, { editorId, editorNombre: nombre }, () => updateEditorEntry(id, { editorId }), `Editor → ${nombre ?? 'Sin asignar'}`)
  }
  function setNombre(id: string, nombre: string) {
    const trimmed = nombre.trim()
    if (!trimmed) { toast.error('El nombre no puede estar vacío'); return }
    persist(id, { nombreTarea: trimmed }, () => updateEditorEntry(id, { nombre: trimmed }), 'Tarea renombrada')
  }
  function setFechaGrilla(id: string, grillaFit: string) {
    persist(id, { grillaFit }, () => updateEditorEntry(id, { fechaPublicacion: grillaFit }), `Grilla FIT → ${formatDateES(grillaFit)}`)
  }
  function setFechaEdicionVal(id: string, fechaEdicion: string) {
    persist(id, { fechaEdicion }, () => updateEditorEntry(id, { fechaEdicion }), `Fecha edición → ${formatDateES(fechaEdicion)}`)
  }
  function toggleEnEdicion(id: string, estaEnEdicion: boolean) {
    if (estaEnEdicion) {
      persist(id, { iniciadoEdicionAt: null }, () => desmarcarEnEdicion(id), 'Edición pausada')
    } else {
      const ahora = new Date().toISOString()
      persist(id, { iniciadoEdicionAt: ahora }, () => marcarEnEdicion(id), '▶ Editando — cronómetro iniciado')
    }
  }

  function toggleEditarHoy(id: string, estaMarcada: boolean) {
    if (marcaMigrationPendiente) {
      toast.error('Migration 026 pendiente. Aplicar desde Supabase Dashboard → SQL Editor.')
      return
    }
    if (estaMarcada) {
      persist(id, { fechaMarcadaParaEditar: null }, () => desmarcarParaEditarHoy(id), 'Quitada de "Hoy"')
    } else {
      persist(id, { fechaMarcadaParaEditar: hoy }, () => marcarParaEditarHoy(id), 'Agregada a "Mi trabajo de hoy"')
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
    setFilters({ estado: 'editar', editorId: 'todos', marcaSlug: 'todas', soloHoy: false, vistaRapida: 'todas' })
    setSearch('')
    setSort(null)
  }

  /* Handler que las cards del dashboard llaman al hacer clic. Toggle:
     si la card YA está activa, la desactiva (vuelve a 'todas'). Si no,
     activa la vista correspondiente. */
  function toggleVistaRapida(v: VistaRapida) {
    setFilters((f) => ({ ...f, vistaRapida: f.vistaRapida === v ? 'todas' : v, soloHoy: false }))
  }

  function openRow(id: string) {
    router.push(`/publicaciones/${id}`)
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--mk-bg-base)' }}>
      {/* ============== HEADER ============== */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
          <span style={{ color: 'var(--mk-text-tertiary)' }}>Publicaciones</span>
          <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>Editor</span>
        </div>
        <div style={{ flex: 1 }} />
        {marcaMigrationPendiente && (
          <span style={{ fontSize: 'var(--mk-text-xs)', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', padding: '4px 10px', borderRadius: 'var(--mk-radius-sm)' }}>
            ⚠ Migration 026 pendiente
          </span>
        )}
        <button
          onClick={() => setNuevaTareaOpen(true)}
          className="mk-focusable"
          style={btnPrimaryStyle}
          title="Crear una nueva tarea (atajo: tecla N próximamente)"
        >
          <IconPlus /> Nueva tarea
        </button>
      </header>

      {/* ============== DASHBOARD MÉTRICAS ============== */}
      <DashboardMetricas
        {...metricas}
        vistaActiva={filters.vistaRapida}
        onToggleVista={toggleVistaRapida}
        onOpenReporte={() => setReporteOpen(true)}
      />

      {/* ============== FILTER BAR ============== */}
      <div style={filterBarStyle}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--mk-text-tertiary)' }}>
            <IconSearch />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarea o marca…"
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
          value={filters.estado === 'todos' ? null : ESTADO_CONFIG[filters.estado].label}
          dotColor={filters.estado === 'todos' ? null : ESTADO_CONFIG[filters.estado].color}
          options={[
            { id: 'todos', label: 'Todos' },
            ...(Object.entries(ESTADO_CONFIG) as [EstadoPub, typeof ESTADO_CONFIG.editar][]).map(([k, v]) => ({
              id: k, label: v.label, color: v.color,
            })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, estado: id as EstadoPub | 'todos' }))}
        />
        <FilterPill
          label="Editor"
          value={
            filters.editorId === 'todos' ? null :
            filters.editorId === '_sin' ? 'Sin asignar' :
            editorById.get(filters.editorId)?.nombre ?? null
          }
          dotColor={
            filters.editorId === 'todos' || filters.editorId === '_sin' ? null :
            editorById.get(filters.editorId)?.color ?? null
          }
          options={[
            { id: 'todos', label: 'Todos' },
            { id: '_sin', label: 'Sin asignar' },
            ...editores.map((e) => ({ id: e.id, label: e.nombre, color: e.color })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, editorId: id }))}
        />
        <FilterPill
          label="Marca"
          value={filters.marcaSlug === 'todas' ? null : marcaBySlug.get(filters.marcaSlug)?.nombreCorto ?? null}
          dotColor={filters.marcaSlug === 'todas' ? null : marcaBySlug.get(filters.marcaSlug)?.color ?? null}
          options={[
            { id: 'todas', label: 'Todas' },
            ...marcas.map((m) => ({ id: m.slug, label: m.nombreCorto, color: m.color })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, marcaSlug: id }))}
        />

        {hasActiveFilters && (
          <button onClick={clearAll} style={clearBtnStyle}>Limpiar</button>
        )}

        {/* "Mi trabajo para hoy" toggle — al lado de Limpiar (decisión de Pedro) */}
        <button
          onClick={() => setFilters((f) => ({ ...f, soloHoy: !f.soloHoy }))}
          style={{
            ...miTrabajoBtnStyle,
            background: filters.soloHoy ? 'var(--mk-accent)' : 'rgba(255, 255, 255, 0.03)',
            color: filters.soloHoy ? 'white' : 'var(--mk-text-secondary)',
            border: `1px solid ${filters.soloHoy ? 'var(--mk-accent)' : 'var(--mk-border-subtle)'}`,
            boxShadow: filters.soloHoy ? '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)' : 'none',
          }}
          title="Filtra solo las tareas que marcaste con 'Editar hoy'"
        >
          <IconToday />
          Mi trabajo para hoy
          {filters.soloHoy && (
            <span style={{ marginLeft: 4, padding: '0 6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
              {visible.length}
            </span>
          )}
        </button>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {visible.length} {visible.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      {/* ============== TABLE ============== */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 'var(--mk-text-sm)' }}>
          <thead>
            <tr>
              <Th width="160px" sortable field="marca"        sort={sort} onSort={toggleSort}>Proyecto</Th>
              <Th              sortable field="nombre"        sort={sort} onSort={toggleSort}>Nombre de la tarea</Th>
              <Th width="150px" sortable field="editor"       sort={sort} onSort={toggleSort}>Editor</Th>
              <Th width="120px" sortable field="grillaFit"    sort={sort} onSort={toggleSort}>Grilla de FIT</Th>
              <Th width="110px" sortable field="estado"       sort={sort} onSort={toggleSort}>Estado</Th>
              <Th width="130px" sortable field="fechaEdicion" sort={sort} onSort={toggleSort}>Fecha edición</Th>
              <Th width="110px">Editar hoy</Th>
              <Th width="120px">Enlace tomas</Th>
              <Th width="40px" align="right" />
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <Row
                key={e.id}
                entry={e}
                marcaInfo={marcaBySlug.get(e.marcaSlug) ?? null}
                editorInfo={e.editorId ? editorById.get(e.editorId) ?? null : null}
                editores={editores}
                hoy={hoy}
                onOpenDetail={() => openRow(e.id)}
                onSetEstado={(s) => setEstado(e.id, s)}
                onSetEditor={(eid) => setEditor(e.id, eid)}
                onSetNombre={(n) => setNombre(e.id, n)}
                onSetGrilla={(d) => setFechaGrilla(e.id, d)}
                onSetFechaEd={(d) => setFechaEdicionVal(e.id, d)}
                onToggleHoy={() => toggleEditarHoy(e.id, e.fechaMarcadaParaEditar === hoy)}
                onToggleEnEdicion={() => toggleEnEdicion(e.id, !!e.iniciadoEdicionAt && !e.editadoAt)}
              />
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--mk-text-base)', color: 'var(--mk-text-secondary)', fontWeight: 500, marginBottom: 4 }}>
                  {filters.soloHoy ? 'Aún no marcaste tareas para hoy' : 'Sin tareas con esos filtros'}
                </div>
                <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)' }}>
                  {filters.soloHoy ? 'Tocá "Editar hoy" en alguna fila para agregarla' : 'Probá limpiar los filtros'}
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {reporteOpen && (
        <ReporteEdicion
          entries={entries}
          editores={editores}
          marcas={marcas}
          onClose={() => setReporteOpen(false)}
        />
      )}

      {nuevaTareaOpen && (
        <NuevaTareaModal
          marcas={marcas}
          editores={editores}
          onClose={() => setNuevaTareaOpen(false)}
          onCreated={(id) => {
            setNuevaTareaOpen(false)
            router.push(`/publicaciones/${id}`)
          }}
        />
      )}
    </div>
  )
}

/* ============================================================
   Dashboard de métricas — Card horizontal arriba de la tabla
   ============================================================ */

function DashboardMetricas({
  editadosMes, objetivoMes, porEditar, conGuion, sinGuion, urgentes,
  promPorDia, tiempoMedioMs,
  vistaActiva, onToggleVista, onOpenReporte,
}: {
  editadosMes: number; objetivoMes: number; porEditar: number
  conGuion: number; sinGuion: number; urgentes: number
  promPorDia: number; tiempoMedioMs: number | null
  vistaActiva: VistaRapida
  onToggleVista: (v: VistaRapida) => void
  onOpenReporte: () => void
}) {
  const pct = objetivoMes > 0 ? Math.round((editadosMes / objetivoMes) * 100) : 0
  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid var(--mk-border-subtle)',
      display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap',
      background: 'rgba(255, 255, 255, 0.01)',
    }}>
      {/* Objetivo mensual con círculo — clickeable, drill-down a editados del mes */}
      <MetricaCircle
        pct={pct}
        valor={editadosMes}
        total={objetivoMes}
        label="Editados este mes"
        sublabel={`${pct}% del mes`}
        active={vistaActiva === 'editadosMes'}
        onClick={() => onToggleVista('editadosMes')}
      />

      <MetricaCard
        valor={porEditar}
        label="Por editar"
        color="#f2c94c"
        icon={<IconClipboard />}
        active={vistaActiva === 'porEditar'}
        onClick={() => onToggleVista('porEditar')}
      />
      <MetricaCard
        valor={conGuion}
        label="Con guion técnico"
        color="#34d399"
        icon={<IconScript />}
        active={vistaActiva === 'conGuion'}
        onClick={() => onToggleVista('conGuion')}
      />
      <MetricaCard
        valor={sinGuion}
        label="Sin guion"
        color="#a78bfa"
        icon={<IconScriptEmpty />}
        active={vistaActiva === 'sinGuion'}
        onClick={() => onToggleVista('sinGuion')}
      />
      <MetricaCard
        valor={urgentes}
        label="Fechas urgentes"
        color={urgentes > 0 ? '#fb7185' : '#737373'}
        icon={<IconWarn />}
        highlight={urgentes > 0}
        hint={urgentes > 0 ? '≤1 día entre edición y publicación' : 'Sin alertas'}
        active={vistaActiva === 'urgentes'}
        onClick={() => onToggleVista('urgentes')}
      />
      {/* Editados por día — abre el reporte completo en modal cuando
          se hace clic. No filtra la tabla porque es una métrica de
          PERFORMANCE, no de drill-down. */}
      <MetricaCard
        valor={promPorDia}
        valorSuffix=" / día"
        label="Editados por día"
        color="#22d3ee"
        icon={<IconBarChart />}
        hint={tiempoMedioMs !== null ? `Tiempo medio: ${formatDuracion(tiempoMedioMs)}` : 'Sin tiempo medido aún'}
        onClick={onOpenReporte}
      />
    </div>
  )
}

function MetricaCircle({
  pct, valor, total, label, sublabel, active, onClick,
}: {
  pct: number; valor: number; total: number; label: string; sublabel: string
  active?: boolean; onClick?: () => void
}) {
  /* Círculo SVG con stroke-dashoffset = progress */
  const R = 22
  const C = 2 * Math.PI * R
  const offset = C - (C * Math.min(100, Math.max(0, pct))) / 100
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...metricaCardStyle,
        cursor: onClick ? 'pointer' : 'default',
        border: active ? '1px solid #a78bfa' : '1px solid var(--mk-border-subtle)',
        background: active ? 'rgba(167, 139, 250, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
      }}
      onMouseEnter={(e) => { if (onClick && !active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)' }}
      onMouseLeave={(e) => { if (onClick && !active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)' }}
    >
      <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="4" />
          <circle cx="28" cy="28" r={R} fill="none" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 600ms ease-out' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--mk-text-primary)' }}>
          {pct}%
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--mk-text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {valor} <span style={{ color: 'var(--mk-text-quaternary)', fontWeight: 400, fontSize: 14 }}>/ {total}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)', marginTop: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', marginTop: 1 }}>{sublabel}</div>
      </div>
    </button>
  )
}

function MetricaCard({
  valor, valorSuffix, label, color, icon, highlight, hint, active, onClick,
}: {
  valor: number; valorSuffix?: string
  label: string; color: string; icon: React.ReactNode
  highlight?: boolean; hint?: string
  active?: boolean; onClick?: () => void
}) {
  /* Si active=true, el highlight del color de la card gana sobre el
     highlight rojo (urgentes). Si solo highlight=true sin active,
     mantiene el aviso rojo pero sin "seleccionada". */
  const borderColor = active ? color : highlight ? color : 'var(--mk-border-subtle)'
  const bgColor = active ? `${color}1f` : highlight ? `${color}10` : 'rgba(255, 255, 255, 0.02)'
  const bgHover = `${color}14`
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      style={{
        ...metricaCardStyle,
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${borderColor}`,
        background: bgColor,
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
        boxShadow: active ? `0 0 0 1px ${color}40, 0 0 16px ${color}20` : 'none',
      }}
      onMouseEnter={(e) => { if (onClick && !active) e.currentTarget.style.background = bgHover }}
      onMouseLeave={(e) => { if (onClick && !active) e.currentTarget.style.background = bgColor }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `${color}1a`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--mk-text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {valor}{valorSuffix && <span style={{ fontSize: 12, color: 'var(--mk-text-quaternary)', fontWeight: 400 }}>{valorSuffix}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)', marginTop: 2 }}>{label}</div>
        {hint && <div style={{ fontSize: 10.5, color: 'var(--mk-text-quaternary)', marginTop: 1 }}>{hint}</div>}
      </div>
    </button>
  )
}

/* ============================================================
   Row — todas las celdas editables
   ============================================================ */

function Row({
  entry, marcaInfo, editorInfo, editores, hoy,
  onOpenDetail, onSetEstado, onSetEditor, onSetNombre, onSetGrilla, onSetFechaEd, onToggleHoy, onToggleEnEdicion,
}: {
  entry: EditorEntry
  marcaInfo: MarcaOption | null
  editorInfo: EditorOption | null
  editores: EditorOption[]
  hoy: string
  onOpenDetail: () => void
  onSetEstado: (s: EstadoPub) => void
  onSetEditor: (eid: string | null) => void
  onSetNombre: (n: string) => void
  onSetGrilla: (d: string) => void
  onSetFechaEd: (d: string) => void
  onToggleHoy: () => void
  onToggleEnEdicion: () => void
}) {
  const alerta = calcularAlertaFecha(entry.fechaEdicion, entry.grillaFit)
  const estaMarcadaHoy = entry.fechaMarcadaParaEditar === hoy
  /* "En edición activa" = tiene timestamp de inicio Y aún no se editó
     (no pasó a aprobar). Si ya tiene editadoAt, el video terminó y
     mostramos el tiempo final en lugar del botón. */
  const enEdicion = !!entry.iniciadoEdicionAt && !entry.editadoAt
  const yaEditado = !!entry.editadoAt
  const bgDefault = enEdicion ? 'rgba(34, 211, 238, 0.08)'  /* cyan tenue para "editando" */
    : estaMarcadaHoy ? 'rgba(113, 112, 255, 0.04)' : 'transparent'

  return (
    <tr
      style={{
        height: 'var(--mk-row-height)',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        cursor: 'pointer',
        background: bgDefault,
      }}
      onClick={onOpenDetail}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = bgDefault }}
    >
      {/* Marca */}
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mk-dot" style={{ background: marcaInfo?.color, boxShadow: marcaInfo?.color ? `0 0 6px ${marcaInfo.color}` : undefined, width: 8, height: 8 }} />
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {marcaInfo?.nombreCorto ?? entry.marcaSlug}
          </span>
        </div>
      </Td>

      {/* Nombre + botón "Editando" si está marcada para hoy.
          El botón solo aparece en filas que el editor marcó para
          trabajar hoy (decisión de Pedro: no llenar de botones
          videos que no se van a editar). */}
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <InlineText value={entry.nombreTarea} onSave={onSetNombre} />
          </span>
          {estaMarcadaHoy && !yaEditado && (
            <BotonEditando
              enEdicion={enEdicion}
              iniciadoAt={entry.iniciadoEdicionAt}
              onToggle={onToggleEnEdicion}
            />
          )}
          {yaEditado && entry.iniciadoEdicionAt && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px',
                background: 'rgba(52, 211, 153, 0.12)', color: '#34d399',
                borderRadius: 'var(--mk-radius-sm)',
                fontSize: 10.5, fontWeight: 500,
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}
              title={`Editado el ${new Date(entry.editadoAt!).toLocaleString('es-PE')}`}
            >
              <IconClock />
              {formatDuracion(new Date(entry.editadoAt!).getTime() - new Date(entry.iniciadoEdicionAt).getTime())}
            </span>
          )}
        </div>
      </Td>

      {/* Editor — fallback al nombre denormalizado cuando editorInfo es null */}
      <Td>
        <EditableEditor
          current={editorInfo}
          fallbackName={entry.editorNombre}
          editores={editores}
          onChange={onSetEditor}
        />
      </Td>

      {/* Grilla FIT */}
      <Td>
        <InlineDate value={entry.grillaFit} onChange={onSetGrilla} />
      </Td>

      {/* Estado */}
      <Td>
        <EditableEstado current={entry.estado} onChange={onSetEstado} />
      </Td>

      {/* Fecha edición con color de alerta */}
      <Td>
        <InlineDate
          value={entry.fechaEdicion}
          onChange={onSetFechaEd}
          colorOverride={ALERTA_COLOR[alerta].fg}
          bgOverride={ALERTA_COLOR[alerta].bg}
          alertaLabel={ALERTA_COLOR[alerta].label}
        />
      </Td>

      {/* Editar hoy — botón toggle */}
      <Td>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleHoy() }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            background: estaMarcadaHoy ? 'var(--mk-accent)' : 'rgba(255, 255, 255, 0.04)',
            color: estaMarcadaHoy ? 'white' : 'var(--mk-text-secondary)',
            border: 'none', borderRadius: 'var(--mk-radius-md)',
            fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
            boxShadow: estaMarcadaHoy ? '0 0 0 1px rgba(113, 112, 255, 0.30), 0 0 12px rgba(113, 112, 255, 0.30)' : 'none',
          }}
          title={estaMarcadaHoy ? 'Quitar de "Mi trabajo para hoy"' : 'Marcar para editar hoy'}
        >
          {estaMarcadaHoy ? '✓ Hoy' : '＋ Hoy'}
        </button>
      </Td>

      {/* Enlace tomas */}
      <Td>
        <EnlaceTomasCell url={entry.enlaceTomas} />
      </Td>

      {/* Abrir detalle */}
      <Td align="right">
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetail() }}
          style={openBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mk-text-primary)'; e.currentTarget.style.background = 'var(--mk-bg-active)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mk-text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
        >
          <IconArrowOpen />
        </button>
      </Td>
    </tr>
  )
}

/* ============================================================
   Cells y primitives
   ============================================================ */

function EnlaceTomasCell({ url }: { url: string | null }) {
  if (!url) return <span style={{ color: 'var(--mk-text-quaternary)', fontSize: 11, fontStyle: 'italic' }}>—</span>
  /* Captura local — TypeScript no propaga el narrowing del `if (!url)`
     hacia funciones nested por closures (puede haber un re-render entre
     el if y la callback). Asignamos a const para tener tipo `string`. */
  const safeUrl: string = url
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(safeUrl).then(() => toast.success('Enlace copiado', { duration: 1200 }))
  }
  function open(e: React.MouseEvent) {
    e.stopPropagation()
    window.open(safeUrl, '_blank', 'noopener,noreferrer')
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button onClick={copy} title="Copiar enlace"
        style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-sm)', color: 'var(--mk-text-tertiary)', cursor: 'pointer' }}>
        <IconCopy />
      </button>
      <button onClick={open} title="Abrir en Drive"
        style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-sm)', color: 'var(--mk-text-tertiary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontFamily: 'inherit' }}>
        <IconExternal /> Drive
      </button>
    </div>
  )
}

/* ============================================================
   NuevaTareaModal — pequeño modal para crear una publicación rápida.
   Pide solo lo mínimo (marca + nombre + fecha + editor opcional).
   Después de crear, redirige al detalle /publicaciones/[id] donde
   el editor llena los demás campos (copy, guion, portada, etc.).
   ============================================================ */

function NuevaTareaModal({
  marcas, editores, onClose, onCreated,
}: {
  marcas: MarcaOption[]
  editores: EditorOption[]
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [marcaId, setMarcaId] = useState<string>('')
  const [nombre, setNombre] = useState('')
  /* Fecha publicación: default = hoy + 7 días, formato yyyy-mm-dd */
  const [fechaPub, setFechaPub] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [editorId, setEditorId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  /* Esc cierra + bloquear scroll del body */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, saving])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!marcaId || !nombre.trim()) {
      toast.error('Marca y nombre son obligatorios')
      return
    }
    setSaving(true)
    const r = await crearPublicacion({
      marcaId,
      nombre: nombre.trim(),
      editorId: editorId || null,
      fechaPublicacion: fechaPub,
    })
    setSaving(false)
    if (r.ok) {
      toast.success('Tarea creada — abriendo detalle…', { duration: 1500 })
      onCreated(r.id)
    } else {
      toast.error(r.error)
    }
  }

  return (
    <div
      onClick={() => { if (!saving) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="mk-anim-scale-in"
        style={{
          background: 'var(--mk-bg-overlay)',
          border: '1px solid var(--mk-border-default)',
          borderRadius: 'var(--mk-radius-xl)',
          boxShadow: 'var(--mk-shadow-lg)',
          width: '100%', maxWidth: 480,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--mk-border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--mk-accent-bg)', color: 'var(--mk-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconPlus />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-text-primary)' }}>Nueva tarea</div>
            <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)' }}>Después de crear vas al detalle a completar el resto</div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={{ background: 'transparent', border: 'none', color: 'var(--mk-text-tertiary)', cursor: saving ? 'not-allowed' : 'pointer', padding: 4, borderRadius: 'var(--mk-radius-sm)' }}>
            <IconClose />
          </button>
        </div>

        {/* Body — formulario */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Marca *">
            <select
              required value={marcaId} onChange={(e) => setMarcaId(e.target.value)}
              autoFocus disabled={saving}
              style={fieldStyle}
            >
              <option value="">— Elegí una marca —</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji ? `${m.emoji} ${m.nombreCorto}` : m.nombreCorto}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Nombre de la tarea *">
            <input
              required value={nombre} onChange={(e) => setNombre(e.target.value)}
              disabled={saving}
              placeholder="Ej. 12. NO HABLA / Reel cólicos / Carrusel closets…"
              style={fieldStyle}
            />
          </Campo>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Campo label="Fecha de publicación">
              <input
                type="date" value={fechaPub} onChange={(e) => setFechaPub(e.target.value)}
                disabled={saving}
                style={fieldStyle}
              />
            </Campo>
            <Campo label="Editor asignado">
              <select value={editorId} onChange={(e) => setEditorId(e.target.value)} disabled={saving} style={fieldStyle}>
                <option value="">— Sin asignar —</option>
                {editores.map((ed) => (
                  <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                ))}
              </select>
            </Campo>
          </div>

          <div style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', lineHeight: 1.5 }}>
            La tarea se crea con estado <strong style={{ color: 'var(--mk-text-tertiary)' }}>Editar</strong> y sub-estado <strong style={{ color: 'var(--mk-text-tertiary)' }}>Sin empezar</strong>. Plataformas, copy, guion técnico y portada los completás en el siguiente paso.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--mk-border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button" onClick={onClose} disabled={saving}
            style={{ padding: '6px 12px', fontSize: 12, fontFamily: 'inherit', background: 'transparent', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-md)', color: 'var(--mk-text-secondary)', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={saving || !marcaId || !nombre.trim()}
            style={{
              ...btnPrimaryStyle,
              height: 'auto', padding: '6px 14px', fontSize: 12,
              opacity: (saving || !marcaId || !nombre.trim()) ? 0.5 : 1,
              cursor: (saving || !marcaId || !nombre.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Creando…' : 'Crear y abrir'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--mk-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)' }}>{label}</span>
      {children}
    </label>
  )
}

const fieldStyle: React.CSSProperties = {
  height: 36, padding: '0 10px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-primary)',
  fontFamily: 'inherit', fontSize: 13,
  outline: 'none',
  colorScheme: 'dark',
}

/* ============================================================
   ReporteEdicion — modal full-screen con métricas del mes actual.
   Pedro pidió: videos por día, días editados, total mes, tiempo medio,
   breakdown por día. Se abre desde la card "Editados por día".
   ============================================================ */

function ReporteEdicion({
  entries, editores, marcas, onClose,
}: {
  entries: EditorEntry[]
  editores: EditorOption[]
  marcas: MarcaOption[]
  onClose: () => void
}) {
  /* Cerrar con Esc y bloquear scroll del body */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  /* Cálculos del reporte. Usa el mes actual (en Lima) como ventana
     primaria pero incluye breakdown por día con counts y tiempo
     medio por día. */
  const data = useMemo(() => {
    const ahora = new Date()
    const año = ahora.getFullYear()
    const mes = ahora.getMonth()  /* 0-indexed */
    const inicioMes = `${año}-${String(mes + 1).padStart(2, '0')}-01`
    const finMesDate = new Date(año, mes + 1, 0)
    const finMes = `${finMesDate.getFullYear()}-${String(finMesDate.getMonth() + 1).padStart(2, '0')}-${String(finMesDate.getDate()).padStart(2, '0')}`
    const nombreMes = ahora.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

    /* Filtrado: solo entries con editado_at en el mes */
    const enMes = entries.filter((e) => {
      if (!e.editadoAt) return false
      const dia = fechaLima(e.editadoAt)
      return dia >= inicioMes && dia <= finMes
    })

    /* Group por día */
    type DiaStat = { dia: string; count: number; tiempoMedioMs: number | null; videos: EditorEntry[] }
    const porDia = new Map<string, DiaStat>()
    for (const e of enMes) {
      const dia = fechaLima(e.editadoAt!)
      const existing = porDia.get(dia) ?? { dia, count: 0, tiempoMedioMs: null, videos: [] }
      existing.count++
      existing.videos.push(e)
      porDia.set(dia, existing)
    }
    /* Calcular tiempo medio por día */
    for (const stat of porDia.values()) {
      const tiempos = stat.videos
        .filter((v) => v.iniciadoEdicionAt)
        .map((v) => new Date(v.editadoAt!).getTime() - new Date(v.iniciadoEdicionAt!).getTime())
        .filter((ms) => ms > 0)
      stat.tiempoMedioMs = tiempos.length > 0
        ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
        : null
    }
    const diasOrdenados = [...porDia.values()].sort((a, b) => b.dia.localeCompare(a.dia))
    const maxCount = Math.max(1, ...diasOrdenados.map((d) => d.count))

    /* Top por editor */
    const porEditor = new Map<string, { editorId: string | null; nombre: string; count: number; tiempoMs: number[] }>()
    for (const e of enMes) {
      const key = e.editorId ?? e.editorNombre ?? '__sin'
      const editor = e.editorId ? editores.find((x) => x.id === e.editorId) : null
      const nombre = editor?.nombre ?? e.editorNombre ?? 'Sin asignar'
      const existing = porEditor.get(key) ?? { editorId: e.editorId, nombre, count: 0, tiempoMs: [] }
      existing.count++
      if (e.iniciadoEdicionAt) {
        const ms = new Date(e.editadoAt!).getTime() - new Date(e.iniciadoEdicionAt).getTime()
        if (ms > 0) existing.tiempoMs.push(ms)
      }
      porEditor.set(key, existing)
    }
    const topEditores = [...porEditor.values()].sort((a, b) => b.count - a.count)

    /* Tiempo medio global */
    const tiemposGlobales = enMes
      .filter((e) => e.iniciadoEdicionAt)
      .map((e) => new Date(e.editadoAt!).getTime() - new Date(e.iniciadoEdicionAt!).getTime())
      .filter((ms) => ms > 0)
    const tiempoMedioGlobal = tiemposGlobales.length > 0
      ? tiemposGlobales.reduce((a, b) => a + b, 0) / tiemposGlobales.length
      : null

    return {
      nombreMes,
      total: enMes.length,
      diasUnicos: porDia.size,
      promPorDia: porDia.size > 0 ? Math.round((enMes.length / porDia.size) * 10) / 10 : 0,
      tiempoMedioGlobal,
      diasOrdenados,
      maxCount,
      topEditores,
    }
  }, [entries, editores])

  const marcaByPub = useMemo(() => {
    const m = new Map(marcas.map((mm) => [mm.slug, mm]))
    return (slug: string) => m.get(slug)
  }, [marcas])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mk-anim-scale-in"
        style={{
          background: 'var(--mk-bg-overlay)',
          border: '1px solid var(--mk-border-default)',
          borderRadius: 'var(--mk-radius-xl)',
          boxShadow: 'var(--mk-shadow-lg)',
          width: '100%', maxWidth: 980, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--mk-border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconBarChart />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-text-primary)' }}>Reporte de edición</div>
            <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textTransform: 'capitalize' }}>{data.nombreMes}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--mk-text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 'var(--mk-radius-sm)' }}>
            <IconClose />
          </button>
        </div>

        {/* Resumen 4 columnas */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--mk-border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <ResumenItem label="Total mes" valor={data.total.toString()} />
          <ResumenItem label="Días editados" valor={data.diasUnicos.toString()} />
          <ResumenItem label="Promedio / día" valor={data.promPorDia.toString()} />
          <ResumenItem label="Tiempo medio" valor={data.tiempoMedioGlobal !== null ? formatDuracion(data.tiempoMedioGlobal) : '—'} hint={data.tiempoMedioGlobal === null ? 'sin tiempos medidos' : undefined} />
        </div>

        {/* Body scrolleable: breakdown por día + top editores */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
          <h3 style={sectionTitle}>Desglose por día</h3>
          {data.diasOrdenados.length === 0 ? (
            <div style={emptyHint}>No hay videos editados este mes todavía.</div>
          ) : (
            <div>
              {data.diasOrdenados.map((d) => (
                <div key={d.dia} style={{ padding: '8px 0', borderBottom: '1px solid var(--mk-border-subtle)', display: 'grid', gridTemplateColumns: '120px 1fr 80px 90px', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--mk-text-secondary)', fontVariantNumeric: 'tabular-nums', textTransform: 'capitalize' }}>
                    {new Date(d.dia + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(d.count / data.maxCount) * 100}%`, height: '100%', background: '#22d3ee', transition: 'width 400ms ease-out' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {d.count} {d.count === 1 ? 'video' : 'videos'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textAlign: 'right' }}>
                    {d.tiempoMedioMs !== null ? formatDuracion(d.tiempoMedioMs) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ ...sectionTitle, marginTop: 24 }}>Por editor</h3>
          {data.topEditores.length === 0 ? (
            <div style={emptyHint}>—</div>
          ) : (
            <div>
              {data.topEditores.map((ed) => {
                const tiempoMedio = ed.tiempoMs.length > 0
                  ? ed.tiempoMs.reduce((a, b) => a + b, 0) / ed.tiempoMs.length
                  : null
                const editorInfo = ed.editorId ? editores.find((x) => x.id === ed.editorId) : null
                return (
                  <div key={ed.nombre} style={{ padding: '8px 0', borderBottom: '1px solid var(--mk-border-subtle)', display: 'grid', gridTemplateColumns: '160px 1fr 80px 90px', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: editorInfo?.color ?? '#737373', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600, flexShrink: 0 }}>
                        {ed.nombre.slice(0, 2).toUpperCase()}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ed.nombre}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(ed.count / data.topEditores[0].count) * 100}%`, height: '100%', background: editorInfo?.color ?? '#a78bfa' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {ed.count}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textAlign: 'right' }}>
                      {tiempoMedio !== null ? formatDuracion(tiempoMedio) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--mk-border-subtle)', background: 'rgba(255, 255, 255, 0.01)', fontSize: 11, color: 'var(--mk-text-quaternary)' }}>
          Datos calculados desde la fecha en que cada video pasó del estado "Editar" a uno avanzado. Esc para cerrar.
        </div>
      </div>
    </div>
  )
}

function ResumenItem({ label, valor, hint }: { label: string; valor: string; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--mk-text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)', marginTop: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 10.5, color: 'var(--mk-text-quaternary)', marginTop: 1 }}>{hint}</div>}
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
  color: 'var(--mk-text-tertiary)', margin: '20px 0 8px',
}
const emptyHint: React.CSSProperties = {
  padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--mk-text-quaternary)',
}

/* Botón "▶ Editar" / "⏸ Editando..." con cronómetro vivo.
   El cronómetro lo refresca el ticker del padre cada 60s (sin polling
   por fila). Color cyan para diferenciar del morado de "Editar hoy". */
function BotonEditando({
  enEdicion, iniciadoAt, onToggle,
}: {
  enEdicion: boolean
  iniciadoAt: string | null
  onToggle: () => void
}) {
  let textoTiempo = ''
  if (enEdicion && iniciadoAt) {
    const ms = Date.now() - new Date(iniciadoAt).getTime()
    textoTiempo = formatDuracion(ms)
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 9px',
        background: enEdicion ? '#22d3ee' : 'rgba(34, 211, 238, 0.10)',
        color: enEdicion ? '#0a2530' : '#22d3ee',
        border: enEdicion ? '1px solid #22d3ee' : '1px solid rgba(34, 211, 238, 0.30)',
        borderRadius: 'var(--mk-radius-sm)',
        fontSize: 10.5, fontWeight: 600,
        cursor: 'pointer', flexShrink: 0,
        fontFamily: 'inherit',
        boxShadow: enEdicion ? '0 0 12px rgba(34, 211, 238, 0.40)' : 'none',
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
      }}
      title={enEdicion ? 'Pausar edición (clic para parar el cronómetro)' : 'Empezar a editar (inicia el cronómetro)'}
    >
      {enEdicion ? <IconPause /> : <IconPlay />}
      {enEdicion ? `Editando · ${textoTiempo}` : 'Editar'}
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
      title={alertaLabel ? `Fecha edición · ${alertaLabel}` : 'Click para cambiar fecha'}
    >
      {formatDateES(value)}
    </span>
  )
}

function EditableEstado({ current, onChange }: { current: EstadoPub; onChange: (e: EstadoPub) => void }) {
  const [open, setOpen] = useState(false)
  const cfg = ESTADO_CONFIG[current]
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
          {(Object.entries(ESTADO_CONFIG) as [EstadoPub, typeof ESTADO_CONFIG.editar][]).map(([k, v]) => (
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

function EditableEditor({
  current, fallbackName, editores, onChange,
}: {
  current: EditorOption | null
  fallbackName: string | null
  editores: EditorOption[]
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  /* Si current es null pero hay fallbackName (editor_nombre del sync
     Notion), lo mostramos como chip "huérfano" en gris. Pedro lo verá
     y podrá reasignarlo al editor real. */
  const showOrphan = !current && !!fallbackName
  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '2px 8px 2px 2px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--mk-radius-full)',
          cursor: 'pointer', border: 'none', fontFamily: 'inherit',
        }}
      >
        {current ? (
          <>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: current.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600 }}>
              {current.nombre.slice(0, 2).toUpperCase()}
            </span>
            <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-secondary)', fontWeight: 500 }}>{current.nombre}</span>
          </>
        ) : showOrphan ? (
          <>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#737373', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600 }}>
              {fallbackName!.slice(0, 2).toUpperCase()}
            </span>
            <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontWeight: 500 }} title="Editor sin vincular en BD — reasignar">
              {fallbackName}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-quaternary)', fontStyle: 'italic', padding: '0 8px' }}>
            Sin asignar
          </span>
        )}
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)}>
          <PopoverItem onClick={() => { onChange(null); setOpen(false) }} selected={!current}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--mk-bg-hover)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="var(--mk-text-quaternary)" strokeWidth="1.3" strokeLinecap="round" /></svg>
            </span>
            <span style={{ color: 'var(--mk-text-tertiary)' }}>Sin asignar</span>
          </PopoverItem>
          <div style={{ height: 1, background: 'var(--mk-border-subtle)', margin: '4px 0' }} />
          {editores.map((e) => (
            <PopoverItem key={e.id} onClick={() => { onChange(e.id); setOpen(false) }} selected={current?.id === e.id}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: e.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600 }}>
                {e.nombre.slice(0, 2).toUpperCase()}
              </span>
              <span>{e.nombre}</span>
            </PopoverItem>
          ))}
        </Popover>
      )}
    </div>
  )
}

/* ============================================================
   Popover + cell primitives + Th/Td
   ============================================================ */

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
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
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
  children?: React.ReactNode; width?: string; align?: 'left' | 'right'
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

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td style={{ padding: '0 14px', textAlign: align ?? 'left', borderBottom: '1px solid var(--mk-border-subtle)', verticalAlign: 'middle' }}>
      {children}
    </td>
  )
}

/* ============================================================
   Filter pill
   ============================================================ */

type FilterOption = { id: string; label: string; color?: string }

function FilterPill({ label, value, dotColor, options, onSelect }: { label: string; value: string | null; dotColor: string | null; options: FilterOption[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="mk-focusable"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          background: value ? 'var(--mk-accent-bg)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${value ? 'var(--mk-border-accent)' : 'var(--mk-border-subtle)'}`,
          borderRadius: 'var(--mk-radius-md)',
          color: value ? 'var(--mk-text-primary)' : 'var(--mk-text-secondary)',
          fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)', fontWeight: 500,
          cursor: 'pointer', transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
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
              {o.color && <span className="mk-dot" style={{ background: o.color, width: 8, height: 8 }} />}
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

function sortValue(
  e: EditorEntry,
  f: SortField,
  marcaBySlug: Map<string, MarcaOption>,
  editorById: Map<string, EditorOption>,
): string | number {
  switch (f) {
    case 'marca':        return marcaBySlug.get(e.marcaSlug)?.nombreCorto ?? e.marcaSlug
    case 'nombre':       return e.nombreTarea
    case 'editor':       return (e.editorId ? editorById.get(e.editorId)?.nombre : e.editorNombre) ?? 'zzz'
    case 'grillaFit':    return e.grillaFit
    case 'estado':       return e.estado
    case 'fechaEdicion': return e.fechaEdicion
  }
}

const headerStyle: React.CSSProperties = {
  height: 'var(--mk-header-height)', padding: '0 20px',
  borderBottom: '1px solid var(--mk-border-subtle)',
  display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
}
const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 'var(--mk-button-height-lg)', padding: '0 12px',
  background: 'var(--mk-accent)', border: '1px solid var(--mk-accent)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white', fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
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
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}
const openBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--mk-text-tertiary)', cursor: 'pointer', padding: 4,
  borderRadius: 'var(--mk-radius-sm)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
  display: 'inline-flex', alignItems: 'center',
}
const metricaCardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  minWidth: 200, flex: '1 1 200px',
}

/* SVG icons inline (sin agregar lucide a este file que usa CSS-in-JS) */
function IconSearch()       { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconArrowOpen()    { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5H10M10 6.5L7 3.5M10 6.5L7 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function IconToday()        { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 1V3M8 1V3M1.5 5H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> }
function IconClipboard()    { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 2.5H10.5V4.5H5.5z" stroke="currentColor" strokeWidth="1.4"/></svg> }
function IconScript()       { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2.5h7.5l2.5 2.5v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> }
function IconScriptEmpty()  { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2.5h7.5l2.5 2.5v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2"/></svg> }
function IconWarn()         { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 6V9M8 11V11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> }
function IconCopy()         { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M2 7V2.5a.5.5 0 01.5-.5H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> }
function IconExternal()     { return <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M3 1H1V8H8V6M5 1H8V4M3.5 5.5L8 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function IconBarChart()     { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14V2M2 14H14M5 11V8M8 11V5M11 11V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function IconPlay()         { return <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2.5 1.5V8.5L8 5L2.5 1.5Z"/></svg> }
function IconPause()        { return <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="1.5" width="2" height="7" rx="0.5"/><rect x="6" y="1.5" width="2" height="7" rx="0.5"/></svg> }
function IconClock()        { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4.2" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 3V5.5L7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> }
function IconClose()        { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> }
function IconPlus()         { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2V9M2 5.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
