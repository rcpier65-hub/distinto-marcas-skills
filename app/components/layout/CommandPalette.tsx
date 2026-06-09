'use client'

/* CommandPalette global Raycast-style. Cmd+K abre desde cualquier vista.
   Acciones reales: navegación via Next router, ejecutables (signal handlers).

   Filtro por permisos: si el user es miembro (permisos != null), cada
   action declara qué módulo requiere y se oculta si no tiene acceso.
   Admin/owner (permisos null) ve todo. */

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { MARCAS_NAV, type MarcaNav } from '@/lib/mock-marcas'
import { tieneAcceso, type ModuloPermiso, type Permisos } from '@/lib/team/types'

type PermisosSimple = {
  modulos: Permisos
  marcasAcceso: string[] | null
  nombre: string
  rol: string
  /* rolBase ('director' tratado como admin para filtros) */
  rolBase?: string
  email: string
  avatarUrl: string | null
} | null

type Action = {
  id: string
  title: string
  subtitle?: string
  category: 'navegacion' | 'marca' | 'crear' | 'accion'
  icon: React.ReactNode
  shortcut?: string[]
  keywords?: string
  href?: string             /* si tiene → router.push al ejecutar */
  onRun?: () => void        /* si tiene → ejecuta al ejecutar */
  /* Módulo de permiso requerido. Si está vacío → visible para todos
     los miembros (siempre). null = action de owner-only (Pedro). */
  requiereModulo?: ModuloPermiso | null
}

type Props = {
  open: boolean
  onClose: () => void
  /* Marcas desde la base (vía layout raíz). Fallback a la lista fija. */
  marcas?: MarcaNav[]
  /* Permisos del usuario logueado. null = admin/owner, ve todo. */
  permisos?: PermisosSimple
}

