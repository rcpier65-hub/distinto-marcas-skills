'use client'

/* Sidebar Linear-style global — usado por AppShell en toda la app real.
   Refactor del mockup pero conectado a Next router (usePathname + Link). */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MARCAS_NAV, type MarcaNav } from '@/lib/mock-marcas'
import { tieneAcceso, type Permisos, type ModuloPermiso } from '@/lib/team/types'

type PermisosSimple = {
  modulos: Permisos
  marcasAcceso: string[] | null
  nombre: string
  rol: string
  email: string
  avatarUrl: string | null
} | null

type Props = {
  onOpenPalette: () => void
  /* Marcas a mostrar. Vienen de la base vía el layout raíz. Si no se pasan,
     cae a la lista fija para no dejar el menú vacío. */
  marcas?: MarcaNav[]
  /* Permisos del usuario logueado. null = admin/owner, muestra todo.
     Cualquier otro valor → filtramos los items según los permisos. */
  permisos?: PermisosSimple
  /* Email del user logueado en Supabase Auth — visible siempre */
  emailActivo?: string | null
}

const STORAGE_KEY = 'mk:sidebar:sections'

export function Sidebar({ onOpenPalette, marcas = MARCAS_NAV, permisos, emailActivo }: Props) {
  /* Helper para mostrar/ocultar items según permisos. Si no hay
     permisos (= admin/owner), retorna true para todo. */
  const puede = (modulo: ModuloPermiso): boolean => {
    if (!permisos) return true
    return tieneAcceso(permisos.modulos, modulo)
  }

  /* Filtro de marcas: si el miembro tiene marcasAcceso limitadas,
     mostramos solo las suyas. null = todas. */
  const marcasVisibles = permisos && permisos.marcasAcceso !== null
    ? marcas.filter((m) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mAny = m as any
        const id = mAny.id ?? mAny.marca_id
        return id && permisos.marcasAcceso!.includes(id)
      })
    : marcas
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workspace: true,
    marcas: true,
    personal: true,
  })

  // Persistir colapso entre sesiones
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setOpenSections(JSON.parse(stored)) } catch {}
    }
  }, [])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections))
  }, [openSections])

  const isActive = (path: string) =>
    pathname === path || (path !== '/' && pathname?.startsWith(path))

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
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* ============== TOP ============== */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--mk-border-subtle)' }}>
        {/* Workspace identity */}
        <button
          className="mk-focusable"
          style={topBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={logoStyle}>D</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Distinto</span>
          <ChevronUpDown />
        </button>

        {/* Cmd+K */}
        <button
          className="mk-focusable"
          onClick={onOpenPalette}
          style={searchBtnStyle}
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

      {/* ============== Body ============== */}
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
        <Section
          label="Workspace"
          open={openSections.workspace}
          onToggle={() => setOpenSections((s) => ({ ...s, workspace: !s.workspace }))}
        >
          {/* Cockpit: solo si tiene métricas o es admin (sin team_member). */}
          {puede('metricas') && (
            <NavItem href="/cockpit"       icon={<HomeIcon />}     label="Cockpit"        active={isActive('/cockpit')}       shortcut="1" />
          )}
          {puede('inbox') && (
            <NavItem href="/comentarios"   icon={<InboxIcon />}    label="Inbox global"   active={isActive('/comentarios')}   shortcut="2" badge={73} />
          )}
          {puede('publicaciones') && (
            <NavItem href="/publicaciones" icon={<CalendarIcon />} label="Publicaciones"  active={isActive('/publicaciones')} shortcut="3" />
          )}
          {/* Editor es sub-item de Publicaciones (workflow: lista pubs → editar una) */}
          {puede('editor') && (
            <NavItem href="/editor"        icon={<EditIcon />}     label="Editor"         active={isActive('/editor')}        indent />
          )}
          {/* Diseño: gemelo del Editor, foco en piezas que Ailyn diseña */}
          {puede('diseno') && (
            <NavItem href="/diseno"        icon={<PaintIcon />}    label="Diseño"          active={isActive('/diseno')}        indent />
          )}
          {/* Grabaciones: parte de publicaciones — mismo permiso */}
          {puede('publicaciones') && (
            <NavItem href="/grabaciones"   icon={<VideoIcon />}    label="Grabaciones"    active={isActive('/grabaciones')}   shortcut="4" />
          )}
        </Section>

        {/* Sección marcas: solo si tiene acceso a grilla o publicaciones.
            La lista se filtra por marcasAcceso (los miembros restringidos
            solo ven sus marcas). */}
        {(puede('grilla') || puede('publicaciones')) && marcasVisibles.length > 0 && (
          <Section
            label={`Marcas · ${marcasVisibles.length}`}
            open={openSections.marcas}
            onToggle={() => setOpenSections((s) => ({ ...s, marcas: !s.marcas }))}
          >
            {/* "Ver todas": solo si tiene acceso a dashboard global */}
            {!permisos && (
              <NavItem
                href="/dashboard"
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--mk-text-tertiary)' }}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                }
                label="Ver todas"
                active={isActive('/dashboard')}
              />
            )}
            {marcasVisibles.map((m) => (
              <NavItem
                key={m.slug}
                href={`/grilla/${m.slug}`}
                icon={
                  <span
                    className="mk-dot"
                    style={{ background: m.color, boxShadow: `0 0 6px ${m.color}`, width: 8, height: 8 }}
                  />
                }
                label={m.nombreCorto}
                active={isActive(`/grilla/${m.slug}`)}
                badge={m.pendientes > 0 ? m.pendientes : undefined}
              />
            ))}
            {/* "Agregar marca": solo admin */}
            {!permisos && (
              <NavItem
                href="/dashboard?nueva=1"
                icon={
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 16, height: 16, color: '#ba41f7', fontSize: 16, fontWeight: 600, lineHeight: 1,
                    }}
                  >+</span>
                }
                label="Agregar marca"
                active={false}
              />
            )}
          </Section>
        )}

        {/* Personal: Hábitos e Historial son del owner solo (Pedro).
            Mi equipo / Settings tienen su permiso específico. */}
        <Section
          label="Personal"
          open={openSections.personal}
          onToggle={() => setOpenSections((s) => ({ ...s, personal: !s.personal }))}
        >
          {/* Hábitos e Historial son personales del owner. Solo se ven
              cuando NO hay miembro asociado (= Pedro/admin). */}
          {!permisos && (
            <>
              <NavItem href="/habitos"   icon={<CheckIcon />}  label="Hábitos"   active={isActive('/habitos')}   badge={2} />
              <NavItem href="/historial" icon={<NoteIcon />}   label="Historial" active={isActive('/historial')} />
            </>
          )}
          {puede('equipo') && (
            <NavItem href="/equipo"    icon={<TeamIcon />}   label="Mi equipo" active={isActive('/equipo')} />
          )}
          {puede('settings') && (
            <NavItem href="/settings"  icon={<SettingsIcon />} label="Settings" active={isActive('/settings')} />
          )}
        </Section>
      </nav>

      {/* ============== Bottom (user) ============== */}
      <div style={{ padding: 8, borderTop: '1px solid var(--mk-border-subtle)', display: 'flex', gap: 4, alignItems: 'stretch' }}>
        <Link
          href="/perfil"
          className="mk-focusable"
          style={{ ...userBtnStyle, flex: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {/* Si el usuario subió una foto de perfil (permisos.avatarUrl),
              la mostramos como background-image circular. Si no, mostramos
              la inicial del nombre con el color del avatar default.
              Foto en el bottom del sidebar SIEMPRE sincronizada con /perfil. */}
          <span
            style={{
              ...avatarStyle,
              background: permisos?.avatarUrl
                ? `url(${permisos.avatarUrl}) center/cover`
                : avatarStyle.background,
            }}
          >
            {!permisos?.avatarUrl && (permisos ? permisos.nombre.charAt(0).toUpperCase() : (emailActivo?.charAt(0).toUpperCase() ?? 'P'))}
          </span>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontWeight: 'var(--mk-weight-medium)', fontSize: 'var(--mk-text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {permisos ? permisos.nombre : (emailActivo?.split('@')[0] ?? 'Admin')}
            </div>
            {/* Segunda línea: email del usuario logueado (siempre).
                Pedro lo necesita para distinguir si está como admin o
                como miembro al cambiar entre cuentas. */}
            <div style={{
              fontSize: 'var(--mk-text-xs)',
              color: 'var(--mk-text-tertiary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {emailActivo ?? (permisos?.email) ?? 'sin sesión'}
            </div>
          </div>
        </Link>
        {/* Botón cerrar sesión — form con server action signOut. Siempre
            visible para todos los usuarios (Pedro, Lorena, etc.) porque
            es la única forma de cambiar de cuenta. */}
        <form action="/api/auth/logout" method="post" style={{ display: 'flex' }}>
          <button
            type="submit"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            style={logoutBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)'; e.currentTarget.style.color = '#dc2626' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mk-text-tertiary)' }}
          >
            <LogoutIcon />
          </button>
        </form>
      </div>
    </aside>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function Section({
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

function NavItem({
  href, icon, label, active, badge, shortcut, indent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
  badge?: number
  shortcut?: string
  indent?: boolean   /* sub-item: aumenta padding-left para mostrar jerarquía Linear-style */
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

/* ============================================================
   Styles + Icons
   ============================================================ */

const topBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '6px 8px',
  background: 'transparent', border: 'none',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-primary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
  fontWeight: 600, cursor: 'pointer',
  transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
}

const logoStyle: React.CSSProperties = {
  width: 20, height: 20,
  borderRadius: 'var(--mk-radius-sm)',
  background: 'linear-gradient(135deg, #7170ff 0%, #c87bff 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontWeight: 700, fontSize: 11,
  letterSpacing: '-0.02em',
  boxShadow: '0 0 8px rgba(113, 112, 255, 0.30)',
}

const searchBtnStyle: React.CSSProperties = {
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

const userBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '6px 8px',
  background: 'transparent', border: 'none',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-primary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)',
  textDecoration: 'none', cursor: 'pointer',
  transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
}
const logoutBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 32, padding: '6px 8px',
  background: 'transparent', border: 'none',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-tertiary)',
  cursor: 'pointer',
  transition: 'background var(--mk-dur-fast) var(--mk-ease-out), color var(--mk-dur-fast) var(--mk-ease-out)',
  fontFamily: 'inherit',
}

const avatarStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: '50%',
  background: 'linear-gradient(135deg, #ff8a4c 0%, #ff5252 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontWeight: 600, fontSize: 11,
}

function HomeIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 6L7 2.5L11.5 6V11.5H8.5V8H5.5V11.5H2.5V6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function InboxIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L4 3H10L12 7M2 7V11H12V7M2 7H5L6 9H8L9 7H12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function CalendarIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M2 6H12M5 2V4M9 2V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function VideoIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M9 6L12 4.5V9.5L9 8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function EditIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 1.5L10.5 4L4.5 10H2V7.5L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M7 2.5L9.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
/* PaintIcon: balde de pintura para el módulo de Diseño. Mismo
   viewBox y stroke que los otros sub-items (12x12, 1.2) para que
   visualmente alinee con EditIcon en la lista. */
function PaintIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 1.5L10 5.5L7 8.5L3 4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M3 4.5L1.5 8C1.5 9 2.5 9.5 3 9.5C3.5 9.5 4 9 4 8.5C4 8 3.5 7.5 3 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2.5" y="2.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 7L6.2 8.7L9.5 5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function NoteIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2.5H9L11 4.5V11.5C11 11.78 10.78 12 10.5 12H3.5C3.22 12 3 11.78 3 11.5V3C3 2.72 3.22 2.5 3.5 2.5Z" stroke="currentColor" strokeWidth="1.2" /><path d="M9 2.5V4.5H11M5 7H9M5 9H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function SearchIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.2" /><path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function ChevronUpDown() { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--mk-text-tertiary)' }}><path d="M3 4L5 2L7 4M3 6L5 8L7 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function SettingsIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--mk-text-tertiary)' }}><circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M7 1.5V3M7 11V12.5M2.55 3.55L3.5 4.5M10.5 9.5L11.45 10.45M1.5 7H3M11 7H12.5M2.55 10.45L3.5 9.5M10.5 4.5L11.45 3.55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function TeamIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 11.5C1.5 9.5 3 8.5 5 8.5C7 8.5 8.5 9.5 8.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="10" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M9 8.5C11 8.5 12.5 9.3 12.5 10.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function LogoutIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M9 4l3 3-3 3M5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> }
