'use client'

/* PublicacionesView — replica + mejora la vista Calendario/Listado de
   Metricool con diseño Linear-style. Tab toggle entre vistas:
   - Listado: tabla densa con fecha/hora/marca/caption/redes/estado/editor
   - Calendario: grid mensual con dots coloreados por marca

   Default tab: Listado (porque Pedro pidió "listado ayuda a entender mejor").
   Iter 1: read-only. Iter 2: bulk actions + crear/editar inline. */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Scissors, FileText, Image as ImageIcon, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import { cambiarFechaPublicacion } from '@/app/publicaciones/_actions'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import {
  PUBLICACIONES_MOCK,
  ESTADO_PUB_CONFIG,
  RED_CONFIG,
  type PublicacionMock,
  type EstadoPubMetricool,
  type Red,
} from '@/lib/mock-publicaciones'
import { MARCAS_NAV, type MarcaNav } from '@/lib/mock-marcas'

/* Context interno: el componente principal recibe `marcas` (de la DB) y lo
   inyecta acá. Los sub-componentes (ListRow / PubChip / etc.) leen con
   useMarcasNav() en lugar de importar el mock — así marcas nuevas creadas
   en /dashboard aparecen en TODOS los renders sin tocar el mock. */
const MarcasNavContext = createContext<MarcaNav[]>(MARCAS_NAV)
function useMarcasNav(): MarcaNav[] {
  return useContext(MarcasNavContext)
}

type ViewMode = 'listado' | 'mes' | 'semana'

/* Editor desde la publicación real (BD).
   Antes se buscaba pub.editorId en EDITORES_MOCK, pero los UUIDs reales de
   Supabase no matcheaban los ids mock → el editor se veía "sin asignar"
   aunque estuviera guardado. Ahora usamos editorNombre (viene del JOIN). */
const EDITOR_COLORS = ['#6fb8d8', '#82a474', '#ffb547', '#ff8fab', '#c9882a', '#d896d4', '#b8895e', '#9f7aea']
function editorColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return EDITOR_COLORS[h % EDITOR_COLORS.length]
}
function editorFromPub(pub: PublicacionMock): { nombre: string; color: string } | null {
  if (!pub.editorNombre) return null
  return { nombre: pub.editorNombre, color: editorColor(pub.editorNombre) }
}

type Filters = {
  marcaSlug: string | 'todas'
  estado: EstadoPubMetricool | 'todos'
  red: Red | 'todas'
  /* Filtro por editor: 'todos' | '_sin' (sin asignar) | nombre del editor. */
  editor: string | 'todos'
}

/* Recordar vista + filtros + búsqueda entre navegaciones (sessionStorage).
   Fix Pedro 15-jun-2026: entrar a una publicación y volver perdía la vista
   (mensual) y el filtro → volvía a la vista general. Ahora regresa EXACTO a
   donde estaba (vista + marca + estado + red + editor). */
const PUBLICACIONES_VIEW_STATE_KEY = 'publicaciones-view-state-v1'

type Props = {
  publicaciones?: PublicacionMock[]
  /* Lista de marcas activa (viene de la DB vía getMarcasNav() en el server).
     Cae al mock solo si el page no la pasa — así marcas nuevas creadas en
     /dashboard aparecen automáticamente en el filtro. */
  marcas?: MarcaNav[]
}

