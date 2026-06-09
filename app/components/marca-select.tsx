// app/components/marca-select.tsx
//
// Dropdown de selección de marca CON LOGO. Reemplaza a los <select> nativos
// (que no pueden mostrar imágenes). Estilizado con los tokens mk- para encajar
// en los modales/superficies oscuras de la app.
'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'

export type MarcaOpt = { slug: string; nombre: string; emoji?: string | null }

export function MarcaSelect({
  marcas,
  value,
  onChange,
  internoLabel = '— Distinto · Interno (default) —',
}: {
  marcas: MarcaOpt[]
  value: string            // slug seleccionado; '' = interno/default
  onChange: (slug: string) => void
  internoLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const sel = value ? marcas.find((m) => m.slug === value) : null

  const triggerStyle: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 10px', borderRadius: 8,
    background: 'var(--mk-bg-elevated, #fff)', border: '1px solid var(--mk-border-subtle, #e4e4e7)',
    color: 'var(--mk-text-primary, inherit)', display: 'flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', fontSize: 14, textAlign: 'left',
  }
  const panelStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 60, marginTop: 4, width: '100%', maxHeight: 300, overflowY: 'auto',
    borderRadius: 10, background: 'var(--mk-bg-elevated, #fff)', border: '1px solid var(--mk-border-subtle, #e4e4e7)',
    boxShadow: '0 10px 28px rgba(0,0,0,0.28)', padding: 4,
  }
  const itemBase: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
    borderRadius: 8, fontSize: 14, color: 'var(--mk-text-primary, inherit)', cursor: 'pointer', background: 'transparent',
    border: 'none', textAlign: 'left',
  }

  function Item({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ ...itemBase, background: active ? 'var(--mk-bg-hover, rgba(0,0,0,0.05))' : 'transparent', fontWeight: active ? 600 : 400 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover, rgba(0,0,0,0.05))' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--mk-bg-hover, rgba(0,0,0,0.05))' : 'transparent' }}
      >
        {children}
      </button>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={triggerStyle}>
        {sel
          ? <MarcaLogo slug={sel.slug} nombre={sel.nombre} emoji={sel.emoji} size={22} />
          : <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>·</span>}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sel ? sel.nombre : internoLabel}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0" style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div style={panelStyle}>
          <Item active={!value} onClick={() => { onChange(''); setOpen(false) }}>
            <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>·</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{internoLabel}</span>
          </Item>
          {marcas.map((m) => (
            <Item key={m.slug} active={value === m.slug} onClick={() => { onChange(m.slug); setOpen(false) }}>
              <MarcaLogo slug={m.slug} nombre={m.nombre} emoji={m.emoji} size={22} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nombre}</span>
            </Item>
          ))}
        </div>
      )}
    </div>
  )
}
