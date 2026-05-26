'use client'

/* EditorView — tabla Linear-style con columnas idénticas al editor Notion
   de Pedro. Densidad alta, chips de estado, hover row, filters arriba.
   Por ahora read-only: los clicks en chips no editan todavía (iter 2). */

import { useMemo, useState } from 'react'
import {
  EDITOR_ENTRIES_MOCK,
  EDITORES_MOCK,
  ESTADO_CONFIG,
  formatDateES,
  marcaDisplay,
  type EditorEntryMock,
  type EstadoPub,
} from '@/lib/mock-editor'

type FilterState = {
  estado: EstadoPub | 'todos'
  editorId: string | 'todos'
  marcaSlug: string | 'todas'
}

type Props = {
  /* En producción, page.tsx pasará data real de Supabase.
     En local sin env vars, page.tsx cae al mock. */
  entries?: EditorEntryMock[]
}

export function EditorView({ entries = EDITOR_ENTRIES_MOCK }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    estado: 'editar',           /* Default: solo "Editar" — igual al screenshot */
    editorId: 'todos',
    marcaSlug: 'todas',
  })

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filters.estado !== 'todos' && e.estado !== filters.estado) return false
      if (filters.editorId !== 'todos' && e.editorId !== filters.editorId) return false
      if (filters.marcaSlug !== 'todas' && e.marcaSlug !== filters.marcaSlug) return false
      return true
    })
  }, [entries, filters])

  function clearFilters() {
    setFilters({ estado: 'todos', editorId: 'todos', marcaSlug: 'todas' })
  }

  const hasActiveFilters =
    filters.estado !== 'todos' || filters.editorId !== 'todos' || filters.marcaSlug !== 'todas'

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--mk-bg-base)',
      }}
    >
      {/* ============== HEADER ============== */}
      <header
        style={{
          height: 'var(--mk-header-height)',
          padding: '0 20px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
          <span style={{ color: 'var(--mk-text-tertiary)' }}>Publicaciones</span>
          <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>Editor</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="mk-focusable" style={btnGhostStyle}>
          <IconFilter /> Vistas
        </button>
        <button className="mk-focusable" style={btnGhostStyle}>
          <IconSort /> Ordenar
        </button>
        <button className="mk-focusable" style={btnPrimaryStyle}>
          <IconPlus /> Nueva tarea
        </button>
      </header>

      {/* ============== FILTER BAR ============== */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.01)',
          flexShrink: 0,
        }}
      >
        <FilterPill
          label="Estado"
          value={filters.estado === 'todos' ? null : ESTADO_CONFIG[filters.estado].label}
          dotColor={filters.estado === 'todos' ? null : ESTADO_CONFIG[filters.estado].color}
          options={[
            { id: 'todos',     label: 'Todos' },
            ...(Object.entries(ESTADO_CONFIG) as [EstadoPub, typeof ESTADO_CONFIG.editar][]).map(([k, v]) => ({
              id: k, label: v.label, color: v.color,
            })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, estado: id as EstadoPub | 'todos' }))}
        />

        <FilterPill
          label="Editor"
          value={
            filters.editorId === 'todos'
              ? null
              : EDITORES_MOCK.find((e) => e.id === filters.editorId)?.nombre ?? null
          }
          dotColor={
            filters.editorId === 'todos'
              ? null
              : EDITORES_MOCK.find((e) => e.id === filters.editorId)?.color ?? null
          }
          options={[
            { id: 'todos', label: 'Todos' },
            { id: '_sin', label: 'Sin asignar' },
            ...EDITORES_MOCK.map((e) => ({ id: e.id, label: e.nombre, color: e.color })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, editorId: id }))}
        />

        <FilterPill
          label="Marca"
          value={
            filters.marcaSlug === 'todas'
              ? null
              : marcaDisplay(filters.marcaSlug)?.nombreCorto ?? null
          }
          dotColor={
            filters.marcaSlug === 'todas'
              ? null
              : marcaDisplay(filters.marcaSlug)?.color ?? null
          }
          options={[
            { id: 'todas', label: 'Todas' },
            ...[
              'manrique','lozano','kintu','novalamps','lavictoria',
              'distrifitness','littlejoe','warriorsupps','oralbeauty',
            ].map((s) => ({ id: s, label: marcaDisplay(s)?.nombreCorto ?? s, color: marcaDisplay(s)?.color })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, marcaSlug: id }))}
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '4px 10px', fontSize: 'var(--mk-text-xs)', fontFamily: 'inherit',
              background: 'transparent', border: 'none',
              color: 'var(--mk-text-tertiary)', cursor: 'pointer',
              borderRadius: 'var(--mk-radius-sm)',
              transition: 'color var(--mk-dur-fast) var(--mk-ease-out)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mk-text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mk-text-tertiary)' }}
          >
            Limpiar
          </button>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {filtered.length} {filtered.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      {/* ============== TABLE ============== */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: 'var(--mk-text-sm)',
          }}
        >
          <thead>
            <tr>
              <Th width="200px">Proyecto</Th>
              <Th>Nombre de la tarea</Th>
              <Th width="140px">Editor</Th>
              <Th width="120px">Grilla de FIT</Th>
              <Th width="100px">Estado</Th>
              <Th width="130px">Fecha edición</Th>
              <Th width="100px" align="right">Plataformas</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <Row key={e.id} entry={e} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--mk-text-base)', color: 'var(--mk-text-secondary)', fontWeight: 500, marginBottom: 4 }}>
                    Sin tareas con esos filtros
                  </div>
                  <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)' }}>
                    Probá limpiar los filtros o crear una nueva tarea
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============================================================
   Row
   ============================================================ */

