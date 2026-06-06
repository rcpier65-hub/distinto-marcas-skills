'use client'

/* EquipoView — vista Mi Equipo.
   - Grid de cards: 1 por miembro con avatar, nombre, rol, métricas
   - Click en card → modal de edición con tabs: Info / Permisos / Seguridad
   - Botón "+ Invitar miembro" arriba a la derecha
   - Toggle "ver inactivos" para revisar miembros desactivados */

import { useState, useMemo, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import {
  actualizarMiembro,
  crearMiembro,
  generarLinkInvitacion,
  resetearPasswordMiembro,
  setPasswordMiembro,
} from '@/app/equipo/_actions'
import {
  type Permisos,
  type RolPredefinido,
  type RolPredefinidoId,
  type TeamMember,
  type ModuloPermiso,
  mergePermisos,
  resumenPermisos,
  MODULO_LABEL,
  ROL_COLOR,
} from '@/lib/team/types'

type MarcaSimple = { id: string; slug: string; nombre: string; color: string; emoji: string | null }

type Props = {
  members: TeamMember[]
  roles: RolPredefinido[]
  marcas: MarcaSimple[]
  pubsPorEditor: Record<string, number>
}

export function EquipoView({ members: initial, roles, marcas, pubsPorEditor }: Props) {
  const [members, setMembers] = useState(initial)
  const [showInactivos, setShowInactivos] = useState(false)
  const [editando, setEditando] = useState<TeamMember | null>(null)
  const [tabInicial, setTabInicial] = useState<'info' | 'permisos' | 'seguridad'>('info')
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rolFiltro, setRolFiltro] = useState<RolPredefinidoId | 'todos'>('todos')

  const visibles = useMemo(() => {
    return members.filter((m) => {
      if (!showInactivos && !m.activo) return false
      if (rolFiltro !== 'todos' && m.rol_base !== rolFiltro) return false
      if (search) {
        const q = search.toLowerCase()
        const cargo = (m.cargo_personalizado ?? '').toLowerCase()
        if (
          !m.nombre.toLowerCase().includes(q) &&
          !m.email.toLowerCase().includes(q) &&
          !cargo.includes(q)
        ) return false
      }
      return true
    })
  }, [members, showInactivos, rolFiltro, search])

  const rolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles])

  function handleUpdate(id: string, patch: Partial<TeamMember>) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } as TeamMember : m)))
  }

  function handleCreate(member: TeamMember) {
    setMembers((prev) => [...prev, member])
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 40px',
      background: '#fafafa',  /* fondo súper claro fuera de blanco puro para que las cards "floten" */
    }}>
      {/* HEADER */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 600, color: '#111827',
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Mi equipo
            </h1>
            <p style={{ fontSize: 13.5, color: '#6b7280', margin: '4px 0 0', fontWeight: 400 }}>
              {visibles.length} {visibles.length === 1 ? 'miembro' : 'miembros'}
              {showInactivos && ' · incluye inactivos'}
              {(rolFiltro !== 'todos' || search) && ' · filtrados'}
            </p>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setNuevoOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 40, padding: '0 16px',
              background: 'var(--mk-accent, #7170ff)',
              border: '1px solid var(--mk-accent, #7170ff)',
              borderRadius: 10,
              color: '#fff',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(113, 112, 255, 0.30), 0 0 0 1px rgba(113, 112, 255, 0.10)',
              transition: 'all 150ms ease-out',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(113, 112, 255, 0.35)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(113, 112, 255, 0.30), 0 0 0 1px rgba(113, 112, 255, 0.10)' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 2V11M2 6.5H11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Nuevo miembro
          </button>
        </div>

        {/* Toolbar moderna: bordes muy suaves, fondo blanco puro */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: 8, background: '#fff',
          border: '1px solid #f1f1f3',
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o cargo…"
              style={{ ...fieldStyleModern, paddingLeft: 36 }}
            />
          </div>

          {/* Filtro por rol */}
          <select
            value={rolFiltro}
            onChange={(e) => setRolFiltro(e.target.value as RolPredefinidoId | 'todos')}
            style={{ ...fieldStyleModern, width: 'auto', minWidth: 170, cursor: 'pointer' }}
          >
            <option value="todos">Todos los roles</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>

          {/* Toggle inactivos */}
          <button
            onClick={() => setShowInactivos((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 36, padding: '0 12px',
              background: showInactivos ? '#eef2ff' : '#fff',
              border: `1px solid ${showInactivos ? '#c7d2fe' : '#e5e7eb'}`,
              borderRadius: 8,
              color: showInactivos ? '#4338ca' : '#374151',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            {showInactivos ? '✓ ' : ''}Inactivos
          </button>
        </div>
      </header>

      {/* GRID DE CARDS — cards más anchas (320px min) para que respiren */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20,
      }}>
        {visibles.map((m) => {
          const rol = rolesById.get(m.rol_base)
          const permisos = mergePermisos(rol?.permisos_default ?? {}, m.permisos_override)
          const resumen = resumenPermisos(permisos)
          const pubsEnEdicion = m.editor_legacy_id ? (pubsPorEditor[m.editor_legacy_id] ?? 0) : 0
          return (
            <MemberCard
              key={m.id}
              member={m}
              rol={rol}
              modulosCount={resumen.modulosAccesibles.length}
              marcasCount={m.marcas_acceso === null ? marcas.length : m.marcas_acceso.length}
              totalMarcas={marcas.length}
              pubsEnEdicion={pubsEnEdicion}
              onOpen={(tab) => { setTabInicial(tab); setEditando(m) }}
            />
          )
        })}
      </div>

      {visibles.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--mk-text-quaternary)' }}>
          No hay miembros para mostrar. Toca "+ Nuevo miembro" para crear el primero.
        </div>
      )}

      {/* MODAL EDITAR MIEMBRO */}
      {editando && (
        <ModalEditarMiembro
          member={editando}
          roles={roles}
          marcas={marcas}
          tabInicial={tabInicial}
          onClose={() => setEditando(null)}
          onSaved={(patch) => {
            handleUpdate(editando.id, patch)
            setEditando(null)
          }}
        />
      )}

      {/* MODAL NUEVO MIEMBRO */}
      {nuevoOpen && (
        <ModalNuevoMiembro
          roles={roles}
          marcas={marcas}
          onClose={() => setNuevoOpen(false)}
          onCreated={(m) => {
            handleCreate(m)
            setNuevoOpen(false)
            setEditando(m)  /* abrir el editor inmediatamente */
          }}
        />
      )}
    </div>
  )
}