export function PublicacionesView({ publicaciones = PUBLICACIONES_MOCK, marcas = MARCAS_NAV }: Props) {
  /* router para que el botón "Nueva publicación" navegue a
     /publicaciones/nueva. Antes el botón era fantasma (sin onClick). */
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [view, setView] = useState<ViewMode>('semana')  /* default: semana — más útil día a día */
  /* Filtro de marca arranca desde la URL (?marca=vid-natur). Así la vista
     filtrada es "linkeable" y, sobre todo, cuando Pedro crea/edita una pub y
     vuelve, regresa a la marca donde estaba (no a "todas"). Fix #3. */
  const [filters, setFilters] = useState<Filters>(() => ({
    marcaSlug: searchParams.get('marca') ?? 'todas',
    estado: 'todos',
    red: 'todas',
    editor: 'todos',
  }))

  /* Editores presentes en las publicaciones (para poblar el filtro). Únicos +
     ordenados. El '_sin' (sin asignar) y 'todos' se agregan aparte en el pill. */
  const editoresDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const p of publicaciones) if (p.editorNombre) set.add(p.editorNombre)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [publicaciones])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  /* Copia local de las publicaciones para MOVER por drag-and-drop con feedback
     inmediato (optimistic). Lorena 26-jun-2026: arrastrar el video al nuevo día
     en el calendario en vez de entrar uno por uno a cambiar la fecha.
     Se re-sincroniza si el server manda datos nuevos (router.refresh). */
  const [localPubs, setLocalPubs] = useState(publicaciones)
  useEffect(() => { setLocalPubs(publicaciones) }, [publicaciones])

  async function handleMoveDate(id: string, nuevaFecha: string) {
    const prev = localPubs
    const target = prev.find((p) => p.id === id)
    if (!target || target.fecha === nuevaFecha) return
    // Optimistic: mover ya en pantalla
    setLocalPubs(prev.map((p) => (p.id === id ? { ...p, fecha: nuevaFecha } : p)))
    const res = await cambiarFechaPublicacion(id, nuevaFecha)
    if (!res.ok) {
      setLocalPubs(prev) // rollback
      toast.error(`No se pudo mover: ${res.error}`)
    } else {
      toast.success('Fecha actualizada ✓')
      router.refresh()
    }
  }

  /* Crear una publicación directo desde una fecha del calendario (botón "+"
     en la celda del día). Pre-llena la fecha, y la marca si hay filtro activo,
     con ?volver= para regresar al calendario. Erick pidió poder crear haciendo
     click en la fecha, sin ir al botón "Nueva publicación" de arriba. */
  function handleCreateEnFecha(fecha: string) {
    const m = filters.marcaSlug
    const params = new URLSearchParams()
    params.set('fecha', fecha)
    if (m && m !== 'todas') {
      params.set('marca', m)
      params.set('volver', `/publicaciones?marca=${m}`)
    }
    router.push(`/publicaciones/nueva?${params.toString()}`)
  }

  /* Cambiar la marca del filtro Y reflejarlo en la URL, para que el estado
     sobreviva a navegaciones (crear pub → volver) y a un refresh. */
  function setMarcaFilter(id: string) {
    setFilters((f) => ({ ...f, marcaSlug: id }))
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (id === 'todas') params.delete('marca')
    else params.set('marca', id)
    const qs = params.toString()
    router.replace(qs ? `/publicaciones?${qs}` : '/publicaciones', { scroll: false })
  }

  /* Restaurar vista/filtros guardados al montar. Si la URL trae ?marca
     explícito (link directo desde el menú/grilla), ese gana para la marca;
     el resto (vista, estado, red, editor, búsqueda) vuelve de sessionStorage.
     `restaurado` evita pisar el storage con defaults antes de leerlo. */
  const [restaurado, setRestaurado] = useState(false)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PUBLICACIONES_VIEW_STATE_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.view === 'listado' || s.view === 'mes' || s.view === 'semana') setView(s.view)
        if (typeof s.search === 'string') setSearch(s.search)
        const urlMarca = searchParams.get('marca')
        setFilters((f) => ({
          ...f,
          marcaSlug: urlMarca ?? s.filters?.marcaSlug ?? f.marcaSlug,
          estado: s.filters?.estado ?? f.estado,
          red: s.filters?.red ?? f.red,
          editor: s.filters?.editor ?? f.editor,
        }))
      }
    } catch {}
    setRestaurado(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!restaurado) return
    try {
      sessionStorage.setItem(PUBLICACIONES_VIEW_STATE_KEY, JSON.stringify({ view, search, filters }))
    } catch {}
  }, [restaurado, view, search, filters])

  const filtered = useMemo(() => {
    return localPubs.filter((p) => {
      if (filters.marcaSlug !== 'todas' && p.marcaSlug !== filters.marcaSlug) return false
      if (filters.estado !== 'todos' && p.estado !== filters.estado) return false
      if (filters.red !== 'todas' && !p.redes.includes(filters.red)) return false
      /* Editor: '_sin' = sin asignar; cualquier otro = match exacto por nombre. */
      if (filters.editor === '_sin') { if (p.editorNombre) return false }
      else if (filters.editor !== 'todos' && p.editorNombre !== filters.editor) return false
      /* Búsqueda: matchea título (nombre del video) Y caption (copy) — Lorena
         busca por el título para encontrar videos. */
      if (search) {
        const q = search.toLowerCase()
        const enTitulo = (p.titulo ?? '').toLowerCase().includes(q)
        const enCaption = p.caption.toLowerCase().includes(q)
        if (!enTitulo && !enCaption) return false
      }
      return true
    })
  }, [localPubs, filters, search])

  const hasFilters =
    filters.marcaSlug !== 'todas' || filters.estado !== 'todos' || filters.red !== 'todas' || filters.editor !== 'todos' || !!search

  return (
   <MarcasNavContext.Provider value={marcas}>
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--mk-bg-base)' }}>
      {/* ============== HEADER ==============
          Responsive: en mobile el header se apila/comprime — Pedro usa
          mucho la app en celular. Ocultamos el breadcrumb "Workspace /",
          el view-toggle scrollea y los botones quedan compactos. */}
      <header
        style={{
          minHeight: 'var(--mk-header-height)',
          padding: isMobile ? '8px 12px' : '0 20px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          flexShrink: 0,
        }}
      >
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
            <span style={{ color: 'var(--mk-text-tertiary)' }}>Workspace</span>
            <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
            <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>Publicaciones</span>
          </div>
        )}
        {/* Spacer solo en desktop: empuja toggle+botones a la derecha. */}
        {!isMobile && <div style={{ flex: 1 }} />}

        {/* View toggle — en mobile ocupa su propia fila (order 2) y scrollea
            horizontal si los 3 chips no entran. */}
        <div style={{
          order: isMobile ? 2 : 0,
          flex: isMobile ? '1 1 100%' : '0 0 auto',
          overflowX: isMobile ? 'auto' : 'visible',
          maxWidth: '100%',
        }}>
          <ViewToggle current={view} onChange={setView} />
        </div>

        {/* "Publicar hoy" → vista guiada para quien publica manualmente.
            Pedro: "muy importante para la persona que publica manualmente
            los videos". Verde para diferenciarlo de "Nueva publicación". */}
        <button
          className="mk-focusable"
          style={{ ...btnPublicarHoyStyle, order: isMobile ? 1 : 0, flexShrink: 0 }}
          onClick={() => router.push('/publicaciones/publicar-hoy')}
          title="Lo que toca publicar hoy, paso a paso"
        >
          <Rocket size={14} strokeWidth={2.2} /> {isMobile ? 'Hoy' : 'Publicar hoy'}
        </button>

        {/* "Nueva publicación" → navega a /publicaciones/nueva.
            Antes era un <button> sin onClick (botón fantasma) — Pedro
            clickeaba y no pasaba nada. La página /publicaciones/nueva
            ya existía (form de 3 campos + submit), solo faltaba
            conectar el botón. */}
        <button
          className="mk-focusable"
          style={{ ...btnPrimaryStyle, order: isMobile ? 1 : 0, flexShrink: 0 }}
          onClick={() => {
            const m = filters.marcaSlug
            if (m && m !== 'todas') {
              const volver = `/publicaciones?marca=${m}`
              router.push(`/publicaciones/nueva?marca=${m}&volver=${encodeURIComponent(volver)}`)
            } else {
              router.push('/publicaciones/nueva')
            }
          }}
        >
          <IconPlus /> {isMobile ? 'Nueva' : 'Nueva publicación'}
          {!isMobile && <span className="mk-kbd" style={{ marginLeft: 4 }}>C</span>}
        </button>
      </header>

      {/* ============== FILTERS ============== */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          display: 'flex', alignItems: 'center', gap: 8,
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.01)',
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--mk-text-tertiary)' }}>
            <IconSearch />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar caption…"
            className="mk-focusable"
            style={{
              width: '100%',
              height: 'var(--mk-button-height-lg)',
              padding: '0 8px 0 28px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--mk-border-subtle)',
              borderRadius: 'var(--mk-radius-md)',
              color: 'var(--mk-text-primary)',
              fontFamily: 'inherit',
              fontSize: 'var(--mk-text-sm)',
              outline: 'none',
            }}
          />
        </div>

        <FilterPill
          label="Marca"
          value={filters.marcaSlug === 'todas' ? null : marcas.find((m) => m.slug === filters.marcaSlug)?.nombreCorto ?? null}
          dotColor={filters.marcaSlug === 'todas' ? null : marcas.find((m) => m.slug === filters.marcaSlug)?.color ?? null}
          options={[
            { id: 'todas', label: 'Todas' },
            /* Incluimos emoji de la marca para que se vea el logo en el
               dropdown (Pedro: 'no salen sus logos en las marcas cuando
               pongo el filtro'). `marcas` viene de la DB → marcas nuevas
               creadas en /dashboard aparecen acá automáticamente. */
            ...marcas.map((m) => ({ id: m.slug, label: m.nombreCorto, color: m.color, emoji: m.emoji })),
          ]}
          onSelect={(id) => setMarcaFilter(id)}
        />

        <FilterPill
          label="Estado"
          value={filters.estado === 'todos' ? null : ESTADO_PUB_CONFIG[filters.estado].label}
          dotColor={filters.estado === 'todos' ? null : ESTADO_PUB_CONFIG[filters.estado].color}
          options={[
            { id: 'todos', label: 'Todos' },
            ...(Object.entries(ESTADO_PUB_CONFIG) as [EstadoPubMetricool, typeof ESTADO_PUB_CONFIG.pendiente][]).map(([k, v]) => ({
              id: k, label: v.label, color: v.color,
            })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, estado: id as EstadoPubMetricool | 'todos' }))}
        />

        <FilterPill
          label="Red"
          value={filters.red === 'todas' ? null : RED_CONFIG[filters.red].label}
          dotColor={filters.red === 'todas' ? null : RED_CONFIG[filters.red].color}
          options={[
            { id: 'todas', label: 'Todas' },
            ...(Object.entries(RED_CONFIG) as [Red, typeof RED_CONFIG.instagram][]).map(([k, v]) => ({
              id: k, label: v.label, color: v.color,
            })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, red: id as Red | 'todas' }))}
        />

        <FilterPill
          label="Editor"
          value={filters.editor === 'todos' ? null : filters.editor === '_sin' ? 'Sin asignar' : filters.editor}
          dotColor={filters.editor === 'todos' || filters.editor === '_sin' ? null : editorColor(filters.editor)}
          options={[
            { id: 'todos', label: 'Todos' },
            { id: '_sin', label: 'Sin asignar' },
            ...editoresDisponibles.map((n) => ({ id: n, label: n, color: editorColor(n) })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, editor: id }))}
        />

        {hasFilters && (
          <button
            onClick={() => { setFilters({ marcaSlug: 'todas', estado: 'todos', red: 'todas', editor: 'todos' }); setSearch(''); setMarcaFilter('todas') }}
            style={{
              padding: '4px 10px', fontSize: 'var(--mk-text-xs)', fontFamily: 'inherit',
              background: 'transparent', border: 'none',
              color: 'var(--mk-text-tertiary)', cursor: 'pointer',
              borderRadius: 'var(--mk-radius-sm)',
            }}
          >
            Limpiar
          </button>
        )}

        <div style={{ flex: 1 }} />

        {selected.size > 0 && (
          <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-accent)', fontWeight: 500 }}>
            {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
          </span>
        )}
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {filtered.length} publicacion{filtered.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* ============== BODY ============== */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'listado' && (
          <ListadoView
            entries={filtered}
            selected={selected}
            onToggleSelect={(id) => {
              setSelected((s) => {
                const next = new Set(s)
                if (next.has(id)) next.delete(id); else next.add(id)
                return next
              })
            }}
          />
        )}
        {view === 'mes' && <MesView entries={filtered} isMobile={isMobile} onMoveDate={handleMoveDate} onCreate={handleCreateEnFecha} />}
        {view === 'semana' && <SemanaView entries={filtered} isMobile={isMobile} onMoveDate={handleMoveDate} onCreate={handleCreateEnFecha} />}
      </div>
    </div>
   </MarcasNavContext.Provider>
  )
}