function Row({ entry }: { entry: EditorEntryMock }) {
  const marca = marcaDisplay(entry.marcaSlug)
  const editor = entry.editorId ? EDITORES_MOCK.find((e) => e.id === entry.editorId) : null
  const estadoCfg = ESTADO_CONFIG[entry.estado]

  return (
    <tr
      style={{
        height: 'var(--mk-row-height)',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {/* Proyecto (marca) */}
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="mk-dot"
            style={{
              background: marca?.color ?? 'var(--mk-text-tertiary)',
              boxShadow: marca?.color ? `0 0 6px ${marca.color}` : undefined,
              width: 8, height: 8,
            }}
          />
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {marca?.nombreCorto ?? entry.marcaSlug}
          </span>
        </div>
      </Td>

      {/* Nombre tarea */}
      <Td>
        <span style={{ color: 'var(--mk-text-primary)' }}>
          {entry.nombreTarea}
        </span>
      </Td>

      {/* Editor (chip) */}
      <Td>
        {editor ? <EditorChip nombre={editor.nombre} color={editor.color} /> : <EmptyCell />}
      </Td>

      {/* Grilla de FIT */}
      <Td>
        <span style={{ color: 'var(--mk-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatDateES(entry.grillaFit)}
        </span>
      </Td>

      {/* Estado (chip clickable — futuro popover) */}
      <Td>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 8px',
            background: estadoCfg.bg,
            color: estadoCfg.color,
            fontSize: 10.5,
            fontWeight: 500,
            borderRadius: 'var(--mk-radius-sm)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--mk-tracking-caps)',
            cursor: 'pointer',
          }}
        >
          <span className="mk-dot" style={{ background: estadoCfg.color, width: 5, height: 5 }} />
          {estadoCfg.label}
        </span>
      </Td>

      {/* Fecha edición */}
      <Td>
        <span style={{ color: 'var(--mk-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatDateES(entry.fechaEdicion)}
        </span>
      </Td>

      {/* Plataformas */}
      <Td align="right">
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {entry.plataformas.map((p) => (
            <span
              key={p}
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                color: 'var(--mk-text-tertiary)',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '1px 5px',
                borderRadius: 3,
                letterSpacing: 0.4,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </Td>
    </tr>
  )
}

/* ============================================================
   Cells primitives
   ============================================================ */

function Th({ children, width, align }: { children: React.ReactNode; width?: string; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align ?? 'left',
        padding: '8px 14px',
        fontSize: 'var(--mk-text-xs)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--mk-tracking-caps)',
        color: 'var(--mk-text-tertiary)',
        fontWeight: 500,
        borderBottom: '1px solid var(--mk-border-subtle)',
        background: 'var(--mk-bg-base)',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        width: width,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td
      style={{
        padding: '0 14px',
        textAlign: align ?? 'left',
        borderBottom: '1px solid var(--mk-border-subtle)',
        verticalAlign: 'middle',
      }}
    >
      {children}
    </td>
  )
}

function EmptyCell() {
  return (
    <span style={{ color: 'var(--mk-text-quaternary)', fontStyle: 'italic', fontSize: 'var(--mk-text-xs)' }}>
      Sin asignar
    </span>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function EditorChip({ nombre, color }: { nombre: string; color: string }) {
  const initials = nombre.slice(0, 2).toUpperCase()
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px 2px 2px',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 'var(--mk-radius-full)',
        cursor: 'pointer',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
      }}
    >
      <span
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          background: color,
          color: 'white',
          display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 9.5, fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        {initials}
      </span>
      <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-secondary)', fontWeight: 500 }}>
        {nombre}
      </span>
    </span>
  )
}

type FilterOption = { id: string; label: string; color?: string }

function FilterPill({
  label, value, dotColor, options, onSelect,
}: {
  label: string
  value: string | null
  dotColor: string | null
  options: FilterOption[]
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="mk-focusable"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: value ? 'var(--mk-accent-bg)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${value ? 'var(--mk-border-accent)' : 'var(--mk-border-subtle)'}`,
          borderRadius: 'var(--mk-radius-md)',
          color: value ? 'var(--mk-text-primary)' : 'var(--mk-text-secondary)',
          fontFamily: 'inherit',
          fontSize: 'var(--mk-text-xs)',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
        }}
      >
        {dotColor && (
          <span className="mk-dot" style={{ background: dotColor, width: 6, height: 6 }} />
        )}
        <span style={{ opacity: 0.7 }}>{label}:</span>
        <span>{value ?? 'Todos'}</span>
        <span style={{ opacity: 0.4, fontSize: 8 }}>▼</span>
      </button>
      {open && (
        <>
          {/* click-outside backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          />
          <div
            className="mk-anim-scale-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              minWidth: 180,
              background: 'var(--mk-bg-overlay)',
              border: '1px solid var(--mk-border-default)',
              borderRadius: 'var(--mk-radius-md)',
              boxShadow: 'var(--mk-shadow-lg)',
              padding: 4,
              zIndex: 51,
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => { onSelect(o.id); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--mk-radius-sm)',
                  color: 'var(--mk-text-primary)',
                  fontFamily: 'inherit',
                  fontSize: 'var(--mk-text-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {o.color && (
                  <span className="mk-dot" style={{ background: o.color, width: 8, height: 8 }} />
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

/* ============================================================
   Icons + button styles
   ============================================================ */

function IconFilter() { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2H9.5L7 5.5V9L4 8V5.5L1.5 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function IconSort()   { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 1.5V9.5M3 9.5L1 7.5M3 9.5L5 7.5M8 9.5V1.5M8 1.5L6 3.5M8 1.5L10 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function IconPlus()   { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2V9M2 5.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }

const btnGhostStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 'var(--mk-button-height-lg)', padding: '0 10px',
  background: 'transparent',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-secondary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  cursor: 'pointer',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 'var(--mk-button-height-lg)', padding: '0 12px',
  background: 'var(--mk-accent)',
  border: '1px solid var(--mk-accent)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}
