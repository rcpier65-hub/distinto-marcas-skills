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
import type { MarcaNav } from '@/lib/mock-marcas'
import type { Permisos } from '@/lib/team/types'

const NO_SHELL_ROUTES = ['/login', '/mockup', '/portal']

export type PermisosSimple = {
  modulos: Permisos
  marcasAcceso: string[] | null
  nombre: string
  rol: string
} | null

type Props = {
  children: React.ReactNode
  /* Marcas desde la base, inyectadas por el layout raíz (server). Se reparten
     al sidebar y al command palette para que toda la nav esté sincronizada. */
  marcas?: MarcaNav[]
  /* Permisos del usuario logueado. null = admin/owner sin team_member
     asociado (Pedro original) → sidebar muestra todo. */
  permisos?: PermisosSimple
}

export function AppShell({ children, marcas, permisos }: Props) {
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
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} marcas={marcas} permisos={permisos} />
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} marcas={marcas} />
    </div>
  )
}