/* ============================================================
   View Toggle
   ============================================================ */

function ViewToggle({ current, onChange }: { current: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'listado', label: 'Listado', icon: <IconList /> },
    { id: 'semana',  label: 'Semana',  icon: <IconWeek /> },
    { id: 'mes',     label: 'Mes',     icon: <IconMonth /> },
  ]
  return (
    <div style={{ display: 'flex', background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-md)', padding: 2, gap: 2 }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            fontSize: 'var(--mk-text-xs)',
            fontFamily: 'inherit',
            background: current === o.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            color: current === o.id ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)',
            border: 'none',
            borderRadius: 'var(--mk-radius-sm)',
            cursor: 'pointer',
            fontWeight: current === o.id ? 500 : 400,
            transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
          }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ============================================================
   LISTADO VIEW
   ============================================================ */

function ListadoView({ entries, selected, onToggleSelect }: { entries: PublicacionMock[]; selected: Set<string>; onToggleSelect: (id: string) => void }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 'var(--mk-text-sm)' }}>
      <thead>
        <tr>
          <Th width="36px"></Th>
          <Th width="110px">Fecha</Th>
          <Th width="140px">Marca</Th>
          <Th>Contenido</Th>
          <Th width="80px">Tipo</Th>
          <Th width="100px">Redes</Th>
          <Th width="100px">Estado</Th>
          <Th width="120px">Editor</Th>
          <Th width="40px" align="right"></Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((p) => (
          <ListRow key={p.id} pub={p} selected={selected.has(p.id)} onToggleSelect={() => onToggleSelect(p.id)} />
        ))}
        {entries.length === 0 && (
          <tr><td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--mk-text-tertiary)' }}>
            <div style={{ fontSize: 'var(--mk-text-base)', color: 'var(--mk-text-secondary)', fontWeight: 500, marginBottom: 4 }}>Sin publicaciones</div>
            <div style={{ fontSize: 'var(--mk-text-sm)' }}>Probá limpiar los filtros o crear una nueva</div>
          </td></tr>
        )}
      </tbody>
    </table>
  )
}

