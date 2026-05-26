'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from './_components/Sidebar'
import { Cockpit } from './_components/Cockpit'
import { CommandPalette } from './_components/CommandPalette'

export default function MockupPage() {
  const [activeView, setActiveView] = useState('cockpit')
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Global Cmd+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="mockup-fullscreen mockup-root">
      <div style={{ display: 'flex', height: '100vh', position: 'relative', zIndex: 2 }}>
        <Sidebar
          activeView={activeView}
          onNavigate={(v) => setActiveView(v)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        {activeView === 'cockpit' && <Cockpit />}
        {activeView !== 'cockpit' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              padding: 40,
              color: 'var(--mk-text-tertiary)',
              fontSize: 'var(--mk-text-base)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--mk-radius-xl)',
                background: 'var(--mk-bg-elevated)',
                border: '1px solid var(--mk-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--mk-text-quaternary)',
                marginBottom: 8,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 9H19M9 3V19" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div style={{ color: 'var(--mk-text-primary)', fontSize: 'var(--mk-text-lg)', fontWeight: 'var(--mk-weight-semibold)', letterSpacing: 'var(--mk-tracking-snug)' }}>
              Vista en construcción
            </div>
            <div style={{ textAlign: 'center', maxWidth: 360 }}>
              Esta es vista <code style={{ background: 'var(--mk-bg-elevated)', padding: '1px 6px', borderRadius: 4, fontSize: 12, color: 'var(--mk-text-secondary)' }}>{activeView}</code>. En el mockup actual solo está construido el <strong style={{ color: 'var(--mk-text-secondary)' }}>Cockpit</strong>. Si te late la dirección visual, construyo el resto.
            </div>
            <button
              onClick={() => setActiveView('cockpit')}
              style={{
                marginTop: 12,
                padding: '6px 14px',
                background: 'var(--mk-bg-elevated)',
                border: '1px solid var(--mk-border-default)',
                borderRadius: 'var(--mk-radius-md)',
                color: 'var(--mk-text-primary)',
                fontFamily: 'inherit',
                fontSize: 'var(--mk-text-sm)',
                cursor: 'pointer',
              }}
            >
              ← Volver al Cockpit
            </button>
          </div>
        )}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
