'use client'

/* EditorView — tabla Linear-style con edición INLINE de todas las
   columnas (iter 2). Cada celda es editable con su control natural:
   - Nombre tarea: click → input inline (Enter/blur guarda, Esc cancela)
   - Editor: click → popover lista personas
   - Estado: click → popover lista estados
   - Fechas: click → input type=date nativo
   - Click row (no cell editable) → navega a /publicaciones/[id]

   Optimistic updates: cambio local instantáneo + toast confirmando.
   Mock por ahora; Supabase wire en iter 3. */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  EDITOR_ENTRIES_MOCK,
  EDITORES_MOCK,
  ESTADO_CONFIG,
  formatDateES,
  marcaDisplay,
  type EditorEntryMock,
  type EstadoPub,
} from '@/lib/mock-editor'
import { MARCAS_NAV } from '@/lib/mock-marcas'

/* Categorías de estado UI */
type SortField = 'marca' | 'nombre' | 'editor' | 'grillaFit' | 'estado' | 'fechaEdicion'
type SortDir = 'asc' | 'desc'

type Filters = {
  estado: EstadoPub | 'todos'
  editorId: string | 'todos'
  marcaSlug: string | 'todas'
}

type Props = {
  entries?: EditorEntryMock[]
}

export function EditorView({ entries: initialEntries = EDITOR_ENTRIES_MOCK }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({
    estado: 'editar',
    editorId: 'todos',
    marcaSlug: 'todas',
  })
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir } | null>(null)

  /* ============ Filtrado + búsqueda + sort ============ */
  const visible = useMemo(() => {
    let list = entries.filter((e) => {
      if (filters.estado !== 'todos' && e.estado !== filters.estado) return false
      if (filters.editorId !== 'todos' && e.editorId !== filters.editorId) return false
      if (filters.marcaSlug !== 'todas' && e.marcaSlug !== filters.marcaSlug) return false
      if (search) {
        const q = search.toLowerCase()
        const marca = marcaDisplay(e.marcaSlug)
        if (
          !e.nombreTarea.toLowerCase().includes(q) &&
          !marca?.nombreCorto.toLowerCase().includes(q)
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
  }, [entries, filters, search, sort])

  const hasActiveFilters =
    filters.estado !== 'todos' || filters.editorId !== 'todos' || filters.marcaSlug !== 'todas' || !!search

  /* ============ Edit handlers (optimistic) ============ */
  function updateEntry(id: string, patch: Partial<EditorEntryMock>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  function setEstado(id: string, estado: EstadoPub) {
    updateEntry(id, { estado })
    toast.success(`Estado → ${ESTADO_CONFIG[estado].label}`, { duration: 1500 })
  }
  function setEditor(id: string, editorId: string | null) {
    updateEntry(id, { editorId })
    const name = editorId ? EDITORES_MOCK.find((ed) => ed.id === editorId)?.nombre : 'Sin asignar'
    toast.success(`Editor → ${name}`, { duration: 1500 })
  }
  function setNombre(id: string, nombreTarea: string) {
    const trimmed = nombreTarea.trim()
    if (!trimmed) { toast.error('El nombre no puede estar vacío'); return }
    updateEntry(id, { nombreTarea: trimmed })
    toast.success('Tarea renombrada', { duration: 1500 })
  }
  function setFechaGrilla(id: string, grillaFit: string) {
    updateEntry(id, { grillaFit })
    toast.success(`Grilla FIT → ${formatDateES(grillaFit)}`, { duration: 1500 })
  }
  function setFechaEdicion(id: string, fechaEdicion: string) {
    updateEntry(id, { fechaEdicion })
    toast.success(`Fecha edición → ${formatDateES(fechaEdicion)}`, { duration: 1500 })
  }

  function toggleSort(field: SortField) {
    setSort((s) => {
      if (!s || s.field !== field) return { field, dir: 'asc' }
      if (s.dir === 'asc') return { field, dir: 'desc' }
      return null  /* third click clears sort */
    })
  }

  function clearAll() {
    setFilters({ estado: 'todos', editorId: 'todos', marcaSlug: 'todas' })
    setSearch('')
    setSort(null)
  }

  function openRow(id: string) {
    /* Click row (fuera de cells editables) → vista detalle */
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
        <button className="mk-focusable" style={btnPrimaryStyle}>
          <IconPlus /> Nueva tarea
        </button>
      </header>

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
          value={filters.editorId === 'todos' ? null : EDITORES_MOCK.find((e) => e.id === filters.editorId)?.nombre ?? null}
          dotColor={filters.editorId === 'todos' ? null : EDITORES_MOCK.find((e) => e.id === filters.editorId)?.color ?? null}
          options={[
            { id: 'todos', label: 'Todos' },
            { id: '_sin', label: 'Sin asignar' },
            ...EDITORES_MOCK.map((e) => ({ id: e.id, label: e.nombre, color: e.color })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, editorId: id }))}
        />
        <FilterPill
          label="Marca"
          value={filters.marcaSlug === 'todas' ? null : marcaDisplay(filters.marcaSlug)?.nombreCorto ?? null}
          dotColor={filters.marcaSlug === 'todas' ? null : marcaDisplay(filters.marcaSlug)?.color ?? null}
          options={[
            { id: 'todas', label: 'Todas' },
            ...MARCAS_NAV.map((m) => ({ id: m.slug, label: m.nombreCorto, color: m.color })),
          ]}
          onSelect={(id) => setFilters((f) => ({ ...f, marcaSlug: id }))}
        />

        {(hasActiveFilters || sort) && (
          <button onClick={clearAll} style={clearBtnStyle}>Limpiar</button>
        )}

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
              <Th width="200px" sortable field="marca"       sort={sort} onSort={toggleSort}>Proyecto</Th>
              <Th             sortable field="nombre"       sort={sort} onSort={toggleSort}>Nombre de la tarea</Th>
              <Th width="160px" sortable field="editor"      sort={sort} onSort={toggleSort}>Editor</Th>
              <Th width="130px" sortable field="grillaFit"   sort={sort} onSort={toggleSort}>Grilla de FIT</Th>
              <Th width="120px" sortable field="estado"      sort={sort} onSort={toggleSort}>Estado</Th>
              <Th width="140px" sortable field="fechaEdicion" sort={sort} onSort={toggleSort}>Fecha edición</Th>
              <Th width="50px" align="right" />
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <Row
                key={e.id}
                entry={e}
                onOpenDetail={() => openRow(e.id)}
                onSetEstado={(s) => setEstado(e.id, s)}
                onSetEditor={(eid) => setEditor(e.id, eid)}
                onSetNombre={(n) => setNombre(e.id, n)}
                onSetGrilla={(d) => setFechaGrilla(e.id, d)}
                onSetFechaEd={(d) => setFechaEdicion(e.id, d)}
              />
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--mk-text-base)', color: 'var(--mk-text-secondary)', fontWeight: 500, marginBottom: 4 }}>
                  Sin tareas con esos filtros
                </div>
                <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)' }}>
                  Probá limpiar los filtros o crear una nueva tarea
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============================================================
   Row — todas las celdas editables
   ============================================================ */

function Row({
  entry, onOpenDetail, onSetEstado, onSetEditor, onSetNombre, onSetGrilla, onSetFechaEd,
}: {
  entry: EditorEntryMock
  onOpenDetail: () => void
  onSetEstado: (s: EstadoPub) => void
  onSetEditor: (eid: string | null) => void
  onSetNombre: (n: string) => void
  onSetGrilla: (d: string) => void
  onSetFechaEd: (d: string) => void
}) {
  const marca = marcaDisplay(entry.marcaSlug)
  const editor = (entry.editorId ? EDITORES_MOCK.find((e) => e.id === entry.editorId) : null) ?? null
  /* estadoCfg sólo se usa adentro de EditableEstado; aquí no se necesita */

  return (
    <tr
      style={{
        height: 'var(--mk-row-height)',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        cursor: 'pointer',
      }}
      onClick={onOpenDetail}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {/* Marca — no editable, sí navegable */}
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mk-dot" style={{ background: marca?.color, boxShadow: marca?.color ? `0 0 6px ${marca.color}` : undefined, width: 8, height: 8 }} />
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {marca?.nombreCorto ?? entry.marcaSlug}
          </span>
        </div>
      </Td>

      {/* Nombre tarea — editable inline */}
      <Td>
        <InlineText value={entry.nombreTarea} onSave={onSetNombre} />
      </Td>

      {/* Editor — popover */}
      <Td>
        <EditableEditor current={editor} onChange={onSetEditor} />
      </Td>

      {/* Grilla FIT — date input */}
      <Td>
        <InlineDate value={entry.grillaFit} onChange={onSetGrilla} />
      </Td>

      {/* Estado — popover */}
      <Td>
        <EditableEstado current={entry.estado} onChange={onSetEstado} />
      </Td>

      {/* Fecha edición — date input */}
      <Td>
        <InlineDate value={entry.fechaEdicion} onChange={onSetFechaEd} />
      </Td>

      {/* Acción rápida — abrir detalle */}
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
   Editable primitives — stopPropagation crítico para no triggear openRow
   ============================================================ */

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function start(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(value); setEditing(true)
  }
  function commit() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }
  function cancel() {
    setEditing(false); setDraft(value)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        style={{
          width: '100%',
          padding: '4px 6px',
          margin: '-4px -6px',
          background: 'var(--mk-bg-base)',
          border: '1px solid var(--mk-accent)',
          borderRadius: 4,
          color: 'var(--mk-text-primary)',
          fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
          outline: 'none',
          boxShadow: '0 0 0 3px var(--mk-accent-glow)',
        }}
      />
    )
  }
  return (
    <span
      onClick={start}
      style={{
        color: 'var(--mk-text-primary)',
        cursor: 'text',
        padding: '2px 4px', margin: '-2px -4px',
        borderRadius: 3,
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
      title="Click para editar"
    >
      {value}
    </span>
  )
}

function InlineDate({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)

  function start(e: React.MouseEvent) { e.stopPropagation(); setEditing(true) }
  function commit(newVal: string) {
    setEditing(false)
    if (newVal && newVal !== value) onChange(newVal)
  }

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
          border: '1px solid var(--mk-accent)',
          borderRadius: 4,
          color: 'var(--mk-text-primary)',
          fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
          outline: 'none', boxShadow: '0 0 0 3px var(--mk-accent-glow)',
          colorScheme: 'dark',  /* hace el date picker dark */
        }}
      />
    )
  }
  return (
    <span
      onClick={start}
      style={{
        color: 'var(--mk-text-secondary)',
        fontVariantNumeric: 'tabular-nums',
        cursor: 'text',
        padding: '2px 4px', margin: '-2px -4px',
        borderRadius: 3,
      }}
      title="Click para cambiar fecha"
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
          border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
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

function EditableEditor({ current, onChange }: { current: typeof EDITORES_MOCK[number] | null; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '2px 8px 2px 2px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--mk-radius-full)',
          cursor: 'pointer', border: 'none',
          fontFamily: 'inherit',
        }}
      >
        {current ? (
          <>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: current.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600 }}>
              {current.nombre.slice(0, 2).toUpperCase()}
            </span>
            <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-secondary)', fontWeight: 500 }}>{current.nombre}</span>
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
          {EDITORES_MOCK.map((e) => (
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
   Popover + cell primitives
   ============================================================ */

function Popover({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      <div
        className="mk-anim-scale-in"
        style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          minWidth: 180,
          background: 'var(--mk-bg-overlay)',
          border: '1px solid var(--mk-border-default)',
          borderRadius: 'var(--mk-radius-md)',
          boxShadow: 'var(--mk-shadow-lg)',
          padding: 4, zIndex: 51,
          maxHeight: 320, overflowY: 'auto',
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
        color: 'var(--mk-text-primary)',
        fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
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
  children?: React.ReactNode
  width?: string
  align?: 'left' | 'right'
  sortable?: boolean
  field?: SortField
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
        cursor: sortable ? 'pointer' : 'default',
        userSelect: 'none',
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
   Filter pill (re-uso del Editor anterior)
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
   Sort helpers + styles + icons
   ============================================================ */

function sortValue(e: EditorEntryMock, f: SortField): string | number {
  switch (f) {
    case 'marca':        return marcaDisplay(e.marcaSlug)?.nombreCorto ?? e.marcaSlug
    case 'nombre':       return e.nombreTarea
    case 'editor':       return EDITORES_MOCK.find((ed) => ed.id === e.editorId)?.nombre ?? 'zzz'  /* nulls last */
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
const filterBarStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderBottom: '1px solid var(--mk-border-subtle)',
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  background: 'rgba(255, 255, 255, 0.01)', flexShrink: 0,
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
const clearBtnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 'var(--mk-text-xs)', fontFamily: 'inherit',
  background: 'transparent', border: 'none',
  color: 'var(--mk-text-tertiary)', cursor: 'pointer',
  borderRadius: 'var(--mk-radius-sm)',
}
const openBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--mk-text-tertiary)',
  cursor: 'pointer', padding: 4,
  borderRadius: 'var(--mk-radius-sm)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
  display: 'inline-flex', alignItems: 'center',
}

function IconSearch()   { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconPlus()     { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2V9M2 5.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
function IconArrowOpen(){ return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5H10M10 6.5L7 3.5M10 6.5L7 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> }
