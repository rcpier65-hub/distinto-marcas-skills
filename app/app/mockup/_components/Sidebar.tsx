'use client'

import { useState } from 'react'
import { MARCAS } from '../_data/mock'

/* Linear-style sidebar: 240px, dark, denso.
   - Top: workspace identity (Distinto + búsqueda Cmd+K hint)
   - Sections: Workspace nav / Marcas (9 con counter) / Personal
   - Bottom: user avatar
*/

type Props = {
  activeView: string
  onNavigate: (view: string) => void
  onOpenPalette: () => void
}

export function Sidebar({ activeView, onNavigate, onOpenPalette }: Props) {
  const [openSections, setOpenSections] = useState({
    workspace: true,
    marcas: true,
    personal: true,
  })

  return (
    <aside
      style={{
        width: 'var(--mk-sidebar-width)',
        height: '100vh',
        background: 'var(--mk-bg-elevated)',
        borderRight: '1px solid var(--mk-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ============== TOP: Workspace + Search ============== */}
      <div
        style={{
          padding: '12px 12px 8px',
          borderBottom: '1px solid var(--mk-border-subtle)',
        }}
      >
        {/* Workspace switcher */}
        <button
          className="mk-focusable"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 8px',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--mk-radius-md)',
            color: 'var(--mk-text-primary)',
            fontFamily: 'inherit',
            fontSize: 'var(--mk-text-sm)',
            fontWeight: 'var(--mk-weight-semibold)',
            cursor: 'pointer',
            transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {/* Logo D — gradient violet to magenta */}
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 'var(--mk-radius-sm)',
              background: 'linear-gradient(135deg, #7170ff 0%, #c87bff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '-0.02em',
              boxShadow: '0 0 8px rgba(113, 112, 255, 0.30)',
            }}
          >
            D
          </span>
          <span style={{ flex: 1, textAlign: 'left' }}>Distinto</span>
          <ChevronUpDown />
        </button>

        {/* Cmd+K search trigger */}
        <button
          className="mk-focusable"
          onClick={onOpenPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '5px 8px',
            marginTop: 6,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--mk-border-subtle)',
            borderRadius: 'var(--mk-radius-md)',
            color: 'var(--mk-text-tertiary)',
            fontFamily: 'inherit',
            fontSize: 'var(--mk-text-xs)',
            cursor: 'pointer',
            transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--mk-bg-hover)'
            e.currentTarget.style.borderColor = 'var(--mk-border-strong)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
            e.currentTarget.style.borderColor = 'var(--mk-border-subtle)'
          }}
        >
          <SearchIcon />
          <span style={{ flex: 1, textAlign: 'left' }}>Buscar o ejecutar…</span>
          <span style={{ display: 'flex', gap: 2 }}>
            <span className="mk-kbd">⌘</span>
            <span className="mk-kbd">K</span>
          </span>
        </button>
      </div>

      {/* ============== Body: Sections ============== */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* SECTION: WORKSPACE */}
        <Section
          label="Workspace"
          open={openSections.workspace}
          onToggle={() => setOpenSections((s) => ({ ...s, workspace: !s.workspace }))}
        >
          <NavItem
            icon={<HomeIcon />}
            label="Cockpit"
            badge={null}
            shortcut="1"
            active={activeView === 'cockpit'}
            onClick={() => onNavigate('cockpit')}
          />
          <NavItem
            icon={<InboxIcon />}
            label="Inbox global"
            badge={73}
            shortcut="2"
            active={activeView === 'inbox'}
            onClick={() => onNavigate('inbox')}
          />
          <NavItem
            icon={<CalendarIcon />}
            label="Calendario"
            badge={null}
            shortcut="3"
            active={activeView === 'calendar'}
            onClick={() => onNavigate('calendar')}
          />
          <NavItem
            icon={<VideoIcon />}
            label="Grabaciones"
            badge={null}
            shortcut="4"
            active={activeView === 'recordings'}
            onClick={() => onNavigate('recordings')}
          />
        </Section>

        {/* SECTION: MARCAS — las 9 clientes */}
        <Section
          label={`Marcas · ${MARCAS.length}`}
          open={openSections.marcas}
          onToggle={() => setOpenSections((s) => ({ ...s, marcas: !s.marcas }))}
        >
          {MARCAS.map((m) => {
            const totalPendiente = m.pendientes.grilla + m.pendientes.comentarios + m.pendientes.publicaciones
            return (
              <NavItem
                key={m.slug}
                icon={
                  <span
                    className="mk-dot"
                    style={{
                      background: m.color,
                      boxShadow: `0 0 6px ${m.color}`,
                      width: 8,
                      height: 8,
                    }}
                  />
                }
                label={m.nombre.replace('Centro Psicológico ', '').replace('Distribuidora ', '').replace(' SAC', '').replace(' · Typhouse', '').replace('Perú', '').replace('.pe', '')}
                badge={totalPendiente > 0 ? totalPendiente : null}
                shortcut={null}
                active={activeView === `marca-${m.slug}`}
                onClick={() => onNavigate(`marca-${m.slug}`)}
              />
            )
          })}
        </Section>

        {/* SECTION: PERSONAL */}
        <Section
          label="Personal"
          open={openSections.personal}
          onToggle={() => setOpenSections((s) => ({ ...s, personal: !s.personal }))}
        >
          <NavItem icon={<CheckIcon />} label="Hábitos" badge={2} shortcut={null} active={false} onClick={() => onNavigate('habitos')} />
          <NavItem icon={<DollarIcon />} label="Finanzas" badge={null} shortcut={null} active={false} onClick={() => onNavigate('finanzas')} />
          <NavItem icon={<NoteIcon />} label="Notas" badge={null} shortcut={null} active={false} onClick={() => onNavigate('notas')} />
        </Section>
      </nav>

      {/* ============== BOTTOM: User ============== */}
      <div
        style={{
          padding: 8,
          borderTop: '1px solid var(--mk-border-subtle)',
        }}
      >
        <button
          className="mk-focusable"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 8px',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--mk-radius-md)',
            color: 'var(--mk-text-primary)',
            fontFamily: 'inherit',
            fontSize: 'var(--mk-text-sm)',
            cursor: 'pointer',
            transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff8a4c 0%, #ff5252 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            P
          </span>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontWeight: 'var(--mk-weight-medium)', fontSize: 'var(--mk-text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Pedro Reyes
            </div>
            <div style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>
              Plan Pro
            </div>
          </div>
          <SettingsIcon />
        </button>
      </div>
    </aside>
  )
}

