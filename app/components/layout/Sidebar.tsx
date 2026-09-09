'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { MARCAS_NAV, type MarcaNav } from '@/lib/mock-marcas'
import { MarcaLogo } from '@/components/marca-logo'
import { NotificationBell } from './NotificationBell'
import type { Notificacion } from '@/lib/notificaciones/get-notificaciones'
import { tieneAcceso, type Permisos, type ModuloPermiso } from '@/lib/team/types'
import { IsotipoDistinto } from '@/components/brand/isotipo-distinto'
import {
  PlanesIcon,
  HomeIcon,
  CalendarIcon,
  VideoIcon,
  EditIcon,
  PaintIcon,
  CheckIcon,
  NoteIcon,
  TareasIcon,
  NotasReunionesIcon,
  OficinaIcon,
  SparklesIcon,
  SoporteIcon,
  ChartIcon,
  InfluencerIcon,
  SearchIcon,
  ChevronUpDown,
  SettingsIcon,
  TeamIcon,
  LogoutIcon,
} from './sidebar-icons'

import {
  Section,
  NavItem,
  topBtnStyle,
  logoStyle,
  searchBtnStyle,
  userBtnStyle,
  logoutBtnStyle,
  avatarStyle,
} from './sidebar-parts'
type PermisosSimple = {
  modulos: Permisos
  marcasAcceso: string[] | null
  nombre: string
  rol: string
  rolBase?: string
  email: string
  avatarUrl: string | null
} | null
type Props = {
  onOpenPalette: () => void
  marcas?: MarcaNav[]
  permisos?: PermisosSimple
  emailActivo?: string | null
  notificaciones?: Notificacion[]
}
const STORAGE_KEY = 'mk:sidebar:sections'
export function Sidebar({ onOpenPalette, marcas = MARCAS_NAV, permisos, emailActivo, notificaciones = [] }: Props) {
  const esCEO = !permisos || permisos.rolBase === 'director'
  const puedeGestionarMarcas =
    !permisos || permisos.rolBase === 'director' || permisos.rolBase === 'admin'
  const esPedro =
    (emailActivo ?? permisos?.email ?? '').trim().toLowerCase() === 'pedro@agenciadistinto.com'
  const puede = (modulo: ModuloPermiso): boolean => {
    if (!permisos) return true
    return tieneAcceso(permisos.modulos, modulo)
  }
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
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--mk-border-subtle)' }}>
        <button
          className="mk-focusable"
          style={topBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={logoStyle}>
            <IsotipoDistinto size={16} />
          </span>
          <span style={{ flex: 1, textAlign: 'left' }}>Distinto</span>
          <ChevronUpDown />
        </button>
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
          <NavItem href="/inicio" icon={<HomeIcon />} label="Inicio" active={isActive('/inicio') || isActive('/cockpit')} shortcut="1" />
          {esPedro && (
            <NavItem href="/planes" icon={<PlanesIcon />} label="Planes" active={isActive('/planes')} shortcut="P" />
          )}
          <NavItem href="/tareas" icon={<TareasIcon />} label="Tareas" active={isActive('/tareas')} shortcut="T" />
          {puede('publicaciones') && (
            <NavItem href="/publicaciones" icon={<CalendarIcon />} label="Publicaciones"  active={isActive('/publicaciones')} shortcut="3" />
          )}
          {puede('editor') && (
            <NavItem href="/editor"        icon={<EditIcon />}     label="Editor"         active={isActive('/editor')}        indent={puede('publicaciones')} />
          )}
          {puede('diseno') && (
            <NavItem href="/diseno"        icon={<PaintIcon />}    label="Diseño"          active={isActive('/diseno')}        indent={puede('publicaciones')} />
          )}
          {puede('publicaciones') && (
            <NavItem href="/grabaciones/calendario" icon={<VideoIcon />} label="Calendario" active={isActive('/grabaciones')} shortcut="4" />
          )}
          <NavItem href="/creacion-de-ideas" icon={<SparklesIcon />} label="Creación de Ideas" active={isActive('/creacion-de-ideas')} />
          <NavItem href="/oficina" icon={<OficinaIcon />} label="Oficina" active={isActive('/oficina')} shortcut="O" />
          <NavItem href="/notas-reuniones" icon={<NotasReunionesIcon />} label="Notas y reuniones" active={isActive('/notas-reuniones')} />
          <NavItem href="/soporte" icon={<SoporteIcon />} label="Soporte" active={isActive('/soporte')} />
          {puede('metricas') && (
            <NavItem href="/reportes" icon={<ChartIcon />} label="Reportes" active={isActive('/reportes')} />
          )}
          {puede('publicaciones') && marcasVisibles.some((m) => (m as { influencersActivo?: boolean }).influencersActivo) && (
            <NavItem href="/influencers" icon={<InfluencerIcon />} label="Influencers" active={isActive('/influencers')} />
          )}
        </Section>
        {puede('marcas') && marcasVisibles.length > 0 && (
          <Section
            label={`Marcas · ${marcasVisibles.length}`}
            open={openSections.marcas}
            onToggle={() => setOpenSections((s) => ({ ...s, marcas: !s.marcas }))}
          >
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
              />
            ))}
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
        <Section
          label="Personal"
          open={openSections.personal}
          onToggle={() => setOpenSections((s) => ({ ...s, personal: !s.personal }))}
        >
          <NavItem href="/habitos" icon={<CheckIcon />} label="Hábitos" active={isActive('/habitos')} />
          <NavItem href="/actividad" icon={<NoteIcon />} label="Reporte del día" active={isActive('/actividad')} />
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
      <div style={{ padding: 8, borderTop: '1px solid var(--mk-border-subtle)', display: 'flex', gap: 4, alignItems: 'stretch' }}>
        <Link
          href="/perfil"
          className="mk-focusable"
          style={{ ...userBtnStyle, flex: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
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
            <div style={{
              fontSize: 'var(--mk-text-xs)',
              color: 'var(--mk-text-tertiary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {emailActivo ?? (permisos?.email) ?? 'sin sesión'}
            </div>
          </div>
        </Link>
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