function ListRow({ pub, selected, onToggleSelect }: { pub: PublicacionMock; selected: boolean; onToggleSelect: () => void }) {
  const marca = useMarcasNav().find((m) => m.slug === pub.marcaSlug)
  const editor = editorFromPub(pub)
  const estadoCfg = ESTADO_PUB_CONFIG[pub.estado]
  const fecha = new Date(pub.fecha + 'T00:00:00')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const fechaLabel = `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`

  return (
    <tr
      style={{
        height: 44,
        cursor: 'pointer',
        background: selected ? 'var(--mk-bg-selected)' : 'transparent',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <Td>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ accentColor: 'var(--mk-accent)', cursor: 'pointer' }}
        />
      </Td>
      <Td>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {fechaLabel}
          </span>
          <span style={{ color: 'var(--mk-text-tertiary)', fontSize: 'var(--mk-text-xs)', fontVariantNumeric: 'tabular-nums' }}>
            {pub.hora}
          </span>
        </div>
      </Td>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mk-dot" style={{ background: marca?.color, boxShadow: marca?.color ? `0 0 6px ${marca.color}` : undefined, width: 8, height: 8 }} />
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>{marca?.nombreCorto}</span>
        </div>
      </Td>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {/* Thumbnail placeholder usando el color de la marca */}
          <div
            style={{
              width: 32, height: 32,
              borderRadius: 'var(--mk-radius-sm)',
              background: `linear-gradient(135deg, ${marca?.color}40 0%, ${marca?.color}15 100%)`,
              border: `1px solid ${marca?.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 14,
            }}
          >
            {pub.tipo === 'reel' ? '▶' : pub.tipo === 'video' ? '▶' : pub.tipo === 'carrusel' ? '◫' : pub.tipo === 'story' ? '◐' : '◻'}
          </div>
          <span style={{ color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {pub.caption}
          </span>
        </div>
      </Td>
      <Td>
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', textTransform: 'capitalize' }}>
          {pub.tipo}
        </span>
      </Td>
      <Td>
        <div style={{ display: 'flex', gap: 4 }}>
          {pub.redes.map((r) => <RedIcon key={r} red={r} />)}
        </div>
      </Td>
      <Td>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px',
            background: estadoCfg.bg, color: estadoCfg.color,
            fontSize: 10.5, fontWeight: 500,
            borderRadius: 'var(--mk-radius-sm)',
            textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
          }}
        >
          <span className="mk-dot" style={{ background: estadoCfg.color, width: 5, height: 5 }} />
          {estadoCfg.label}
        </span>
      </Td>
      <Td>
        {editor ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: editor.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600 }}>
              {editor.nombre.slice(0, 2).toUpperCase()}
            </span>
            <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-secondary)' }}>{editor.nombre}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--mk-text-quaternary)', fontStyle: 'italic', fontSize: 'var(--mk-text-xs)' }}>Sin asignar</span>
        )}
      </Td>
      <Td align="right">
        <button
          style={{ background: 'transparent', border: 'none', color: 'var(--mk-text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 'var(--mk-radius-sm)' }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mk-text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mk-text-tertiary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="3" cy="7" r="1" fill="currentColor" />
            <circle cx="7" cy="7" r="1" fill="currentColor" />
            <circle cx="11" cy="7" r="1" fill="currentColor" />
          </svg>
        </button>
      </Td>
    </tr>
  )
}

/* ============================================================
   Calendar helpers — comunes a Mes y Semana
   ============================================================ */

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAY_NAMES_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const DAY_NAMES_LONG  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* "Hoy" en hora de Lima (UTC-5), determinista en server y cliente. Evita que
   el calendario abra en el mes equivocado por la zona horaria del servidor
   (SSR corre en UTC). Erick: "me sale Agosto cuando aún es Julio". */
function hoyLima(): Date {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function indexByDay(entries: PublicacionMock[]): Map<string, PublicacionMock[]> {
  const m = new Map<string, PublicacionMock[]>()
  entries.forEach((e) => {
    if (!m.has(e.fecha)) m.set(e.fecha, [])
    m.get(e.fecha)!.push(e)
  })
  /* Sort intra-día por hora */
  m.forEach((list) => list.sort((a, b) => a.hora.localeCompare(b.hora)))
  return m
}

function CalendarNav({
  label, onPrev, onNext, onToday,
}: { label: string; onPrev: () => void; onNext: () => void; onToday: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={onPrev} style={navBtnStyle} title="Anterior">
        <svg width="11" height="11" viewBox="0 0 11 11"><path d="M7 2L3 5.5L7 9" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <h2
        style={{
          fontSize: 'var(--mk-text-lg)',
          fontWeight: 600,
          letterSpacing: 'var(--mk-tracking-snug)',
          color: 'var(--mk-text-primary)',
          margin: 0,
          textTransform: 'capitalize',
          minWidth: 220,
          textAlign: 'center',
        }}
      >
        {label}
      </h2>
      <button onClick={onNext} style={navBtnStyle} title="Siguiente">
        <svg width="11" height="11" viewBox="0 0 11 11"><path d="M4 2L8 5.5L4 9" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button onClick={onToday} style={{ ...navBtnStyle, padding: '0 14px', width: 'auto', fontSize: 'var(--mk-text-xs)', fontWeight: 500 }}>
        Hoy
      </button>
    </div>
  )
}

/* StatusIcons — indicadores de workflow por publicación: Copy, Portada,
   Editado. Plomo (gris) = pendiente, verde = listo. El verde es el mismo
   de "Publicado" en ESTADO_PUB_CONFIG → coherente con la paleta de estados.
   Los 3 booleanos vienen del checklist del detalle de cada publicación, así
   que marcar el checklist actualiza la grilla automáticamente. */
const STATUS_READY = '#4cb782'                 /* verde "listo" (== estado Publicado) */
const STATUS_EDITING = '#22d3ee'                /* cyan "editando" (== badge del editor) */
const STATUS_IDLE = 'var(--mk-text-quaternary)' /* plomo "pendiente" */

type StatusState = 'idle' | 'done' | 'editing'

function StatusIcons({ pub, size = 13 }: { pub: PublicacionMock; size?: number }) {
  /* Copy y Portada: 2 estados (pendiente / listo).
     Editado: 3 estados (pendiente plomo → editando animado cyan → editado verde fijo).
     El estado "editando" se sincroniza con el cronómetro del editor. */
  const items: { state: StatusState; Icon: typeof Scissors; label: string }[] = [
    { state: pub.copyListo ? 'done' : 'idle',    Icon: FileText,  label: 'Copy' },
    { state: pub.portadaLista ? 'done' : 'idle', Icon: ImageIcon, label: 'Portada' },
    { state: pub.editado ? 'done' : pub.editando ? 'editing' : 'idle', Icon: Scissors, label: 'Editado' },
  ]
  const colorFor = (s: StatusState) =>
    s === 'done' ? STATUS_READY : s === 'editing' ? STATUS_EDITING : STATUS_IDLE
  const titleFor = (label: string, s: StatusState) =>
    s === 'editing' ? `${label}: editando ahora…` : `${label}: ${s === 'done' ? 'listo ✓' : 'pendiente'}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {items.map(({ state, Icon, label }) => (
        <span
          key={label}
          title={titleFor(label, state)}
          className={state === 'editing' ? 'mk-anim-editing' : undefined}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <Icon
            size={size}
            color={colorFor(state)}
            strokeWidth={state === 'idle' ? 1.7 : 2.4}
            style={{ opacity: state === 'idle' ? 0.5 : 1 }}
          />
        </span>
      ))}
    </div>
  )
}

/* PubChip — strip clickeable de publicación usado en celdas calendario.
   Variantes: compact (mes con muchas pubs) y full (semana / mes pocas pubs). */
function PubChip({ pub, variant, canDrag = false }: { pub: PublicacionMock; variant: 'compact' | 'full'; canDrag?: boolean }) {
  const router = useRouter()
  const marca = useMarcasNav().find((m) => m.slug === pub.marcaSlug)
  const editor = editorFromPub(pub)
  const estadoCfg = ESTADO_PUB_CONFIG[pub.estado]
  /* Drag-and-drop: el chip es la fuente. Al soltarlo sobre otro día, la celda
     lee este id y llama la action que cambia la fecha. */
  const [dragging, setDragging] = useState(false)
  /* Título visible (nombre del video). Si está vacío o es igual al caption,
     mostramos el caption como respaldo para no dejar el chip sin texto. */
  const titulo = pub.titulo && pub.titulo !== '(sin título)' ? pub.titulo : pub.caption
  const mostrarCaption = pub.caption && pub.caption !== titulo

  return (
    <button
      draggable={canDrag}
      onDragStart={canDrag ? (e) => {
        e.dataTransfer.setData('text/plain', pub.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      } : undefined}
      onDragEnd={canDrag ? () => setDragging(false) : undefined}
      onClick={(e) => { e.stopPropagation(); router.push(`/publicaciones/${pub.id}`) }}
      title={`${pub.hora} · ${marca?.nombreCorto} — ${titulo}${mostrarCaption ? `\n${pub.caption}` : ''}${canDrag ? '\n\n(Arrastra para cambiar la fecha)' : ''}`}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: variant === 'full' ? '6px 8px' : '4px 7px',
        /* marginBottom removido — el gap del contenedor padre ya lo aporta */
        background: `${marca?.color}22`,
        borderLeft: `3px solid ${marca?.color}`,
        borderTop: '1px solid transparent',
        borderRight: '1px solid transparent',
        borderBottom: '1px solid transparent',
        borderRadius: 'var(--mk-radius-sm)',
        cursor: canDrag ? 'grab' : 'pointer',
        opacity: dragging ? 0.4 : 1,
        fontFamily: 'inherit',
        color: 'var(--mk-text-secondary)',
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${marca?.color}3a`
        e.currentTarget.style.borderColor = `${marca?.color}77`
        e.currentTarget.style.borderLeftColor = marca?.color ?? ''
        e.currentTarget.style.boxShadow = `0 0 0 1px ${marca?.color}55, 0 4px 12px ${marca?.color}40`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${marca?.color}22`
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.borderLeftColor = marca?.color ?? ''
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {variant === 'compact' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Línea 1: hora + nombre de la marca (badge con color) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10.5, color: 'var(--mk-text-primary)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, flexShrink: 0 }}>
              {pub.hora}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: marca?.color ?? 'var(--mk-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                padding: '1px 5px',
                borderRadius: 3,
                background: `${marca?.color ?? '#999'}18`,
                border: `1px solid ${marca?.color ?? '#999'}40`,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '70%',
                flexShrink: 1,
              }}
            >
              {marca?.nombreCorto ?? pub.marcaSlug}
            </span>
          </div>
          {/* Línea 2: TÍTULO del video (lo que Lorena necesita para ubicarlos) */}
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, lineHeight: 1.3 }}>
            {titulo}
          </span>
          {/* Línea 3: caption (copy) como apoyo, atenuado — solo si aporta algo */}
          {mostrarCaption && (
            <span style={{ fontSize: 10, color: 'var(--mk-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, lineHeight: 1.25 }}>
              {pub.caption}
            </span>
          )}
          {/* Línea 4: indicadores de workflow (copy / portada / editado) */}
          <StatusIcons pub={pub} size={11} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--mk-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{pub.hora}</span>
            {/* Badge marca con color de fondo + borde para identificación rápida */}
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: marca?.color ?? 'var(--mk-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                padding: '2px 6px',
                borderRadius: 3,
                background: `${marca?.color ?? '#999'}18`,
                border: `1px solid ${marca?.color ?? '#999'}40`,
                whiteSpace: 'nowrap',
              }}
            >
              {marca?.nombreCorto ?? pub.marcaSlug}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, color: estadoCfg.color }}>
              <span className="mk-dot" style={{ background: estadoCfg.color, width: 4, height: 4 }} />
            </span>
          </div>
          {/* TÍTULO del video (bold) — Lorena lo usa para ubicar videos */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mk-text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>
            {titulo}
          </div>
          {/* Caption (copy) como apoyo, atenuado — solo si aporta algo distinto */}
          {mostrarCaption && (
            <div style={{ fontSize: 10.5, color: 'var(--mk-text-tertiary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>
              {pub.caption}
            </div>
          )}
          {/* Fila de íconos: redes + workflow + editor. flexWrap evita que se
              CORTEN cuando la columna es angosta (semana) — antes se salían del
              chip y quedaban recortados. Fix Pedro 15-jun-2026. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', rowGap: 4 }}>
            {pub.redes.map((r) => <RedIcon key={r} red={r} />)}
            {pub.redes.length > 0 && (
              <span style={{ width: 1, height: 11, background: 'var(--mk-border-subtle)', flexShrink: 0 }} />
            )}
            <StatusIcons pub={pub} size={13} />
            {editor && (
              <span style={{ marginLeft: 'auto', width: 14, height: 14, borderRadius: '50%', background: editor.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>
                {editor.nombre.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  )
}

/* ============================================================
   MES VIEW — grid mensual mejorado, todas las pubs clickeables
   ============================================================ */

function MesView({ entries, isMobile = false, onMoveDate, onCreate }: { entries: PublicacionMock[]; isMobile?: boolean; onMoveDate?: (id: string, fecha: string) => void; onCreate?: (fecha: string) => void }) {
  const today = hoyLima()
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  /* Día sobre el que se está arrastrando un video (para resaltar el destino). */
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  /* Día sobre el que está el mouse (para mostrar el botón "+" de crear). */
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7
  const totalDays = lastOfMonth.getDate()

  const cells: { date: Date; thisMonth: boolean }[] = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: new Date(year, month, -firstWeekday + 1 + i), thisMonth: false })
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ date: new Date(year, month, d), thisMonth: true })
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), thisMonth: false })
    if (cells.length >= 42) break
  }

  const byDay = useMemo(() => indexByDay(entries), [entries])
  const todayKey = dayKey(today)

  return (
    <div style={{ padding: isMobile ? '12px 12px 60px' : '16px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <CalendarNav
          label={`${MONTH_NAMES[month]} ${year}`}
          onPrev={() => setCursor(new Date(year, month - 1, 1))}
          onNext={() => setCursor(new Date(year, month + 1, 1))}
          onToday={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
        />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {entries.length} publicaciones en {MONTH_NAMES[month]}
        </span>
      </div>

      {/* En mobile el mes scrollea horizontal: 7 columnas en una pantalla
          angosta quedan ilegibles. Le damos minWidth para que las celdas
          mantengan tamaño usable y se deslice de lado (fix del bug
          "deslizar a la derecha no sale correctamente"). */}
      <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', margin: isMobile ? '0 -12px' : 0, padding: isMobile ? '0 12px' : 0 }}>
       <div style={{ minWidth: isMobile ? 760 : 'auto' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-lg) var(--mk-radius-lg) 0 0', overflow: 'hidden' }}>
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} style={{ padding: '10px 14px', background: 'var(--mk-bg-elevated)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)', color: 'var(--mk-text-tertiary)', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date cells.
          Calendario tipo Google Calendar / Notion: TODAS las filas tienen
          el MISMO alto exacto (140px). Las celdas con muchas pubs hacen
          scroll interno. Las vacías quedan con altura limpia.

          Antes usaba minHeight/maxHeight por celda — eso hacía que CSS
          Grid estirara cada fila al alto de la celda más alta de esa
          fila → filas asimétricas, celdas vacías gigantes. Bug resuelto. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gridAutoRows: '140px',                             /* alto fijo por fila — clave del fix */
          gap: 1,
          background: 'var(--mk-border-subtle)',
          borderRadius: '0 0 var(--mk-radius-lg) var(--mk-radius-lg)',
          overflow: 'hidden',
        }}
      >
        {cells.map((c, i) => {
          const k = dayKey(c.date)
          const pubs = byDay.get(k) ?? []
          const isToday = k === todayKey
          const isDropTarget = dragOverKey === k
          const isHover = hoverKey === k

          return (
            <div
              key={i}
              onMouseEnter={onCreate ? () => setHoverKey(k) : undefined}
              onMouseLeave={onCreate ? () => setHoverKey((cur) => (cur === k ? null : cur)) : undefined}
              onDragOver={onMoveDate ? (e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverKey !== k) setDragOverKey(k)
              } : undefined}
              onDragLeave={onMoveDate ? () => setDragOverKey((cur) => (cur === k ? null : cur)) : undefined}
              onDrop={onMoveDate ? (e) => {
                e.preventDefault()
                setDragOverKey(null)
                const id = e.dataTransfer.getData('text/plain')
                if (id) onMoveDate(id, k)
              } : undefined}
              style={{
                background: isDropTarget ? 'var(--mk-bg-selected)' : isToday ? 'var(--mk-bg-selected)' : 'var(--mk-bg-elevated)',
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 6px 6px',
                opacity: c.thisMonth ? 1 : 0.42,
                position: 'relative',
                transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
                boxShadow: isDropTarget
                  ? 'inset 0 0 0 2px var(--mk-accent)'
                  : isToday ? `inset 0 0 0 1px var(--mk-accent-glow)` : undefined,
                /* min-width 0 + overflow hidden: respetar ancho del grid
                   cell y no estirarlo por el contenido (nowrap del caption). */
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {/* Day number — más prominente cuando es hoy */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: isToday ? 13 : 12,
                    fontWeight: 600,
                    color: isToday ? '#fff' : 'var(--mk-text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: isToday ? 22 : undefined, height: isToday ? 22 : undefined,
                    padding: isToday ? '0 5px' : '0',
                    borderRadius: isToday ? 'var(--mk-radius-full)' : undefined,
                    background: isToday ? 'var(--mk-accent)' : undefined,
                    boxShadow: isToday ? '0 0 10px var(--mk-accent-glow)' : undefined,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {c.date.getDate()}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {pubs.length > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--mk-text-tertiary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', background: 'rgba(0,0,0,0.05)', padding: '1px 4px', borderRadius: 3 }}>
                      {pubs.length}
                    </span>
                  )}
                  {/* Botón "+" para crear una publicación en este día. En desktop
                      aparece al pasar el mouse; en mobile queda tenue siempre.
                      Erick: crear haciendo click en la fecha, sin ir arriba. */}
                  {onCreate && c.thisMonth && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCreate(k) }}
                      title="Nueva publicación este día"
                      aria-label="Nueva publicación este día"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 18, height: 18, borderRadius: 'var(--mk-radius-full)',
                        border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
                        fontSize: 14, fontWeight: 700,
                        color: '#fff', background: 'var(--mk-accent)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                        opacity: isHover ? 1 : (isMobile ? 0.55 : 0),
                        transform: isHover ? 'scale(1)' : 'scale(0.9)',
                        transition: 'opacity var(--mk-dur-fast) var(--mk-ease-out), transform var(--mk-dur-fast) var(--mk-ease-out)',
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Pubs con scroll vertical si la celda se llena.
                  minHeight: 0 es CRITICAL en flex children con overflow,
                  sino el child ignora flex:1 y crece sin límite. */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  paddingRight: 1,
                  scrollbarWidth: 'thin',
                }}
              >
                {pubs.map((p) => <PubChip key={p.id} pub={p} variant="compact" canDrag={!!onMoveDate && !isMobile} />)}
              </div>
            </div>
          )
        })}
      </div>
       </div>
      </div>
    </div>
  )
}