/* ============================================================
   Card de un miembro
   ============================================================ */

function MemberCard({
  member, rol, modulosCount, marcasCount, totalMarcas, pubsEnEdicion, onOpen,
}: {
  member: TeamMember
  rol: RolPredefinido | undefined
  modulosCount: number
  marcasCount: number
  totalMarcas: number
  pubsEnEdicion: number
  onOpen: (tab: 'info' | 'permisos' | 'seguridad') => void
}) {
  const inicial = member.nombre.slice(0, 2).toUpperCase()
  const rolColor = rol ? ROL_COLOR[rol.id] : '#737373'
  const cargo = member.cargo_personalizado || rol?.nombre || '—'

  /* Estado del miembro — pill con dot tipo Linear/Notion. Pendiente
     usa morado pastel (#ede9fe / #6d28d9) en línea con el branding
     Distinto en lugar del amarillo/naranja anterior. */
  const estado: { label: string; color: string; bg: string; dot: string } = !member.activo
    ? { label: 'Inactivo', color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' }
    : !member.auth_user_id
      ? { label: 'Pendiente', color: '#6d28d9', bg: '#ede9fe', dot: '#8b5cf6' }
      : { label: 'Activo', color: '#15803d', bg: '#dcfce7', dot: '#22c55e' }

  const fechaIngreso = new Date(member.created_at).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const cumple = member.fecha_cumpleanos
    ? new Date(member.fecha_cumpleanos + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
    : null

  return (
    <div
      style={{
        padding: 24,
        background: '#fff',
        border: '1px solid #f1f1f3',
        borderRadius: 16,
        opacity: member.activo ? 1 : 0.65,
        transition: 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb'
        e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(16, 24, 40, 0.08), 0 4px 8px -4px rgba(16, 24, 40, 0.04)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#f1f1f3'
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(16, 24, 40, 0.04)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* HEADER: estado pill arriba derecha. No banda colorida — más limpio. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 22 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 500,
          padding: '3px 9px 3px 7px',
          background: estado.bg, color: estado.color,
          borderRadius: 999,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: estado.dot }} />
          {estado.label}
        </span>
      </div>

      {/* AVATAR + Nombre + cargo — disposición horizontal centrada.
          Si el miembro subió una foto (member.avatar_url), la usamos.
          Si no, mostramos las iniciales con el color del rol. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: -8 }}>
        <span style={{
          width: 56, height: 56, borderRadius: '50%',
          background: member.avatar_url
            ? `url(${member.avatar_url}) center/cover`
            : rolColor,
          color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 600,
          flexShrink: 0,
          letterSpacing: '-0.01em',
        }}>
          {!member.avatar_url && inicial}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, color: '#111827',
            letterSpacing: '-0.01em', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {member.nombre}
          </div>
          <div style={{
            fontSize: 13, color: '#6b7280', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {cargo}
          </div>
        </div>
      </div>

      {/* Separador sutil — solo línea horizontal limpia */}
      <div style={{ height: 1, background: '#f3f4f6' }} />

      {/* Grid 2 columnas con labels uppercase pequeñas y valores normales.
          Estilo "data label" típico de dashboards modernos. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Rol base" value={rol?.nombre ?? member.rol_base} />
        <Field label="Ingreso" value={fechaIngreso} />
      </div>

      {/* Contacto: email + (cumpleaños si hay). SVG icons consistentes,
          sin emojis. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ContactLine
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2 4L7 7.5L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          }
          value={member.email}
          muted={member.email.endsWith('@pendiente.local')}
        />
        {cumple && (
          <ContactLine
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="5" width="11" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 3V5M10 3V5M1.5 7.5H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            }
            value={`Cumple ${cumple}`}
          />
        )}
        <ContactLine
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 6.5h2.5L7 4.5l1.5 2H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          }
          value={`${modulosCount} módulos · ${marcasCount === totalMarcas ? 'todas las marcas' : `${marcasCount} marcas`}${pubsEnEdicion > 0 ? ` · ${pubsEnEdicion} por editar` : ''}`}
        />
      </div>

      {/* Botones inferiores: outline + filled. Más anchos, border-radius
          mayor, estilo "pill button" moderno. */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onOpen('info')}
          style={{
            flex: 1, height: 38, padding: '0 14px',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            color: '#374151',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease-out',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2.5 10.5L9.5 3.5L11 5L4 12H2.5V10.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          Editar
        </button>
        <button
          onClick={() => onOpen('seguridad')}
          style={{
            flex: 1, height: 38, padding: '0 14px',
            background: rolColor,
            border: `1px solid ${rolColor}`,
            borderRadius: 10,
            color: '#fff',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease-out',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="3" y="6" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4.5 6V4.5C4.5 3 5.5 2 6.5 2C7.5 2 8.5 3 8.5 4.5V6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          Acceso
        </button>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 13.5, color: '#111827', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '-0.005em',
      }}>
        {value}
      </div>
    </div>
  )
}

function ContactLine({ icon, value, muted }: { icon: React.ReactNode; value: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
      <span style={{
        color: muted ? '#d1d5db' : '#9ca3af',
        flexShrink: 0,
        display: 'inline-flex',
      }}>
        {icon}
      </span>
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: muted ? '#9ca3af' : '#4b5563',
        fontStyle: muted ? 'italic' : 'normal',
        fontSize: 13,
      }}>
        {value}
      </span>
    </div>
  )
}

/* ============================================================
   MODAL: Editar miembro existente
   Tabs: Info / Permisos / Seguridad
   ============================================================ */

function ModalEditarMiembro({
  member: original, roles, marcas, tabInicial = 'info', onClose, onSaved,
}: {
  member: TeamMember
  roles: RolPredefinido[]
  marcas: MarcaSimple[]
  tabInicial?: 'info' | 'permisos' | 'seguridad'
  onClose: () => void
  onSaved: (patch: Partial<TeamMember>) => void
}) {
  const [tab, setTab] = useState<'info' | 'permisos' | 'seguridad'>(tabInicial)
  const [member, setMember] = useState<TeamMember>(original)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, saving])

  function patchLocal(p: Partial<TeamMember>) {
    setMember((m) => ({ ...m, ...p }))
  }

  async function handleSave() {
    startSaving(async () => {
      const r = await actualizarMiembro(member.id, {
        nombre: member.nombre,
        email: member.email,
        rol_base: member.rol_base,
        cargo_personalizado: member.cargo_personalizado,
        fecha_cumpleanos: member.fecha_cumpleanos,
        fecha_pago: member.fecha_pago,
        permisos_override: member.permisos_override,
        marcas_acceso: member.marcas_acceso,
        notas: member.notas,
        activo: member.activo,
      })
      if (r.ok) {
        toast.success('Cambios guardados')
        onSaved(member)
      } else {
        toast.error(r.error)
      }
    })
  }

  const rolBase = roles.find((r) => r.id === member.rol_base)

  return (
    <div
      onClick={onClose}
      style={modalBackdropStyle}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={modalCardStyle}
      >
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mk-text-primary)' }}>{member.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)' }}>{member.email}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={iconBtnStyle}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--mk-border-subtle)', paddingLeft: 8 }}>
          <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>Información</TabBtn>
          <TabBtn active={tab === 'permisos'} onClick={() => setTab('permisos')}>Permisos</TabBtn>
          <TabBtn active={tab === 'seguridad'} onClick={() => setTab('seguridad')}>Seguridad</TabBtn>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tab === 'info' && (
            <TabInfo
              member={member}
              roles={roles}
              onPatch={patchLocal}
            />
          )}
          {tab === 'permisos' && (
            <TabPermisos
              member={member}
              rolBase={rolBase}
              marcas={marcas}
              onPatch={patchLocal}
            />
          )}
          {tab === 'seguridad' && (
            <TabSeguridad
              member={member}
              onPatch={patchLocal}
            />
          )}
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          <button onClick={onClose} style={btnSecondaryStyle} disabled={saving}>Cancelar</button>
          <button onClick={handleSave} style={btnPrimaryStyle} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Tab Info: nombre, email, rol, cargo, cumpleaños, notas, activo
   ============================================================ */

