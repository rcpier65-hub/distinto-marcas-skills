'use client'

/* AppShell — wrapper global de la app. Reemplaza el Header horizontal
   viejo por sidebar 240px + main area. Maneja:
   - Cmd+K global → abre CommandPalette
   - Condicional: rutas que NO deben tener shell (login, mockup) renderizan
     children sin envoltorio. */

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'

const NO_SHELL_ROUTES = ['/login', '/mockup', '/portal']

type Props = {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Cmd+K global
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

  // Rutas sin shell — login, mockup, portales públicos
  const skipShell = NO_SHELL_ROUTES.some((p) => pathname?.startsWith(p))
  if (skipShell) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--mk-bg-base)' }}>
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
