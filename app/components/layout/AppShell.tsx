'use client'

/* AppShell — wrapper global de la app.
 *
 * Desktop (>= 768px):
 *   - Sidebar fijo a la izquierda 240px + Main area
 *
 * Mobile (< 768px) — feel de app nativa:
 *   - TopBar fijo con hamburguesa + título + isotipo
 *   - Sidebar como drawer overlay (transform translateX)
 *   - Backdrop blureado al abrir
 *   - body scroll lock cuando el drawer está abierto
 *   - Cierre automático al cambiar de ruta (Pedro pidió "como app")
 *   - Safe area top + bottom para iOS notch / home indicator
 */

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, Search } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { RealtimeBridge } from '@/lib/realtime/realtime-bridge'
import { IsotipoDistinto } from '@/components/brand/isotipo-distinto'
import type { MarcaNav } from '@/lib/mock-marcas'
import type { Permisos } from '@/lib/team/types'

const NO_SHELL_ROUTES = ['/login', '/mockup', '/portal']

export type PermisosSimple = {
  modulos: Permisos
  marcasAcceso: string[] | null
  nombre: string
  rol: string
  rolBase?: string
  email: string
  avatarUrl: string | null
} | null

type Props = {
  children: React.ReactNode
  marcas?: MarcaNav[]
  permisos?: PermisosSimple
  emailActivo?: string | null
}

/* Mapeo path → título humano para el topbar móvil. Si no matchea,
   capitaliza el primer segmento. */
function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Distinto'
  const seg = pathname.split('/').filter(Boolean)[0] ?? ''
  const titles: Record<string, string> = {
    cockpit: 'Cockpit',
    inicio: 'Inicio',
    publicaciones: 'Publicaciones',
    editor: 'Editor',
    diseno: 'Diseño',
    grabaciones: 'Grabaciones',
    comentarios: 'Comentarios',
    habitos: 'Hábitos',
    historial: 'Historial',
    equipo: 'Mi equipo',
    settings: 'Configuración',
    marca: 'Marca',
    grilla: 'Grilla',
    perfil: 'Perfil',
    dashboard: 'Dashboard',
  }
  return titles[seg] ?? (seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Distinto')
}

export function AppShell({ children, marcas, permisos, emailActivo }: Props) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  /* Cmd+K global */
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

  /* Cerrar drawer al cambiar de ruta (UX nativa: tocar nav cierra menú) */
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  /* Body scroll lock mientras el drawer está abierto. Evita el bounce
     scroll detrás del overlay en iOS. */
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [drawerOpen])

  /* Rutas sin shell — login, mockup, portales públicos */
  const skipShell = NO_SHELL_ROUTES.some((p) => pathname?.startsWith(p))
  if (skipShell) {
    return <>{children}</>
  }

  const pageTitle = getPageTitle(pathname)

  return (
    <>
      <RealtimeBridge />

      {/* ============== TOPBAR MOBILE ==============
          Sticky, ocupa altura --mk-mobile-topbar-height. Solo se muestra
          en <md. Tiene safe-area-top para iOS notch. */}
      <header className="mk-mobile-topbar">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          className="mk-topbar-btn"
        >
          <Menu size={22} />
        </button>

        <div className="mk-topbar-title">
          <IsotipoDistinto size={20} />
          <span>{pageTitle}</span>
        </div>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Buscar"
          className="mk-topbar-btn"
        >
          <Search size={20} />
        </button>
      </header>

      {/* ============== BACKDROP DRAWER (mobile) ============== */}
      {drawerOpen && (
        <div
          className="mk-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      <div className="mk-shell">
        {/* Sidebar — en desktop: posición sticky en flujo.
            En mobile: position fixed con transform translateX. */}
        <div className={`mk-sidebar-wrap ${drawerOpen ? 'mk-sidebar-open' : ''}`}>
          <Sidebar
            onOpenPalette={() => { setPaletteOpen(true); setDrawerOpen(false) }}
            marcas={marcas}
            permisos={permisos}
            emailActivo={emailActivo}
          />
        </div>

        <main className="mk-main">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} marcas={marcas} permisos={permisos} />
    </>
  )
}
