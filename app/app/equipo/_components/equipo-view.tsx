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
  const [nuevoOpen, setNuevoOpen] = useState(false)

  const visibles = useMemo(() => {
    return members.filter((m) => showInactivos || m.activo)
  }, [members, showInactivos])

  const rolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles])

  function handleUpdate(id: string, patch: Partial<TeamMember>) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } as TeamMember : m)))
  }

  function handleCreate(member: TeamMember) {
    setMembers((prev) => [...prev, member])
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px', background: 'var(--mk-bg-base)' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--mk-text-primary)', margin: 0 }}>Mi equipo</h1>
          <p style={{ fontSize: 13, color: 'var(--mk-text-tertiary)', margin: '4px 0 0' }}>
            {visibles.length} {visibles.length === 1 ? 'miembro' : 'miembros'} {showInactivos ? '(incluye inactivos)' : 'activos'}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowInactivos((v) => !v)}
          style={btnSecondaryStyle}
          title="Mostrar también miembros desactivados"
        >
          {showInactivos ? 'Ocultar inactivos' : 'Mostrar inactivos'}
        </button>
        <button
          onClick={() => setNuevoOpen(true)}
          style={btnPrimaryStyle}
        >
          + Nuevo miembro
        </button>
      </header>

      {/* GRID DE CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
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
              onClick={() => setEditando(m)}
            />
          )
        })}
      </div>

      {visibles.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--mk-text-quaternary)' }}>
          No hay miembros para mostrar. Tocá "+ Nuevo miembro" para crear el primero.
        </div>
      )}

      {/* MODAL EDITAR MIEMBRO */}
      {editando && (
        <ModalEditarMiembro
          member={editando}
          roles={roles}
          marcas={marcas}
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
  member, rol, modulosCount, marcasCount, totalMarcas, pubsEnEdicion, onClick,
}: {
  member: TeamMember
  rol: RolPredefinido | undefined
  modulosCount: number
  marcasCount: number
  totalMarcas: number
  pubsEnEdicion: number
  onClick: () => void
}) {
  const inicial = member.nombre.slice(0, 2).toUpperCase()
  const rolColor = rol ? ROL_COLOR[rol.id] : '#737373'
  const cargo = member.cargo_personalizado || rol?.nombre || '—'
  const pendiente = !member.auth_user_id

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 18,
        background: member.activo ? 'var(--mk-bg-elevated)' : 'rgba(0, 0, 0, 0.02)',
        border: '1px solid var(--mk-border-subtle)',
        borderRadius: 'var(--mk-radius-lg)',
        cursor: 'pointer',
        opacity: member.activo ? 1 : 0.6,
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
        fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = rolColor; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--mk-border-subtle)'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 44, height: 44, borderRadius: '50%',
          background: rolColor, color: 'white',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 600,
          boxShadow: `0 0 0 2px ${rolColor}33`,
          flexShrink: 0,
        }}>
          {inicial}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.nombre}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cargo}
          </div>
        </div>
        {pendiente && (
          <span style={{
            fontSize: 9.5, fontWeight: 600,
            padding: '2px 8px',
            background: 'rgba(251, 191, 36, 0.18)', color: '#92400e',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }} title="No aceptó la invitación todavía">
            PENDIENTE
          </span>
        )}
      </div>

      {/* Métricas mini */}
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--mk-text-secondary)' }}>
        <Metric label="Módulos" value={modulosCount.toString()} />
        <Metric label="Marcas" value={marcasCount === totalMarcas ? 'Todas' : marcasCount.toString()} />
        {pubsEnEdicion > 0 && <Metric label="Por editar" value={pubsEnEdicion.toString()} highlight={rolColor} />}
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--mk-text-quaternary)', borderTop: '1px solid var(--mk-border-subtle)', paddingTop: 8 }}>
        {member.email}
      </div>
    </button>
  )
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ fontWeight: 600, color: highlight ?? 'var(--mk-text-primary)' }}>{value}</span>
      <span style={{ color: 'var(--mk-text-quaternary)', fontSize: 10 }}>{label}</span>
    </span>
  )
}