export function CommandPalette({ open, onClose, marcas = MARCAS_NAV, permisos }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)

  const actions: Action[] = useMemo(() => [
    // Navegación
    /* Inicio: dashboard unificado (Cockpit + Home en uno). */
    { id: 'nav-inicio',        title: 'Ir a Inicio',           subtitle: 'Tu dashboard ejecutivo',          category: 'navegacion', icon: <IconHome />,     shortcut: ['G', 'I'], keywords: 'home dashboard cockpit ejecutivo bienvenida', href: '/inicio',         requiereModulo: undefined },
    { id: 'nav-inbox',         title: 'Inbox global de comentarios',                                        category: 'navegacion', icon: <IconInbox />,    shortcut: ['G', 'I'], keywords: 'comentarios respuestas', href: '/comentarios',  requiereModulo: 'comentarios' },
    { id: 'nav-pubs',          title: 'Publicaciones',                                                      category: 'navegacion', icon: <IconCalendar />, shortcut: ['G', 'P'], keywords: 'posts contenido',      href: '/publicaciones',  requiereModulo: 'publicaciones' },
    { id: 'nav-editor',        title: 'Editor de video',                                                    category: 'navegacion', icon: <IconVideo />,    shortcut: ['G', 'E'], keywords: 'editar videos',        href: '/editor',         requiereModulo: 'editor' },
    { id: 'nav-diseno',        title: 'Diseño',                                                             category: 'navegacion', icon: <IconCalendar />, shortcut: ['G', 'D'], keywords: 'portadas piezas',      href: '/diseno',         requiereModulo: 'diseno' },
    { id: 'nav-recordings',    title: 'Grabaciones',                                                        category: 'navegacion', icon: <IconVideo />,    shortcut: ['G', 'R'], keywords: 'video shooting',       href: '/grabaciones',    requiereModulo: 'publicaciones' },
    { id: 'nav-habits',        title: 'Hábitos',                                                            category: 'navegacion', icon: <IconCheck />,    shortcut: ['G', 'H'], keywords: 'rutinas streak',       href: '/habitos',        requiereModulo: undefined },
    { id: 'nav-equipo',        title: 'Mi equipo',                                                          category: 'navegacion', icon: <IconSettings />, keywords: 'team miembros',           href: '/equipo',         requiereModulo: 'equipo' },
    { id: 'nav-settings',      title: 'Settings',    subtitle: 'Configuración del workspace',               category: 'navegacion', icon: <IconSettings />, shortcut: ['⌘', ','], keywords: 'config preferencias',  href: '/settings',       requiereModulo: 'settings' },

    // Crear — solo aparecen si el user tiene permiso de creación en ese módulo
    { id: 'create-pub',        title: 'Nueva publicación',     subtitle: 'Borrador para cualquier marca',   category: 'crear', icon: <IconPlus />,    shortcut: ['C'], keywords: 'crear post reel carrusel', href: '/publicaciones/nueva', requiereModulo: 'publicaciones' },
    { id: 'create-grilla',     title: 'Generar grilla semanal',                                              category: 'crear', icon: <IconGrid />,    keywords: 'crear armar',              href: '/inicio',              requiereModulo: 'grilla' },
    { id: 'create-grabacion',  title: 'Agendar grabación',                                                   category: 'crear', icon: <IconVideo />,   keywords: 'video shooting',           href: '/grabaciones',         requiereModulo: 'publicaciones' },
    { id: 'create-nota',       title: 'Nueva nota',                                                          category: 'crear', icon: <IconNote />,    keywords: 'apunte memo',              href: '/historial',           requiereModulo: null /* admin only */ },

    // Por marca — las marcas ya vienen filtradas desde el layout según marcas_acceso del user
    ...marcas.map<Action>((m) => ({
      id: `marca-${m.slug}`,
      title: `Abrir ${m.nombreCorto}`,
      subtitle: `${m.industria} · ${m.pendientes} pendientes`,
      category: 'marca' as const,
      icon: <span className="mk-dot" style={{ background: m.color, width: 8, height: 8, boxShadow: `0 0 4px ${m.color}` }} />,
      keywords: `${m.slug} ${m.nombre} ${m.industria}`,
      href: `/grilla/${m.slug}`,
      requiereModulo: 'grilla',
    })),
  ], [marcas])

  /* Filtro por permisos.
     - Admin/owner (permisos==null): ve TODO
     - Miembro: solo acciones donde
       requiereModulo === undefined  → siempre visible (ej. Inicio, Hábitos)
       requiereModulo === null       → owner-only, OCULTAR
       requiereModulo === 'xxx'      → visible solo si tieneAcceso(xxx) */
  const visibles = useMemo(() => {
    if (!permisos) return actions  /* admin/owner ve todo */
    /* CEO (director) también ve todo — caso Pedro como team_member */
    if (permisos.rolBase === 'director') return actions
    return actions.filter((a) => {
      if (a.requiereModulo === undefined) return true
      if (a.requiereModulo === null) return false
      return tieneAcceso(permisos.modulos, a.requiereModulo)
    })
  }, [actions, permisos])

  // Filtro fuzzy aplicado sobre las visibles
  const filtered = useMemo(() => {
    if (!query) return visibles
    const q = query.toLowerCase()
    return visibles.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      a.subtitle?.toLowerCase().includes(q) ||
      a.keywords?.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    )
  }, [query, visibles])

  useEffect(() => { setSelectedIdx(0) }, [query])

  // Reset query al cerrar
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(''), 200) // espera animación
      return () => clearTimeout(t)
    }
  }, [open])

  function execute(a: Action) {
    onClose()
    if (a.href) router.push(a.href)
    if (a.onRun) a.onRun()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        const a = filtered[selectedIdx]
        if (a) execute(a)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open) return null

  // Agrupar
  const grouped: Record<string, Action[]> = { navegacion: [], crear: [], accion: [], marca: [] }
  filtered.forEach((a) => grouped[a.category].push(a))
  const categoryLabels: Record<string, string> = {
    navegacion: 'Navegación',
    crear: 'Crear',
    accion: 'Acciones',
    marca: 'Marcas',
  }

  let globalIdx = 0

  return (
    <>
      <div
        onClick={onClose}
        className="mk-anim-fade"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.50)',
          backdropFilter: 'blur(6px)',
          zIndex: 9000,
        }}
      />
      <div
        className="mk-anim-scale-in"
        style={{
          position: 'fixed', top: '15vh', left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(640px, 92vw)',
          maxHeight: '70vh',
          background: 'var(--mk-bg-overlay)',
          border: '1px solid var(--mk-border-default)',
          borderRadius: 'var(--mk-radius-xl)',
          boxShadow: 'var(--mk-shadow-xl)',
          zIndex: 9001,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--mk-border-subtle)' }}>
          <span style={{ color: 'var(--mk-text-tertiary)' }}><IconSearch /></span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o ejecutar comando…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--mk-text-primary)',
              fontFamily: 'inherit', fontSize: 'var(--mk-text-base)',
              letterSpacing: 'var(--mk-tracking-snug)',
            }}
          />
          <span className="mk-kbd">esc</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px 8px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--mk-text-tertiary)', fontSize: 'var(--mk-text-sm)' }}>
              Sin resultados para <span style={{ color: 'var(--mk-text-secondary)', fontWeight: 500 }}>&quot;{query}&quot;</span>
            </div>
          )}
          {(['navegacion', 'crear', 'accion', 'marca'] as const).map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            return (
              <div key={cat} style={{ marginBottom: 4 }}>
                <div style={{ padding: '6px 14px 4px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)', color: 'var(--mk-text-tertiary)', fontWeight: 500 }}>
                  {categoryLabels[cat]}
                </div>
                {items.map((a) => {
                  const idx = globalIdx++
                  const selected = idx === selectedIdx
                  return (
                    <button
                      key={a.id}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => execute(a)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '7px 12px',
                        background: selected ? 'var(--mk-bg-selected)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--mk-radius-md)',
                        color: 'inherit', fontFamily: 'inherit',
                        textAlign: 'left', cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      {selected && (
                        <span style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 2, background: 'var(--mk-accent)', borderRadius: 'var(--mk-radius-full)' }} />
                      )}
                      <span style={{ width: 16, display: 'flex', justifyContent: 'center', color: selected ? 'var(--mk-accent)' : 'var(--mk-text-tertiary)' }}>
                        {a.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', fontWeight: 500 }}>{a.title}</div>
                        {a.subtitle && (
                          <div style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.subtitle}
                          </div>
                        )}
                      </div>
                      {a.shortcut && (
                        <span style={{ display: 'flex', gap: 2 }}>
                          {a.shortcut.map((k, i) => (<span key={i} className="mk-kbd">{k}</span>))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 14px', borderTop: '1px solid var(--mk-border-subtle)', fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', background: 'rgba(0,0,0,0.20)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="mk-kbd">↑</span><span className="mk-kbd">↓</span><span>navegar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="mk-kbd">↵</span><span>seleccionar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="mk-kbd">esc</span><span>cerrar</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </>
  )
}

/* Icons (compactos, stroke 1.2) */
function IconHome() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 5.5L6.5 2L11 5.5V11H8V8H5V11H2V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function IconInbox() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L3.5 3H9.5L11 6.5M2 6.5V10.5H11V6.5M2 6.5H4.5L5.5 8H7.5L8.5 6.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function IconCalendar() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="3" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M2 5.5H11M4.5 2V3.5M8.5 2V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconSettings() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="1.4" stroke="currentColor" strokeWidth="1.2" /><path d="M6.5 1.5V2.8M6.5 10.2V11.5M2.4 3.3L3.3 4.2M9.7 8.8L10.6 9.7M1.5 6.5H2.8M10.2 6.5H11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconPlus() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2.5V10.5M2.5 6.5H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
function IconGrid() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="2" width="4" height="4" stroke="currentColor" strokeWidth="1.2" /><rect x="7" y="2" width="4" height="4" stroke="currentColor" strokeWidth="1.2" /><rect x="2" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1.2" /><rect x="7" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1.2" /></svg> }
function IconVideo() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="4" width="6.5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" /><path d="M8.5 6L11 4.5V8.5L8.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function IconNote() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 2H8L10.5 4.5V11H3V2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 2V4.5H10.5M5 7H8M5 9H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function IconCheck() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="2" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4 6.5L5.7 8.2L9 4.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function IconSearch() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.3" /><path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> }