/* ============================================================
   SEMANA VIEW — 7 columnas con detalle completo por publicación
   ============================================================ */

function SemanaView({ entries, isMobile = false, onMoveDate, onCreate }: { entries: PublicacionMock[]; isMobile?: boolean; onMoveDate?: (id: string, fecha: string) => void; onCreate?: (fecha: string) => void }) {
  const today = hoyLima()
  /* Día sobre el que se arrastra un video (resaltar destino). */
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  /* Cursor apunta al lunes de la semana actual */
  function startOfWeek(d: Date): Date {
    const day = (d.getDay() + 6) % 7  /* lunes = 0 */
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
    return r
  }
  const [cursor, setCursor] = useState(() => startOfWeek(today))

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i))
  }
  const weekEnd = days[6]

  const byDay = useMemo(() => indexByDay(entries), [entries])
  const todayKey = dayKey(today)

  /* Label: "26 may – 1 jun 2026" */
  const sameMonth = days[0].getMonth() === days[6].getMonth()
  const sameYear = days[0].getFullYear() === days[6].getFullYear()
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const label = sameMonth
    ? `${days[0].getDate()} – ${days[6].getDate()} ${meses[days[0].getMonth()]} ${days[0].getFullYear()}`
    : sameYear
      ? `${days[0].getDate()} ${meses[days[0].getMonth()]} – ${days[6].getDate()} ${meses[days[6].getMonth()]} ${days[0].getFullYear()}`
      : `${days[0].getDate()} ${meses[days[0].getMonth()]} ${days[0].getFullYear()} – ${days[6].getDate()} ${meses[days[6].getMonth()]} ${weekEnd.getFullYear()}`

  const totalPubsSemana = days.reduce((acc, d) => acc + (byDay.get(dayKey(d))?.length ?? 0), 0)

  return (
    <div style={{ padding: isMobile ? '14px 12px 60px' : '20px 28px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <CalendarNav
          label={label}
          onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7))}
          onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7))}
          onToday={() => setCursor(startOfWeek(today))}
        />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {totalPubsSemana} {totalPubsSemana === 1 ? 'publicación' : 'publicaciones'} esta semana
        </span>
      </div>

      {isMobile && (
        <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>Desliza para ver los otros días</span>
          <span aria-hidden>→</span>
        </div>
      )}

      {/* Mobile: cada día es una columna ancha (82vw) con scroll-snap, así
          se desliza de a un día limpio. Antes eran 7 columnas 1fr aplastadas
          que no scrolleaban → "deslizar a la derecha no sale correctamente". */}
      <div
        style={{
          display: 'grid',
          /* minmax(0, 1fr) (no '1fr' = minmax(auto,1fr)) para que las 7 columnas
             SIEMPRE quepan en el ancho del contenedor. Con '1fr', el contenido de
             las cards forzaba columnas más anchas → la grilla se desbordaba y el
             DOMINGO quedaba cortado sin poder scrollear (overflow oculto). */
          gridTemplateColumns: isMobile ? undefined : 'repeat(7, minmax(0, 1fr))',
          gridAutoFlow: isMobile ? 'column' : undefined,
          gridAutoColumns: isMobile ? '82vw' : undefined,
          gap: 1,
          background: 'var(--mk-border-subtle)',
          borderRadius: 'var(--mk-radius-lg)',
          overflowX: isMobile ? 'auto' : 'hidden',
          overflowY: 'hidden',
          scrollSnapType: isMobile ? 'x mandatory' : undefined,
          WebkitOverflowScrolling: 'touch',
          minHeight: isMobile ? 'calc(100vh - 220px)' : 'calc(100vh - 240px)',
        }}
      >
        {days.map((d, i) => {
          const k = dayKey(d)
          const pubs = byDay.get(k) ?? []
          const isToday = k === todayKey
          const isDropTarget = dragOverKey === k
          return (
            <div
              key={i}
              onDragOver={onMoveDate ? (e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverKey !== k) setDragOverKey(k)
              } : undefined}
              onDragLeave={onMoveDate ? () => setDragOverKey((cur) => (cur === k ? null : cur)) : undefined}
              onDrop={onMoveDate ? (e) => {
                e.preventDefault()
                setDragOverKey(null)
                const id = e.dataTransfer.getData('text/plain')
                if (id) onMoveDate(id, k)
              } : undefined}
              style={{
                background: isDropTarget ? 'var(--mk-bg-selected)' : 'var(--mk-bg-elevated)',
                display: 'flex', flexDirection: 'column',
                minHeight: '100%',
                boxShadow: isDropTarget ? 'inset 0 0 0 2px var(--mk-accent)' : undefined,
                transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
                /* minWidth:0 deja que la columna se encoja por debajo del ancho
                   de su contenido (si no, las cards la fuerzan a crecer). */
                minWidth: 0,
                scrollSnapAlign: isMobile ? 'start' : undefined,
              }}
            >
              {/* Day header */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--mk-border-subtle)',
                  background: isToday ? 'var(--mk-bg-selected)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)', color: 'var(--mk-text-tertiary)', fontWeight: 600, marginBottom: 2 }}>
                    {DAY_NAMES_LONG[i]}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: isToday ? '#fff' : 'var(--mk-text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: isToday ? 30 : undefined, height: isToday ? 30 : undefined,
                        borderRadius: isToday ? 'var(--mk-radius-full)' : undefined,
                        background: isToday ? 'var(--mk-accent)' : undefined,
                        padding: isToday ? '0 8px' : '0',
                        boxShadow: isToday ? '0 0 16px var(--mk-accent-glow)' : undefined,
                      }}
                    >
                      {d.getDate()}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--mk-text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {meses[d.getMonth()]}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {pubs.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--mk-text-tertiary)', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                      {pubs.length}
                    </span>
                  )}
                  {/* "+" para crear una publicación en este día. */}
                  {onCreate && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCreate(k) }}
                      title="Nueva publicación este día"
                      aria-label="Nueva publicación este día"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 'var(--mk-radius-full)',
                        border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
                        fontSize: 16, fontWeight: 700, color: '#fff', background: 'var(--mk-accent)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Pubs (column scroll) */}
              <div style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pubs.length === 0 ? (
                  onCreate ? (
                    <button
                      type="button"
                      onClick={() => onCreate(k)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, padding: 20, minHeight: 80,
                        color: 'var(--mk-text-quaternary)', fontSize: 11,
                        background: 'transparent', border: '1px dashed transparent',
                        borderRadius: 'var(--mk-radius-md)', cursor: 'pointer',
                        transition: 'border-color var(--mk-dur-fast) var(--mk-ease-out), color var(--mk-dur-fast) var(--mk-ease-out)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--mk-border-subtle)'; e.currentTarget.style.color = 'var(--mk-text-tertiary)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--mk-text-quaternary)' }}
                    >
                      + Nueva publicación
                    </button>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'var(--mk-text-quaternary)', fontSize: 11 }}>
                      Sin publicaciones
                    </div>
                  )
                ) : (
                  pubs.map((p) => <PubChip key={p.id} pub={p} variant="full" canDrag={!!onMoveDate && !isMobile} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   Network icons — diseñados como SVG, no emojis
   ============================================================ */

function RedIcon({ red }: { red: Red }) {
  const c = RED_CONFIG[red]
  return (
    <span title={c.label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, color: c.color }}>
      {red === 'instagram' && <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="1.3" /><circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="9.5" cy="3.5" r="0.6" fill="currentColor" /></svg>}
      {red === 'facebook'  && <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 11V7H9.5L9.8 5H8V4C8 3.45 8.18 3 9 3H10V1.14C9.72 1.1 9.14 1 8.45 1C7 1 6 1.88 6 3.7V5H4.5V7H6V11" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" /></svg>}
      {red === 'tiktok'    && <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1.5V8.5C8.5 9.6 7.6 10.5 6.5 10.5C5.4 10.5 4.5 9.6 4.5 8.5C4.5 7.4 5.4 6.5 6.5 6.5M8.5 1.5C8.5 3.2 9.8 4.5 11.5 4.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {red === 'linkedin'  && <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><rect x="3.5" y="5.5" width="1.5" height="4" fill="currentColor" /><circle cx="4.25" cy="3.75" r="0.8" fill="currentColor" /><path d="M6.5 9.5V5.5H8V6.2C8.3 5.7 8.9 5.3 9.5 5.3C10.5 5.3 11 6 11 7.2V9.5H9.5V7.5C9.5 7 9.2 6.7 8.7 6.7C8.2 6.7 8 7 8 7.5V9.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" /></svg>}
    </span>
  )
}

/* ============================================================
   Cells, Filter Pill, Icons, Buttons (re-usados del Editor)
   ============================================================ */

function Th({ children, width, align }: { children?: React.ReactNode; width?: string; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align ?? 'left', padding: '8px 14px',
        fontSize: 'var(--mk-text-xs)', textTransform: 'uppercase',
        letterSpacing: 'var(--mk-tracking-caps)',
        color: 'var(--mk-text-tertiary)', fontWeight: 500,
        borderBottom: '1px solid var(--mk-border-subtle)',
        background: 'var(--mk-bg-base)',
        position: 'sticky', top: 0, zIndex: 2, width,
      }}
    >
      {children}
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

type FilterOption = { id: string; label: string; color?: string; emoji?: string }

function FilterPill({ label, value, dotColor, options, onSelect }: { label: string; value: string | null; dotColor: string | null; options: FilterOption[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="mk-focusable"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: value ? 'var(--mk-accent-bg)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${value ? 'var(--mk-border-accent)' : 'var(--mk-border-subtle)'}`,
          borderRadius: 'var(--mk-radius-md)',
          color: value ? 'var(--mk-text-primary)' : 'var(--mk-text-secondary)',
          fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)', fontWeight: 500,
          cursor: 'pointer',
          transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
        }}
      >
        {dotColor && <span className="mk-dot" style={{ background: dotColor, width: 6, height: 6 }} />}
        <span style={{ opacity: 0.7 }}>{label}:</span>
        <span>{value ?? 'Todos'}</span>
        <span style={{ opacity: 0.4, fontSize: 8 }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div className="mk-anim-scale-in" style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 180,
            background: 'var(--mk-bg-overlay)',
            border: '1px solid var(--mk-border-default)',
            borderRadius: 'var(--mk-radius-md)',
            boxShadow: 'var(--mk-shadow-lg)',
            padding: 4, zIndex: 51, maxHeight: 320, overflowY: 'auto',
          }}>
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => { onSelect(o.id); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 10px',
                  background: 'transparent', border: 'none',
                  borderRadius: 'var(--mk-radius-sm)',
                  color: 'var(--mk-text-primary)',
                  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {/* Si hay emoji de marca, lo mostramos en cuadro tinted. Si
                    no, fallback al dot pequeño. Pedro reportó que no salían
                    los logos en el filtro. */}
                {o.emoji ? (
                  <span style={{
                    width: 20, height: 20,
                    borderRadius: 5,
                    background: o.color ? `${o.color}1f` : 'rgba(0,0,0,0.04)',
                    border: o.color ? `1px solid ${o.color}40` : '1px solid rgba(0,0,0,0.08)',
                    display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, lineHeight: 1,
                    flexShrink: 0,
                  }}>
                    {o.emoji}
                  </span>
                ) : (
                  o.color && <span className="mk-dot" style={{ background: o.color, width: 8, height: 8 }} />
                )}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function IconList()  { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5H9.5M1.5 5.5H9.5M1.5 8.5H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> }
function IconMonth() { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="2.5" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 4.5H9.5M3.5 1.5V3M7.5 1.5V3M4 6.3V7.2M7 6.3V7.2M4 8V8.7M7 8V8.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconWeek()  { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="2.5" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 4.5H9.5M3.5 1.5V3M7.5 1.5V3M3.5 6L3.5 8M5.5 6L5.5 8M7.5 6L7.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconSearch() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconPlus()   { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2V9M2 5.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }

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

/* Botón "Publicar hoy" — verde (acción de "ir a publicar"), distinto del
   morado de "Nueva publicación" para que no se confundan. */
const btnPublicarHoyStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 'var(--mk-button-height-lg)', padding: '0 12px',
  background: '#16a34a', border: '1px solid #16a34a',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white', fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(22,163,74,0.18), 0 0 16px rgba(22,163,74,0.22)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}

const navBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28,
  background: 'var(--mk-bg-elevated)',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-secondary)',
  cursor: 'pointer',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}