/* ============================================================
   MODAL: Editar miembro existente
   Tabs: Info / Permisos / Seguridad
   ============================================================ */

function ModalEditarMiembro({
  member: original, roles, marcas, onClose, onSaved,
}: {
  member: TeamMember
  roles: RolPredefinido[]
  marcas: MarcaSimple[]
  onClose: () => void
  onSaved: (patch: Partial<TeamMember>) => void
}) {
  const [tab, setTab] = useState<'info' | 'permisos' | 'seguridad'>('info')
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
      <Campo label="Fecha de cumpleaños">
        <input
          type="date"
          value={member.fecha_cumpleanos ?? ''}
          onChange={(e) => onPatch({ fecha_cumpleanos: e.target.value || null })}
          onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch {} }}
          style={{ ...fieldStyle, cursor: 'pointer' }}
        />
      </Campo>
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
  const [linkData, setLinkData] = useState<{ url: string; expiraEn: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function handleInvite() {
    startTransition(async () => {
      const r = await generarLinkInvitacion(member.id)
      if (r.ok) {
        setLinkData({ url: r.url, expiraEn: r.expiraEn })
        toast.success('Link de invitación generado — copialo y pasáselo a la persona')
      } else {
        toast.error(r.error)
      }
    })
  }

  function handleReset() {
    startTransition(async () => {
      const r = await resetearPasswordMiembro(member.id)
      if (r.ok) toast.success('Email de reset enviado')
      else toast.error(r.error)
    })
  }

  const pendiente = !member.auth_user_id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {pendiente && (
        <div style={{ padding: 14, background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: 'var(--mk-radius-md)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Invitación pendiente</div>
          <div style={{ fontSize: 11, color: '#92400e' }}>
            Este miembro aún no aceptó la invitación. Generá un link y pasáselo por WhatsApp o email.
          </div>
        </div>
      )}

      <button onClick={handleInvite} style={btnPrimaryStyle} disabled={pending || !member.activo}>
        {pending ? 'Generando…' : pendiente ? 'Generar link de invitación' : 'Regenerar link de invitación'}
      </button>

      {linkData && (
        <div style={{ padding: 14, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-md)' }}>
          <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', marginBottom: 6 }}>
            Link único, expira el {new Date(linkData.expiraEn).toLocaleDateString('es-PE')}:
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              readOnly
              value={linkData.url}
              onFocus={(e) => e.currentTarget.select()}
              style={{ ...fieldStyle, fontSize: 11, fontFamily: 'monospace' }}
            />
            <button
              onClick={() => { navigator.clipboard.writeText(linkData.url); toast.success('Link copiado') }}
              style={btnSecondaryStyle}
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {!pendiente && (
        <button onClick={handleReset} style={btnSecondaryStyle} disabled={pending}>
          Enviar email de reset de contraseña
        </button>
      )}

      <div style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', lineHeight: 1.6, marginTop: 8 }}>
        El reset de contraseña usa el sistema de Supabase Auth — Supabase envía un email con un link de 1 hora. Si el miembro perdió acceso al email, primero cambiá el email en la tab Información.
        <br />
        <em>Nota: el envío de email automático requiere setup en Fase 2.</em>
      </div>
    </div>
  )
}

/* ============================================================
   MODAL: Crear nuevo miembro (formulario simple)
   ============================================================ */

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
  const [rolBase, setRolBase] = useState<RolPredefinidoId>(roles[0]?.id ?? 'editor')
  const [cargo, setCargo] = useState('')
  const [marcasIds, setMarcasIds] = useState<string[] | null>(null)
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
          avatar_url: null,
          permisos_override: {},
          marcas_acceso: marcasIds,
          editor_legacy_id: null,
          activo: true,
          notas: null,
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
            <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)' }}>Después podés generar un link de invitación</div>
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={iconBtnStyle}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Campo label="Nombre *">
            <input required autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María García" style={fieldStyle} />
          </Campo>
          <Campo label="Email *">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@distinto.com" style={fieldStyle} />
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