function TabInfo({
  member, roles, onPatch,
}: {
  member: TeamMember
  roles: RolPredefinido[]
  onPatch: (p: Partial<TeamMember>) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Campo label="Nombre">
        <input value={member.nombre} onChange={(e) => onPatch({ nombre: e.target.value })} style={fieldStyle} />
      </Campo>
      <Campo label="Email">
        <input type="email" value={member.email} onChange={(e) => onPatch({ email: e.target.value })} style={fieldStyle} />
      </Campo>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Campo label="Rol base">
          <select
            value={member.rol_base}
            onChange={(e) => onPatch({ rol_base: e.target.value as RolPredefinidoId })}
            style={fieldStyle}
          >
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Cargo personalizado">
          <input
            value={member.cargo_personalizado ?? ''}
            onChange={(e) => onPatch({ cargo_personalizado: e.target.value || null })}
            placeholder="Ej. Editor de Reels"
            style={fieldStyle}
          />
        </Campo>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Campo label="Fecha de cumpleaños">
          <input
            type="date"
            value={member.fecha_cumpleanos ?? ''}
            onChange={(e) => onPatch({ fecha_cumpleanos: e.target.value || null })}
            onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch {} }}
            style={{ ...fieldStyle, cursor: 'pointer' }}
          />
        </Campo>
        <Campo label="Fecha de pago">
          <input
            type="date"
            value={member.fecha_pago ?? ''}
            onChange={(e) => onPatch({ fecha_pago: e.target.value || null })}
            onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch {} }}
            style={{ ...fieldStyle, cursor: 'pointer' }}
          />
        </Campo>
      </div>
      <Campo label="Notas internas">
        <textarea
          value={member.notas ?? ''}
          onChange={(e) => onPatch({ notas: e.target.value || null })}
          placeholder="Visible solo para vos"
          rows={3}
          style={{ ...fieldStyle, height: 'auto', padding: 10, resize: 'vertical' }}
        />
      </Campo>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mk-text-secondary)' }}>
        <input
          type="checkbox"
          checked={member.activo}
          onChange={(e) => onPatch({ activo: e.target.checked })}
        />
        Miembro activo
        <span style={{ fontSize: 11, color: 'var(--mk-text-quaternary)' }}>
          (los inactivos no pueden iniciar sesión)
        </span>
      </label>
    </div>
  )
}

