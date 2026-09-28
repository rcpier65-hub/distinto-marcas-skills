'use client'

/* PerfilForm — formulario de edición del perfil personal.
   - Avatar circular grande arriba, click → file input
   - Campos: nombre, cargo personalizado, cumpleaños, fecha de pago
   - Email y rol read-only (los gestiona Pedro desde /equipo)
   - Cambios se persisten con server action actualizarMiPerfil */

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { actualizarMiPerfil, subirAvatar } from '../_actions'
import type { TeamMember } from '@/lib/team/types'

type Props = {
  member: TeamMember
  rolNombre: string
}

export function PerfilForm({ member: initial, rolNombre }: Props) {
  const router = useRouter()
  const [member, setMember] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dirty =
    member.nombre !== initial.nombre ||
    member.cargo_personalizado !== initial.cargo_personalizado ||
    member.fecha_cumpleanos !== initial.fecha_cumpleanos ||
    member.fecha_pago !== initial.fecha_pago ||
    member.avatar_url !== initial.avatar_url

  function patch<K extends keyof TeamMember>(key: K, value: TeamMember[K]) {
    setMember((m) => ({ ...m, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const r = await actualizarMiPerfil({
        nombre: member.nombre,
        cargo_personalizado: member.cargo_personalizado,
        fecha_cumpleanos: member.fecha_cumpleanos,
        fecha_pago: member.fecha_pago,
        avatar_url: member.avatar_url,
      })
      if (r.ok) {
        toast.success('Perfil actualizado')
        router.refresh()
      } else {
        toast.error(r.error)
      }
    })
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const r = await subirAvatar(fd)
    setUploading(false)
    if (r.ok) {
      patch('avatar_url', r.url)
      /* Persistir inmediatamente la nueva URL así si el usuario sale
         sin guardar, el avatar ya está sincronizado con BD. */
      await actualizarMiPerfil({ avatar_url: r.url })
      toast.success('Foto actualizada')
      router.refresh()
    } else {
      toast.error(r.error)
    }
    /* Resetear el input para que pueda subir el mismo archivo de nuevo */
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const inicial = member.nombre.charAt(0).toUpperCase()
  const cumpleHoy = member.fecha_cumpleanos
    ? (() => {
        const f = new Date(member.fecha_cumpleanos + 'T00:00:00')
        const h = new Date()
        return f.getMonth() === h.getMonth() && f.getDate() === h.getDate()
      })()
    : false

  return (
    <main style={{
      minHeight: '100vh',
      padding: '40px 24px',
      background: '#fafafa',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 26, fontWeight: 600,
            color: '#111827', margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Mi perfil
          </h1>
          <p style={{ fontSize: 13.5, color: '#6b7280', margin: '4px 0 0' }}>
            Edita tus datos personales. Los cambios se sincronizan automáticamente.
          </p>
        </div>

        {/* Card principal */}
        <div style={{
          background: '#fff',
          border: '1px solid #f1f1f3',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>
          {/* Avatar + upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Cambiar foto de perfil"
              style={{
                position: 'relative',
                width: 88, height: 88, borderRadius: '50%',
                background: member.avatar_url
                  ? `url(${member.avatar_url}) center/cover`
                  : '#7170ff',
                color: '#fff',
                border: '3px solid #fff',
                boxShadow: '0 0 0 1px #e5e7eb, 0 4px 12px rgba(16, 24, 40, 0.08)',
                cursor: uploading ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 600,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {!member.avatar_url && inicial}
              {/* Overlay hover-ish con icono cámara */}
              <span style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: uploading ? 1 : 0,
                transition: 'opacity 150ms ease-out',
                color: '#fff',
              }}>
                {uploading ? '...' : ''}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
                {member.nombre}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                {member.cargo_personalizado || rolNombre}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  marginTop: 8,
                  padding: '6px 12px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  color: '#374151',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                  cursor: uploading ? 'wait' : 'pointer',
                }}
              >
                {uploading ? 'Subiendo…' : (member.avatar_url ? 'Cambiar foto' : 'Subir foto')}
              </button>
              <p style={{ fontSize: 10.5, color: '#9ca3af', margin: '4px 0 0' }}>
                JPG, PNG o WebP · Máx 2 MB
              </p>
            </div>
          </div>

          <div style={{ height: 1, background: '#f3f4f6' }} />

          {/* Datos personales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Campo label="Nombre">
              <input
                value={member.nombre}
                onChange={(e) => patch('nombre', e.target.value)}
                style={fieldStyle}
              />
            </Campo>
            <Campo label="Cargo personalizado">
              <input
                value={member.cargo_personalizado ?? ''}
                onChange={(e) => patch('cargo_personalizado', e.target.value || null)}
                placeholder={rolNombre}
                style={fieldStyle}
              />
              <Hint>Si lo dejas vacío, se muestra "{rolNombre}".</Hint>
            </Campo>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo label="Cumpleaños">
                <input
                  type="date"
                  value={member.fecha_cumpleanos ?? ''}
                  onChange={(e) => patch('fecha_cumpleanos', e.target.value || null)}
                  onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch {} }}
                  style={{ ...fieldStyle, cursor: 'pointer' }}
                />
                {cumpleHoy && (
                  <Hint>🎉 ¡Feliz cumpleaños!</Hint>
                )}
              </Campo>
              <Campo label="Fecha de pago">
                <input
                  type="date"
                  value={member.fecha_pago ?? ''}
                  onChange={(e) => patch('fecha_pago', e.target.value || null)}
                  onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch {} }}
                  style={{ ...fieldStyle, cursor: 'pointer' }}
                />
                <Hint>Día del mes en que recibes tu pago.</Hint>
              </Campo>
            </div>
          </div>

          <div style={{ height: 1, background: '#f3f4f6' }} />

          {/* Datos read-only */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Campo label="Email">
              <input value={member.email} readOnly style={{ ...fieldStyle, background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }} />
              <Hint>El email solo lo puede cambiar el admin desde Mi equipo.</Hint>
            </Campo>
            <Campo label="Rol">
              <input value={rolNombre} readOnly style={{ ...fieldStyle, background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }} />
            </Campo>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <button
              type="button"
              onClick={() => setMember(initial)}
              disabled={!dirty || pending}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                color: '#374151',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                cursor: (!dirty || pending) ? 'not-allowed' : 'pointer',
                opacity: (!dirty || pending) ? 0.5 : 1,
              }}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || pending}
              style={{
                padding: '8px 16px',
                background: (!dirty || pending) ? '#c7d2fe' : '#7170ff',
                border: '1px solid transparent',
                borderRadius: 10,
                color: '#fff',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                cursor: (!dirty || pending) ? 'not-allowed' : 'pointer',
                boxShadow: (!dirty || pending) ? 'none' : '0 1px 3px rgba(113, 112, 255, 0.30)',
              }}
            >
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 10.5, fontWeight: 600, color: '#6b7280',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
      {children}
    </span>
  )
}

const fieldStyle: React.CSSProperties = {
  height: 38, padding: '0 12px',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  color: '#111827',
  fontFamily: 'inherit', fontSize: 13.5,
  outline: 'none', width: '100%',
}
