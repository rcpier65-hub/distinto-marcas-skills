'use client'

/* PublicacionesView — replica + mejora la vista Calendario/Listado de
   Metricool con diseño Linear-style. Tab toggle entre vistas:
   - Listado: tabla densa con fecha/hora/marca/caption/redes/estado/editor
   - Calendario: grid mensual con dots coloreados por marca

   Default tab: Listado (porque Pedro pidió "listado ayuda a entender mejor").
   Iter 1: read-only. Iter 2: bulk actions + crear/editar inline. */

import { useMemo, useState } from 'react'
import {
  PUBLICACIONES_MOCK,
  ESTADO_PUB_CONFIG,
  RED_CONFIG,
  type PublicacionMock,
  type EstadoPubMetricool,
  type Red,
} from '@/lib/mock-publicaciones'
import { EDITORES_MOCK } from '@/lib/mock-editor'
import { MARCAS_NAV } from '@/lib/mock-marcas'

type ViewMode = 'listado' | 'calendario'

type Filters = {
  marcaSlug: string | 'todas'
  estado: EstadoPubMetricool | 'todos'
  red: Red | 'todas'
}

type Props = {
  publicaciones?: PublicacionMock[]
}

export function PublicacionesView({ publicaciones = PUBLICACIONES_MOCK }: Props) {
  const [view, setView] = useState<ViewMode>('listado')
  const [filters, setFilters] = useState<Filters>({
    marcaSlug: 'todas',
    estado: 'todos',
    red: 'todas',
  })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return publicaciones.filter((p) => {
      if (filters.marcaSlug !== 'todas' && p.marcaSlug !== filters.marcaSlug) return false
      if (filters.estado !== 'todos' && p.estado !== filters.estado) return false
      if (filters.red !== 'todas' && !p.redes.includes(filters.red)) return false
      if (search && !p.caption.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [publicaciones, filters, search])

  const hasFilters =
    filters.marcaSlug !== 'todas' || filters.estado !== 'todos' || filters.red !== 'todas' || !!search

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--mk-bg-base)' }}>
      {/* ============== HEADER ============== */}
      <header
        style={{
          height: 'var(--mk-header-height)',
          padding: '0 20px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
          <span style={{ color: 'var(--mk-text-tertiary)' }}>Workspace</span>
          <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>Publicaciones</span>
        </div>
        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <ViewToggle current={view} onChange={setView} />

        <button className="mk-focusable" style={btnPrimaryStyle}>
          <IconPlus /> Nueva publicación
          <span className="mk-kbd" style={{ marginLeft: 4 }}>C</span>
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
          value={filters.marcaSlug === 'todas' ? null : MARCAS_NAV.find((m) => m.slug === filters.marcaSlug)?.nombreCorto ?? null}
          dotColor={filters.marcaSlug === 'todas' ? null : MARCAS_NAV.find((m) => m.slug === filters.marcaSlug)?.color ?? null}
          options={[
            { id: 'todas', label: 'Todas' },
            ...MARCAS_NAV.map((m) => ({ id: m.slug, label: m.nombreCorto, color: m.color })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, marcaSlug: id }))}
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

        {hasFilters && (
          <button
            onClick={() => { setFilters({ marcaSlug: 'todas', estado: 'todos', red: 'todas' }); setSearch('') }}
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
        {view === 'listado'
          ? <ListadoView entries={filtered} selected={selected} onToggleSelect={(id) => {
              setSelected((s) => {
                const next = new Set(s)
                if (next.has(id)) next.delete(id); else next.add(id)
                return next
              })
            }} />
          : <CalendarioView entries={filtered} />}
      </div>
    </div>
  )
}

/* ============================================================
   View Toggle
   ============================================================ */

function ViewToggle({ current, onChange }: { current: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'listado',     label: 'Listado',    icon: <IconList /> },
    { id: 'calendario',  label: 'Calendario', icon: <IconCal /> },
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
  const marca = MARCAS_NAV.find((m) => m.slug === pub.marcaSlug)
  const editor = pub.editorId ? EDITORES_MOCK.find((e) => e.id === pub.editorId) : null
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
   CALENDARIO VIEW — grid mensual con dots por marca
   ============================================================ */

function CalendarioView({ entries }: { entries: PublicacionMock[] }) {
  const [cursor, setCursor] = useState(() => new Date(2026, 5, 1))  /* default: junio 2026 (donde hay más data) */

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7  /* lunes=0 */
  const totalDays = lastOfMonth.getDate()

  /* Cells: padding del mes anterior + días + padding del siguiente */
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

  /* Index entries por día YYYY-MM-DD */
  const byDay = useMemo(() => {
    const m = new Map<string, PublicacionMock[]>()
    entries.forEach((e) => {
      if (!m.has(e.fecha)) m.set(e.fecha, [])
      m.get(e.fecha)!.push(e)
    })
    return m
  }, [entries])

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

  return (
    <div style={{ padding: '20px 28px 60px' }}>
      {/* Calendar header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtnStyle}><svg width="11" height="11" viewBox="0 0 11 11"><path d="M7 2L3 5.5L7 9" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <h2 style={{ fontSize: 'var(--mk-text-lg)', fontWeight: 600, letterSpacing: 'var(--mk-tracking-snug)', color: 'var(--mk-text-primary)', margin: 0, textTransform: 'capitalize', minWidth: 200 }}>
          {monthNames[month]} {year}
        </h2>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtnStyle}><svg width="11" height="11" viewBox="0 0 11 11"><path d="M4 2L8 5.5L4 9" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ ...navBtnStyle, padding: '0 12px', width: 'auto', fontSize: 'var(--mk-text-xs)', fontWeight: 500 }}>Hoy</button>

        <div style={{ flex: 1 }} />

        {/* Legend dots por marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>
          <span>Marcas:</span>
          {MARCAS_NAV.map((m) => (
            <div key={m.slug} title={m.nombreCorto} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="mk-dot" style={{ background: m.color, boxShadow: `0 0 4px ${m.color}`, width: 6, height: 6 }} />
              <span style={{ fontSize: 10 }}>{m.nombreCorto.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-lg) var(--mk-radius-lg) 0 0', overflow: 'hidden' }}>
        {dayNames.map((d) => (
          <div key={d} style={{ padding: '8px 12px', background: 'var(--mk-bg-elevated)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)', color: 'var(--mk-text-tertiary)', fontWeight: 500 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--mk-border-subtle)', borderRadius: '0 0 var(--mk-radius-lg) var(--mk-radius-lg)', overflow: 'hidden' }}>
        {cells.map((c, i) => {
          const key = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}-${String(c.date.getDate()).padStart(2, '0')}`
          const pubs = byDay.get(key) ?? []
          const isToday = key === todayKey
          return (
            <div
              key={i}
              style={{
                background: 'var(--mk-bg-elevated)',
                minHeight: 110,
                padding: 8,
                opacity: c.thisMonth ? 1 : 0.35,
                position: 'relative',
                cursor: pubs.length > 0 ? 'pointer' : 'default',
                transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
              }}
              onMouseEnter={(e) => { if (pubs.length > 0) e.currentTarget.style.background = '#15161a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mk-bg-elevated)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: isToday ? 'var(--mk-text-base)' : 'var(--mk-text-sm)',
                    fontWeight: isToday ? 600 : 500,
                    color: isToday ? 'var(--mk-accent)' : 'var(--mk-text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: isToday ? 22 : undefined, height: isToday ? 22 : undefined,
                    borderRadius: isToday ? '50%' : undefined,
                    background: isToday ? 'var(--mk-accent-bg)' : undefined,
                  }}
                >
                  {c.date.getDate()}
                </span>
                {pubs.length > 3 && (
                  <span style={{ fontSize: 9, color: 'var(--mk-text-tertiary)', fontWeight: 500 }}>+{pubs.length - 3}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pubs.slice(0, 3).map((p) => {
                  const marca = MARCAS_NAV.find((m) => m.slug === p.marcaSlug)
                  return (
                    <div
                      key={p.id}
                      title={`${p.hora} · ${marca?.nombreCorto} — ${p.caption}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '2px 5px',
                        borderRadius: 3,
                        background: `${marca?.color}15`,
                        borderLeft: `2px solid ${marca?.color}`,
                        fontSize: 10,
                        color: 'var(--mk-text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums', fontSize: 9 }}>{p.hora}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</span>
                    </div>
                  )
                })}
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

type FilterOption = { id: string; label: string; color?: string }

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
                {o.color && <span className="mk-dot" style={{ background: o.color, width: 8, height: 8 }} />}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function IconList()   { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5H9.5M1.5 5.5H9.5M1.5 8.5H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> }
function IconCal()    { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="2.5" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 4.5H9.5M3.5 1.5V3M7.5 1.5V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
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