/* ============================================================
   Tab Permisos: rol base + override granular + marcas
   ============================================================ */

const MODULO_OPCIONES: Record<ModuloPermiso, { acceso: string; extras?: { key: string; label: string }[] }> = {
  inbox:        { acceso: 'Ver Inbox global' },
  publicaciones:{ acceso: 'Ver Publicaciones', extras: [
                    { key: 'puede_crear', label: 'Puede crear nuevas' },
                    { key: 'puede_editar', label: 'Puede editar existentes' },
                    { key: 'puede_borrar', label: 'Puede borrar' },
                  ] },
  editor:       { acceso: 'Acceder al módulo Editor', extras: [
                    { key: 'solo_propias', label: 'Solo ve tareas asignadas a su nombre' },
                  ] },
  diseno:       { acceso: 'Acceder al módulo Diseño' },
  grilla:       { acceso: 'Ver Grilla semanal', extras: [
                    { key: 'puede_enviar', label: 'Puede enviar grilla por WhatsApp' },
                  ] },
  comentarios:  { acceso: 'Ver Comentarios', extras: [
                    { key: 'puede_responder', label: 'Puede aprobar / responder' },
                  ] },
  metricas:     { acceso: 'Ver Métricas' },
  settings:     { acceso: 'Ver Configuración' },
  equipo:       { acceso: 'Ver Mi equipo', extras: [
                    { key: 'puede_invitar', label: 'Puede invitar nuevos miembros' },
                    { key: 'puede_resetear_passwords', label: 'Puede resetear contraseñas' },
                  ] },
  finanzas:     { acceso: 'Ver Finanzas' },
}