/* ============================================================
   Section wrapper — collapsable group
   ============================================================ */

function Section({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: '6px 8px 4px',
          background: 'transparent',
          border: 'none',
          color: 'var(--mk-text-tertiary)',
          fontFamily: 'inherit',
          fontSize: 'var(--mk-text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--mk-tracking-caps)',
          fontWeight: 'var(--mk-weight-medium)',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--mk-dur-fast) var(--mk-ease-out)',
            fontSize: 8,
          }}
        >
          ▶
        </span>
        {label}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Nav item — list row
   ============================================================ */

function NavItem({
  icon,
  label,
  badge,
  shortcut,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  badge: number | null
  shortcut: string | null
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className="mk-focusable"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        height: 28,
        padding: '0 8px',
        background: active ? 'var(--mk-bg-selected)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--mk-radius-md)',
        color: active ? 'var(--mk-text-primary)' : 'var(--mk-text-secondary)',
        fontFamily: 'inherit',
        fontSize: 'var(--mk-text-sm)',
        fontWeight: active ? 'var(--mk-weight-medium)' : 'var(--mk-weight-regular)',
        cursor: 'pointer',
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--mk-bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {active && (
        <span
          style={{
            position: 'absolute',
            left: -6,
            top: 6,
            bottom: 6,
            width: 2,
            background: 'var(--mk-accent)',
            borderRadius: 'var(--mk-radius-full)',
            boxShadow: '0 0 6px var(--mk-accent-glow)',
          }}
        />
      )}
      <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {badge !== null && (
        <span
          style={{
            fontSize: 'var(--mk-text-xs)',
            color: 'var(--mk-text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 'var(--mk-weight-medium)',
          }}
        >
          {badge}
        </span>
      )}
      {shortcut && (
        <span className="mk-kbd" style={{ opacity: 0.6 }}>{shortcut}</span>
      )}
    </button>
  )
}

/* ============================================================
   Icons — minimal stroke svgs, NO emoji para nav
   ============================================================ */

function HomeIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 6L7 2.5L11.5 6V11.5H8.5V8H5.5V11.5H2.5V6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}
function InboxIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L4 3H10L12 7M2 7V11H12V7M2 7H5L6 9H8L9 7H12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}
function CalendarIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M2 6H12M5 2V4M9 2V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function VideoIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M9 6L12 4.5V9.5L9 8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2.5" y="2.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 7L6.2 8.7L9.5 5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function DollarIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2V12M9.5 4.5H5.75C5.06 4.5 4.5 5.06 4.5 5.75C4.5 6.44 5.06 7 5.75 7H8.25C8.94 7 9.5 7.56 9.5 8.25C9.5 8.94 8.94 9.5 8.25 9.5H4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function NoteIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2.5H9L11 4.5V11.5C11 11.78 10.78 12 10.5 12H3.5C3.22 12 3 11.78 3 11.5V3C3 2.72 3.22 2.5 3.5 2.5Z" stroke="currentColor" strokeWidth="1.2" /><path d="M9 2.5V4.5H11M5 7H9M5 9H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function SearchIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.2" /><path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function ChevronUpDown() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--mk-text-tertiary)' }}><path d="M3 4L5 2L7 4M3 6L5 8L7 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function SettingsIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--mk-text-tertiary)' }}><circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M7 1.5V3M7 11V12.5M2.55 3.55L3.5 4.5M10.5 9.5L11.45 10.45M1.5 7H3M11 7H12.5M2.55 10.45L3.5 9.5M10.5 4.5L11.45 3.55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
