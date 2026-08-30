'use client'

/* Sidebar Linear-style global — usado por AppShell en toda la app real.
   Refactor del mockup pero conectado a Next router (usePathname + Link). */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MARCAS_NAV, type MarcaNav } from '@/lib/mock-marcas'
import { MarcaLogo } from '@/components/marca-logo'
import { NotificationBell } from './NotificationBell'
import type { Notificacion } from '@/lib/notificaciones/get-notificaciones'
import { tieneAcceso, type Permisos, type ModuloPermiso } from '@/lib/team/types'
import { IsotipoDistinto } from '@/components/brand/isotipo-distinto'

type PermisosSimple = {
  modulos: Permisos
  marcasAcceso: string[] | null
  nombre: string
  rol: string
  /* rolBase ('director' tratado como admin) */
  rolBase?: string
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
  /* Notificaciones urgentes para la campanita (junto al buscador). */
  notificaciones?: Notificacion[]
}

const STORAGE_KEY = 'mk:sidebar:sections'

export function Sidebar({ onOpenPalette, marcas = MARCAS_NAV, permisos, emailActivo, notificaciones = [] }: Props) {
  /* esCEO = sin team_member (admin original) o team_member con rol
     director (caso pedro@agenciadistinto.com). Para items que antes
     eran 'solo admin sin team_member' (!permisos), ahora también
     los ve el director. */
  const esCEO = !permisos || permisos.rolBase === 'director'
  /* Gestión de marcas ("Ver todas" + "Agregar marca"): además del director
     (Pedro) y el owner sin team_member, también el ADMIN — Paolo/Erick es
     admin y se encarga de tareas del sistema, debe poder ver todas las marcas
     y crear una nueva. Los roles operativos (CM/editor/diseñador) NO. */
  const puedeGestionarMarcas =
    !permisos || permisos.rolBase === 'director' || permisos.rolBase === 'admin'

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
          <span style={logoStyle}>
            {/* Isotipo oficial — reemplaza la "D" placeholder con
                gradient que había antes. Pedro quería el icono real
                del manual (mismo que en /login) acá también. */}
            <IsotipoDistinto size={16} />
          </span>
          <span style={{ flex: 1, textAlign: 'left' }}>Distinto</span>
          <ChevronUpDown />
        </button>

        {/* Cmd+K + campanita de notificaciones en una fila */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="mk-focusable"
            onClick={onOpenPalette}
            style={{ ...searchBtnStyle, flex: 1, minWidth: 0 }}
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
            <span style={{ flex: 1, textAlign: 'left' }}>Buscar…</span>
            <span style={{ display: 'flex', gap: 2 }}>
              <span className="mk-kbd">⌘</span>
              <span className="mk-kbd">K</span>
            </span>
          </button>
          <NotificationBell notificaciones={notificaciones} />
        </div>
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
          {/* Inicio: dashboard unificado. Pedro pidió fusionar Cockpit
              con Inicio porque 'es lo mismo'. Para users con métricas
              (admin/director/CM con permiso) el Inicio muestra TODO el
              contenido ejecutivo del Cockpit; para los demás muestra
              versión simple. */}
          <NavItem href="/inicio" icon={<HomeIcon />} label="Inicio" active={isActive('/inicio') || isActive('/cockpit')} shortcut="1" />
          {/* Tareas: tablero personal de cada uno (estilo Notas). Todos lo ven. */}
          <NavItem href="/tareas" icon={<TareasIcon />} label="Tareas" active={isActive('/tareas')} shortcut="T" />
          {/* "Inbox global" eliminado del menú — ya no se usa. Pedro 06-ago-2026. */}
          {puede('publicaciones') && (
            <NavItem href="/publicaciones" icon={<CalendarIcon />} label="Publicaciones"  active={isActive('/publicaciones')} shortcut="3" />
          )}
          {/* Editor: sub-item de Publicaciones SOLO si el user ve Publicaciones.
              Si no (caso Pieer sin override de pubs), aparece como item principal. */}
          {puede('editor') && (
            <NavItem href="/editor"        icon={<EditIcon />}     label="Editor"         active={isActive('/editor')}        indent={puede('publicaciones')} />
          )}
          {/* Diseño: idem — si el user no ve Publicaciones (caso Ailyn),
              Diseño aparece sin indent como módulo principal. */}
          {puede('diseno') && (
            <NavItem href="/diseno"        icon={<PaintIcon />}    label="Diseño"          active={isActive('/diseno')}        indent={puede('publicaciones')} />
          )}
          {/* Grabaciones: parte de publicaciones — mismo permiso */}
          {puede('publicaciones') && (
            <NavItem href="/grabaciones"   icon={<VideoIcon />}    label="Grabaciones"    active={isActive('/grabaciones')}   shortcut="4" />
          )}
          {/* Creación de Ideas: estudio de contenido para creadores (guiones
              virales, banco de ideas, teleprompter…). Visible para todo el equipo. */}
          <NavItem href="/creacion-de-ideas" icon={<SparklesIcon />} label="Creación de Ideas" active={isActive('/creacion-de-ideas')} />
          {/* Fechas importantes — función de Lorena/Erick. Fechas clave del año
              por marca. Solo Lorena y directores (Erick/Pedro). */}
          {(esCEO || permisos?.nombre === 'LORENA') && (
            <NavItem href="/fechas-importantes" icon={<CalendarIcon />} label="Fechas importantes" active={isActive('/fechas-importantes')} />
          )}
          {/* Soporte — cualquiera reporta fallas/pedidos/consultas; Erick los
              resuelve. Visible para TODO el equipo. Pedro 06-ago-2026. */}
          <NavItem href="/soporte" icon={<SoporteIcon />} label="Soporte" active={isActive('/soporte')} />
          {/* Reportes: dashboards mensuales por marca (reemplazan los Excel).
              Ejecutivo → mismo permiso que métricas/cockpit. */}
          {puede('metricas') && (
            <NavItem href="/reportes" icon={<ChartIcon />} label="Reportes" active={isActive('/reportes')} />
          )}
          {/* Influencers: kanban de pedidos a influencers (TypHouse). Mismo
              permiso que publicaciones. Pedro 27-ago-2026. */}
          {puede('publicaciones') && (
            <NavItem href="/influencers" icon={<InfluencerIcon />} label="Influencers" active={isActive('/influencers')} />
          )}
        </Section>

        {/* Sección marcas: controlada por el permiso 'marcas' (nuevo).
            Pedro pidió control independiente para poder dar/quitar
            acceso a la sección "Marcas" sin tocar grilla/publicaciones.
            La lista se filtra por marcasAcceso (los miembros restringidos
            solo ven sus marcas). */}
        {puede('marcas') && marcasVisibles.length > 0 && (
          <Section
            label={`Marcas · ${marcasVisibles.length}`}
            open={openSections.marcas}
            onToggle={() => setOpenSections((s) => ({ ...s, marcas: !s.marcas }))}
          >
            {/* "Ver todas": director/admin/owner */}
            {puedeGestionarMarcas && (
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
                icon={<MarcaLogo slug={m.slug} nombre={m.nombre} emoji={m.emoji} size={20} />}
                label={m.nombreCorto}
                active={isActive(`/grilla/${m.slug}`)}
                /* Sin número al costado: era el conteo de comentarios pendientes,
                   que ya no se usa. Pedro 06-ago-2026. */
              />
            ))}
            {/* "Agregar marca": director/admin/owner */}
            {puedeGestionarMarcas && (
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

        {/* Personal: Mi equipo / Settings tienen su permiso específico.
            Hábitos lo ven TODOS los miembros (cada uno ve sus propios).
            Historial sigue siendo solo del admin/owner. */}
        <Section
          label="Personal"
          open={openSections.personal}
          onToggle={() => setOpenSections((s) => ({ ...s, personal: !s.personal }))}
        >
          {/* Hábitos: cada user tiene los suyos (clonados al crear el
              team_member). Pedro pidió que aparezca para todos. */}
          <NavItem href="/habitos" icon={<CheckIcon />} label="Hábitos" active={isActive('/habitos')} />
          {/* Reporte de actividad: cada miembro ve el suyo; el admin ve a todos. */}
          <NavItem href="/actividad" icon={<NoteIcon />} label="Reporte del día" active={isActive('/actividad')} />
          {/* Historial: admin/CEO (incluye Pedro como director) */}
          {esCEO && (
            <NavItem href="/historial" icon={<NoteIcon />} label="Historial" active={isActive('/historial')} />
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
  /* Container del isotipo. Fondo blanco para que los colores brand
     (amarillo + morado) se vean correctos. Antes era gradient
     morado→lila con "D" en blanco como placeholder. */
  width: 22, height: 22,
  borderRadius: 'var(--mk-radius-sm)',
  background: '#ffffff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
  border: '1px solid var(--mk-border-subtle)',
  boxShadow: '0 0 8px rgba(186, 65, 247, 0.18)',
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
function CalendarIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M2 6H12M5 2V4M9 2V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function VideoIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M9 6L12 4.5V9.5L9 8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> }
function EditIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 1.5L10.5 4L4.5 10H2V7.5L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M7 2.5L9.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
/* PaintIcon: balde de pintura para el módulo de Diseño. Mismo
   viewBox y stroke que los otros sub-items (12x12, 1.2) para que
   visualmente alinee con EditIcon en la lista. */
function PaintIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 1.5L10 5.5L7 8.5L3 4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M3 4.5L1.5 8C1.5 9 2.5 9.5 3 9.5C3.5 9.5 4 9 4 8.5C4 8 3.5 7.5 3 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2.5" y="2.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 7L6.2 8.7L9.5 5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function NoteIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2.5H9L11 4.5V11.5C11 11.78 10.78 12 10.5 12H3.5C3.22 12 3 11.78 3 11.5V3C3 2.72 3.22 2.5 3.5 2.5Z" stroke="currentColor" strokeWidth="1.2" /><path d="M9 2.5V4.5H11M5 7H9M5 9H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function TareasIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5L3 4.5L4.7 2.8M2 8L3 9L4.7 7.3M2 12L3 13L4.7 11.3M6.5 3.5H12M6.5 8H12M6.5 12H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function SparklesIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L8 5L11.5 6L8 7L7 10.5L6 7L2.5 6L6 5L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M11 9.5L11.4 10.6L12.5 11L11.4 11.4L11 12.5L10.6 11.4L9.5 11L10.6 10.6L11 9.5Z" fill="currentColor" /></svg> }
function SoporteIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M3.4 3.4L5.5 5.5M8.5 8.5L10.6 10.6M10.6 3.4L8.5 5.5M5.5 8.5L3.4 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function ChartIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><rect x="3" y="7" width="2" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" /><rect x="6.5" y="4" width="2" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.2" /><rect x="10" y="2" width="2" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.2" /></svg> }
function InfluencerIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M2 11.5C2 9.5 3.5 8.2 5.5 8.2C6.3 8.2 7 8.4 7.6 8.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M10.5 8L11 9.3L12.4 9.4L11.35 10.3L11.7 11.7L10.5 10.95L9.3 11.7L9.65 10.3L8.6 9.4L10 9.3L10.5 8Z" fill="currentColor" /></svg> }
function SearchIcon() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.2" /><path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function ChevronUpDown() { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--mk-text-tertiary)' }}><path d="M3 4L5 2L7 4M3 6L5 8L7 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function SettingsIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--mk-text-tertiary)' }}><circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M7 1.5V3M7 11V12.5M2.55 3.55L3.5 4.5M10.5 9.5L11.45 10.45M1.5 7H3M11 7H12.5M2.55 10.45L3.5 9.5M10.5 4.5L11.45 3.55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function TeamIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 11.5C1.5 9.5 3 8.5 5 8.5C7 8.5 8.5 9.5 8.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="10" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M9 8.5C11 8.5 12.5 9.3 12.5 10.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> }
function LogoutIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M9 4l3 3-3 3M5 7h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> }