function TabPermisos({
  member, rolBase, marcas, onPatch,
}: {
  member: TeamMember
  rolBase: RolPredefinido | undefined
  marcas: MarcaSimple[]
  onPatch: (p: Partial<TeamMember>) => void
}) {
  /* Permisos efectivos para mostrar checkbox states (rol + override) */
  const efectivos = mergePermisos(rolBase?.permisos_default ?? {}, member.permisos_override)

  function toggle(mod: ModuloPermiso, key: string, value: boolean) {
    const base = rolBase?.permisos_default?.[mod] ?? {}
    const baseValue = (base as Record<string, unknown>)[key]
    const next = { ...member.permisos_override }
    /* Si el valor coincide con el rol base, removemos la clave del
       override (mantiene sparse). */
    if (value === baseValue) {
      const modOverride = { ...(next[mod] ?? {}) } as Record<string, unknown>
      delete modOverride[key]
      if (Object.keys(modOverride).length === 0) {
        delete next[mod]
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next[mod] = modOverride as any
      }
    } else {
      next[mod] = { ...(next[mod] ?? {}), [key]: value }
    }
    onPatch({ permisos_override: next })
  }

  function toggleMarca(marcaId: string) {
    const actual = member.marcas_acceso
    let next: string[] | null
    if (actual === null) {
      /* Si tenía todas y desmarcamos una → array con todas menos esa */
      next = marcas.filter((m) => m.id !== marcaId).map((m) => m.id)
    } else if (actual.includes(marcaId)) {
      next = actual.filter((id) => id !== marcaId)
    } else {
      const sorted = [...actual, marcaId]
      /* Si quedan todas marcadas → volvemos a null (todas) */
      next = sorted.length === marcas.length ? null : sorted
    }
    onPatch({ marcas_acceso: next })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Acceso a módulos */}
      <section>
        <h3 style={sectionTitleStyle}>Acceso a módulos</h3>
        <p style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', margin: '0 0 12px' }}>
          Los valores que difieren del rol base "{rolBase?.nombre ?? '—'}" se guardan como override individual.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(Object.keys(MODULO_OPCIONES) as ModuloPermiso[]).map((mod) => {
            const opts = MODULO_OPCIONES[mod]
            const efectivo = efectivos[mod] ?? {}
            const tieneAccesoEfectivo = !!(efectivo as { acceso?: boolean }).acceso
            return (
              <div key={mod} style={{
                padding: 12,
                background: tieneAccesoEfectivo ? 'var(--mk-accent-bg)' : 'rgba(0, 0, 0, 0.015)',
                border: '1px solid var(--mk-border-subtle)',
                borderRadius: 'var(--mk-radius-md)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--mk-text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={tieneAccesoEfectivo}
                    onChange={(e) => toggle(mod, 'acceso', e.target.checked)}
                  />
                  <span>{MODULO_LABEL[mod]}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--mk-text-tertiary)', fontWeight: 400 }}>
                    — {opts.acceso}
                  </span>
                </label>
                {tieneAccesoEfectivo && opts.extras && (
                  <div style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {opts.extras.map((ex) => (
                      <label key={ex.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mk-text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!(efectivo as Record<string, unknown>)[ex.key]}
                          onChange={(e) => toggle(mod, ex.key, e.target.checked)}
                        />
                        {ex.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Marcas */}
      <section>
        <h3 style={sectionTitleStyle}>Acceso por marca</h3>
        <p style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', margin: '0 0 12px' }}>
          Si no seleccionás ninguna, el miembro NO podrá ver datos de ninguna marca. Por defecto se le da acceso a todas.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {marcas.map((m) => {
            const seleccionada = member.marcas_acceso === null || member.marcas_acceso.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleMarca(m.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: seleccionada ? m.color + '22' : 'rgba(0, 0, 0, 0.04)',
                  border: `1px solid ${seleccionada ? m.color : 'var(--mk-border-subtle)'}`,
                  borderRadius: 999,
                  fontSize: 12, fontWeight: 500,
                  color: seleccionada ? m.color : 'var(--mk-text-tertiary)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
                }}
              >
                {m.emoji && <span>{m.emoji}</span>}
                <span>{m.nombre}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/* ============================================================
   Tab Seguridad: invitar / link de invitación / resetear password
   ============================================================ */

function TabSeguridad({
  member, onPatch,
}: {
  member: TeamMember
  onPatch: (p: Partial<TeamMember>) => void
}) {
  /* Pedro pidió tener control directo de la contraseña:
     - Asignar / cambiar manualmente o generar random
     - Ver la contraseña en plano (ojo show/hide) para copiarla
     - Un botón "Copiar credenciales" que arma usuario + pass + link
       de login listo para pegar en WhatsApp */
  const [password, setPassword] = useState(member.password_inicial ?? '')
  const [show, setShow] = useState(false)
  const [pending, startTransition] = useTransition()
  const dirty = password !== (member.password_inicial ?? '')
  const tieneAcceso = !!member.auth_user_id && !!member.password_inicial

  /* URL canónica de la app — hardcoded para que el link siempre apunte
     a producción y no a un deploy preview con hash. */
  const APP_URL = 'https://distinto-app.vercel.app'

  function generarRandom() {
    /* Mismo charset pronunciable que el server. 12 chars. */
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const arr = new Uint8Array(12)
    crypto.getRandomValues(arr)
    setPassword(Array.from(arr).map((b) => chars[b % chars.length]).join(''))
    setShow(true)
  }

  function handleGuardar() {
    if (!password || password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    startTransition(async () => {
      const r = await setPasswordMiembro(member.id, password)
      if (r.ok) {
        onPatch({ password_inicial: password, auth_user_id: member.auth_user_id ?? 'pendiente-refresh' })
        toast.success('Contraseña guardada — ya puede iniciar sesión')
      } else {
        toast.error(r.error)
      }
    })
  }

  function handleResetRandom() {
    startTransition(async () => {
      const r = await resetearPasswordMiembro(member.id)
      if ('nuevaPassword' in r) {
        setPassword(r.nuevaPassword)
        setShow(true)
        onPatch({ password_inicial: r.nuevaPassword })
        toast.success('Contraseña reseteada')
      } else {
        toast.error(r.error)
      }
    })
  }

  /* Detecta primer nombre para personalizar y el género del saludo.
     Nombres terminados en a/á se tratan como femenino, el resto
     masculino. Para casos raros (Joshua, José) usa neutro. */
  function generarMensaje(): string {
    const primerNombre = member.nombre.split(/[\s\-]/)[0]
    const capitalizado = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase()
    const ultimo = capitalizado.slice(-1).toLowerCase()
    let bienvenida = 'Bienvenid@'
    if (ultimo === 'a' || ultimo === 'á') bienvenida = 'Bienvenida'
    else if (ultimo === 'o' || ultimo === 'ó' || /[bcdfghjklmnprstvxyz]/i.test(ultimo)) bienvenida = 'Bienvenido'

    return `¡Hola ${capitalizado}! 👋

${bienvenida} a tu nueva casa de trabajo en Distinto Agencia. 🎉
Acabo de crear tu acceso al sistema, te dejo los datos abajo:

🔗 Entra aquí:
${APP_URL}/login

📧 Email:
${member.email}

🔑 Contraseña:
${password}

Cuando entres puedes cambiarla por una tuya. Cualquier cosa, escríbeme por aquí.

— Pedro`
  }

  function copiarInvitacion() {
    if (!password) {
      toast.error('Primero asigna y guarda una contraseña')
      return
    }
    navigator.clipboard.writeText(generarMensaje())
    toast.success('Mensaje de invitación copiado — pegalo en WhatsApp')
  }

  function copiarSoloPassword() {
    if (!password) return
    navigator.clipboard.writeText(password)
    toast.success('Contraseña copiada')
  }

  /* Solo bloqueamos casos extremos: email vacío o malformado.
     @pendiente.local ya no existe en BD (lo limpié en mantenimiento). */
  const emailPlaceholder = !member.email || !member.email.includes('@')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {emailPlaceholder && (
        <div style={{
          padding: 14,
          background: '#f5f3ff',
          border: '1px solid #ddd6fe',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6d28d9', marginBottom: 4 }}>⚠ Email placeholder</div>
          <div style={{ fontSize: 11.5, color: '#5b21b6', lineHeight: 1.5 }}>
            Antes de asignar contraseña cambia el email <code style={{ background: 'rgba(139, 92, 246, 0.12)', padding: '1px 5px', borderRadius: 4 }}>{member.email}</code> al real en la tab Información.
          </div>
        </div>
      )}

      <section>
        <h3 style={sectionTitleStyle}>Contraseña del miembro</h3>
        <p style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', margin: '0 0 12px' }}>
          Tú asignas la contraseña y se la pasas al miembro por WhatsApp. Queda guardada aquí para que la puedas copiar cuando la necesites.
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ej. CasaAzul2026 — o toca Generar"
            style={{ ...fieldStyle, fontFamily: show ? 'monospace' : 'inherit', flex: 1 }}
            disabled={pending}
          />
          <button
            onClick={() => setShow((s) => !s)}
            style={btnSecondaryStyle}
            title={show ? 'Ocultar' : 'Mostrar'}
            type="button"
          >
            {show ? '🙈' : '👁'}
          </button>
          <button
            onClick={copiarSoloPassword}
            style={btnSecondaryStyle}
            disabled={!password}
            title="Copiar solo la contraseña"
            type="button"
          >
            📋
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={generarRandom} style={btnSecondaryStyle} disabled={pending} type="button">
            🎲 Generar
          </button>
          <button onClick={handleGuardar} style={btnPrimaryStyle} disabled={pending || !dirty} type="button">
            {pending ? 'Guardando…' : tieneAcceso ? 'Actualizar contraseña' : 'Crear cuenta y activar'}
          </button>
          {tieneAcceso && (
            <button onClick={handleResetRandom} style={btnSecondaryStyle} disabled={pending} type="button">
              Resetear al azar
            </button>
          )}
        </div>
      </section>

      {password && (
        <section style={{
          padding: 16,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        }}>
          <h3 style={{ ...sectionTitleStyle, margin: '0 0 4px' }}>📨 Invitación lista para enviar</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px', lineHeight: 1.5 }}>
            Mensaje de bienvenida personalizado con el link, email y contraseña. Toca copiar y pega en WhatsApp.
          </p>

          {/* Preview del mensaje siempre visible — Pedro quiere ver
              cómo queda antes de copiar. */}
          <pre style={{
            margin: '0 0 12px', padding: 14,
            background: '#fafafa',
            border: '1px solid #f1f1f3',
            borderRadius: 10,
            fontSize: 12.5, fontFamily: 'inherit',
            color: '#374151', lineHeight: 1.55,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 260, overflow: 'auto',
          }}>{generarMensaje()}</pre>

          <button
            onClick={copiarInvitacion}
            disabled={!tieneAcceso}
            style={{
              width: '100%', height: 44,
              background: tieneAcceso ? '#7170ff' : '#e5e7eb',
              border: `1px solid ${tieneAcceso ? '#7170ff' : '#e5e7eb'}`,
              borderRadius: 10,
              color: tieneAcceso ? '#fff' : '#9ca3af',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              cursor: tieneAcceso ? 'pointer' : 'not-allowed',
              boxShadow: tieneAcceso ? '0 1px 3px rgba(113, 112, 255, 0.30)' : 'none',
              transition: 'all 150ms ease-out',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            type="button"
            onMouseEnter={(e) => { if (tieneAcceso) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(113, 112, 255, 0.35)' } }}
            onMouseLeave={(e) => { if (tieneAcceso) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(113, 112, 255, 0.30)' } }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 10V3.5a.5.5 0 01.5-.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {tieneAcceso ? 'Copiar mensaje de invitación' : 'Primero creá la cuenta para copiar'}
          </button>

          {!tieneAcceso && (
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0', textAlign: 'center', fontStyle: 'italic' }}>
              Toca "Crear cuenta y activar" arriba antes de copiar.
            </p>
          )}
        </section>
      )}

      <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6, marginTop: 4 }}>
        El miembro entra a <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 10.5 }}>{APP_URL}/login</code>, escribe email + contraseña y queda dentro. Puedes volver aquí cuando necesites copiar el mensaje otra vez.
      </div>
    </div>
  )
}

/* ============================================================
   MODAL: Crear nuevo miembro (formulario simple)
   ============================================================ */

/* Convierte un nombre en un email del dominio agencia.
   Toma solo el primer nombre, quita tildes, espacios y caracteres
   especiales. "José Luis" → "jose@agenciadistinto.com" */
function nombreAEmail(nombre: string): string {
  const primero = nombre.trim().split(/\s+/)[0] ?? ''
  const normalizado = primero
    .normalize('NFD')                  // separa diacríticos
    .replace(/[̀-ͯ]/g, '')  // los quita
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')        // solo alfanumérico
  return normalizado ? `${normalizado}@agenciadistinto.com` : ''
}

function ModalNuevoMiembro({
  roles, marcas, onClose, onCreated,
}: {
  roles: RolPredefinido[]
  marcas: MarcaSimple[]
  onClose: () => void
  onCreated: (m: TeamMember) => void
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  /* El email se auto-completa según el nombre mientras Pedro no lo
     haya editado manualmente. Si lo edita, el flag queda en true y
     dejamos de auto-sincronizar para respetar su elección.
     Si vacía el email, el flag se resetea y vuelve a auto-completar. */
  const [emailEditadoManual, setEmailEditadoManual] = useState(false)
  const [rolBase, setRolBase] = useState<RolPredefinidoId>(roles[0]?.id ?? 'editor')
  const [cargo, setCargo] = useState('')
  const [marcasIds, setMarcasIds] = useState<string[] | null>(null)
  const [saving, startSaving] = useTransition()

  /* Auto-sync nombre → email cuando aún no fue editado a mano */
  function handleNombreChange(nuevo: string) {
    setNombre(nuevo)
    if (!emailEditadoManual) {
      setEmail(nombreAEmail(nuevo))
    }
  }

  function handleEmailChange(nuevo: string) {
    setEmail(nuevo)
    /* Si el campo queda vacío, vuelve a modo auto-sync. Si el usuario
       lo borra todo y empieza a escribir el nombre de nuevo, el email
       sigue al nombre. */
    if (nuevo === '') setEmailEditadoManual(false)
    else setEmailEditadoManual(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, saving])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !email.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    startSaving(async () => {
      const r = await crearMiembro({
        nombre: nombre.trim(),
        email: email.trim(),
        rol_base: rolBase,
        cargo_personalizado: cargo.trim() || null,
        marcas_acceso: marcasIds,
      })
      if (r.ok) {
        const newMember: TeamMember = {
          id: r.id,
          auth_user_id: null,
          email: email.trim().toLowerCase(),
          nombre: nombre.trim(),
          rol_base: rolBase,
          cargo_personalizado: cargo.trim() || null,
          fecha_cumpleanos: null,
          fecha_pago: null,
          avatar_url: null,
          permisos_override: {},
          marcas_acceso: marcasIds,
          editor_legacy_id: null,
          activo: true,
          notas: null,
          password_inicial: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        onCreated(newMember)
      } else {
        toast.error(r.error)
      }
    })
  }

  function toggleMarca(id: string) {
    if (marcasIds === null) {
      setMarcasIds(marcas.filter((m) => m.id !== id).map((m) => m.id))
    } else if (marcasIds.includes(id)) {
      setMarcasIds(marcasIds.filter((m) => m !== id))
    } else {
      const nxt = [...marcasIds, id]
      setMarcasIds(nxt.length === marcas.length ? null : nxt)
    }
  }

  return (
    <div onClick={onClose} style={modalBackdropStyle}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} style={{ ...modalCardStyle, maxWidth: 560 }}>
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mk-text-primary)' }}>Nuevo miembro</div>
            <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)' }}>Después puedes generar un link de invitación</div>
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={iconBtnStyle}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Nombre *">
            <input
              required
              autoFocus
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              placeholder="Ej. María García"
              style={fieldStyle}
            />
          </Campo>
          <Campo label="Email *">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="maria@agenciadistinto.com"
              style={fieldStyle}
            />
            {nombre && !emailEditadoManual && (
              <span style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 2 }}>
                Se auto-completa según el nombre. Edítalo si necesitas otro.
              </span>
            )}
          </Campo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Campo label="Rol base">
              <select value={rolBase} onChange={(e) => setRolBase(e.target.value as RolPredefinidoId)} style={fieldStyle}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Cargo personalizado">
              <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Opcional" style={fieldStyle} />
            </Campo>
          </div>
          <Campo label="Acceso a marcas">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {marcas.map((m) => {
                const selected = marcasIds === null || marcasIds.includes(m.id)
                return (
                  <button
                    key={m.id} type="button" onClick={() => toggleMarca(m.id)}
                    style={{
                      padding: '4px 10px', fontSize: 11.5, fontFamily: 'inherit',
                      background: selected ? m.color + '22' : 'rgba(0, 0, 0, 0.04)',
                      border: `1px solid ${selected ? m.color : 'var(--mk-border-subtle)'}`,
                      borderRadius: 999, color: selected ? m.color : 'var(--mk-text-tertiary)',
                      cursor: 'pointer',
                    }}
                  >
                    {m.emoji} {m.nombre}
                  </button>
                )
              })}
            </div>
          </Campo>
        </div>

        <div style={modalFooterStyle}>
          <button type="button" onClick={onClose} style={btnSecondaryStyle} disabled={saving}>Cancelar</button>
          <button type="submit" style={btnPrimaryStyle} disabled={saving}>
            {saving ? 'Creando…' : 'Crear miembro'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ============================================================
   Componentes UI auxiliares + estilos
   ============================================================ */

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--mk-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)' }}>{label}</span>
      {children}
    </label>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px',
        background: 'transparent', border: 'none',
        borderBottom: `2px solid ${active ? 'var(--mk-accent)' : 'transparent'}`,
        color: active ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)',
        fontSize: 12, fontWeight: active ? 600 : 500,
        cursor: 'pointer', fontFamily: 'inherit',
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  )
}

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modalCardStyle: React.CSSProperties = {
  background: 'var(--mk-bg-elevated)',
  border: '1px solid var(--mk-border-default)',
  borderRadius: 'var(--mk-radius-xl)',
  boxShadow: 'var(--mk-shadow-lg)',
  width: '100%', maxWidth: 680, maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
}
const modalHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--mk-border-subtle)',
  display: 'flex', alignItems: 'center', gap: 12,
}
const modalFooterStyle: React.CSSProperties = {
  padding: '12px 20px',
  borderTop: '1px solid var(--mk-border-subtle)',
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  background: 'rgba(0, 0, 0, 0.015)',
}
const iconBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 'var(--mk-radius-sm)',
  background: 'transparent', border: 'none',
  color: 'var(--mk-text-tertiary)', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14,
}
const fieldStyle: React.CSSProperties = {
  height: 38, padding: '0 10px',
  background: 'var(--mk-bg-base)',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-primary)',
  fontFamily: 'inherit', fontSize: 13,
  outline: 'none', width: '100%',
}
/* Input style moderno para la toolbar — más limpio que fieldStyle del
   sistema. Border más sutil, focus ring suave. */
const fieldStyleModern: React.CSSProperties = {
  height: 36, padding: '0 12px',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  color: '#111827',
  fontFamily: 'inherit', fontSize: 13,
  outline: 'none', width: '100%',
}
const btnPrimaryStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: 'var(--mk-accent)', border: '1px solid var(--mk-accent)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
}
const btnSecondaryStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent', border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-secondary)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
}
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: 'var(--mk-tracking-caps)', color: 'var(--mk-text-tertiary)',
  margin: '0 0 8px',
}
