'use client'

import Link from 'next/link'
import React from 'react'

export function Section({
  label, open, onToggle, children,
}: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          width: '100%', padding: '6px 8px 4px',
          background: 'transparent', border: 'none',
          color: 'var(--mk-text-tertiary)',
          fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)',
          textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
          fontWeight: 'var(--mk-weight-medium)', cursor: 'pointer',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--mk-dur-fast) var(--mk-ease-out)',
            fontSize: 8,
          }}
        >▶</span>
        {label}
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>}
    </div>
  )
}
export function NavItem({
  href, icon, label, active, badge, shortcut, indent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
  badge?: number
  shortcut?: string
  indent?: boolean
}) {
  return (
    <Link
      href={href}
      className="mk-focusable"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', height: 28,
        padding: indent ? '0 8px 0 24px' : '0 8px',
        background: active ? 'var(--mk-bg-selected)' : 'transparent',
        borderRadius: 'var(--mk-radius-md)',
        color: active ? 'var(--mk-text-primary)' : (indent ? 'var(--mk-text-tertiary)' : 'var(--mk-text-secondary)'),
        fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
        fontWeight: active ? 'var(--mk-weight-medium)' : 'var(--mk-weight-regular)',
        textDecoration: 'none',
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {active && (
        <span
          style={{
            position: 'absolute', left: -6, top: 6, bottom: 6, width: 2,
            background: 'var(--mk-accent)',
            borderRadius: 'var(--mk-radius-full)',
            boxShadow: '0 0 6px var(--mk-accent-glow)',
          }}
        />
      )}
      <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {badge !== undefined && (
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums', fontWeight: 'var(--mk-weight-medium)' }}>
          {badge}
        </span>
      )}
      {shortcut && <span className="mk-kbd" style={{ opacity: 0.6 }}>{shortcut}</span>}
    </Link>
  )
}
export const topBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '6px 8px',
  background: 'transparent', border: 'none',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-primary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
  fontWeight: 600, cursor: 'pointer',
  transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
}
export const logoStyle: React.CSSProperties = {
  width: 22, height: 22,
  borderRadius: 'var(--mk-radius-sm)',
  background: '#ffffff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
  border: '1px solid var(--mk-border-subtle)',
  boxShadow: '0 0 8px rgba(186, 65, 247, 0.18)',
}
export const searchBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '5px 8px', marginTop: 6,
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-tertiary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)',
  cursor: 'pointer',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}
export const userBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '6px 8px',
  background: 'transparent', border: 'none',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-primary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
  textDecoration: 'none', cursor: 'pointer',
  transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
}
export const logoutBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 32, padding: '6px 8px',
  background: 'transparent', border: 'none',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-tertiary)',
  cursor: 'pointer',
  transition: 'background var(--mk-dur-fast) var(--mk-ease-out), color var(--mk-dur-fast) var(--mk-ease-out)',
  fontFamily: 'inherit',
}
export const avatarStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: '50%',
  background: 'linear-gradient(135deg, #ff8a4c 0%, #ff5252 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontWeight: 600, fontSize: 11,
}
