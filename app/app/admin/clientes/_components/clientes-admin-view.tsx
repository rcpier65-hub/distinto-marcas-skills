'use client'

/* Accesos de clientes (portal) — MISMO diseño que las cards de "Mi equipo"
   (Pedro 27-ago-2026: "el diseño de mi equipo es así, lo necesito así"):
   card blanca 16px radius, pill Activo con dot, avatar 56px (logo real de la
   marca), grid Rol base / Ingreso, filas de contacto con íconos SVG, y botones
   Editar (outline) + Acceso (sólido #7170ff). "Acceso" abre el panel de
   credenciales: contraseña guardada (copiar/cambiar/🎲) + invitación WhatsApp. */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { MarcaLogo } from '@/components/marca-logo'
import { crearAccesoCliente, eliminarAccesoCliente, actualizarNombreCliente, setPasswordCliente } from '../_actions'

export type MarcaMini = { slug: string; nombre: string; emoji: string | null }
export type AccesoCliente = { id: string; nombre: string; email: string; passwordInicial: string | null; creadoEl: string | null; marcaNombre: string; marcaSlug: string; marcaEmoji: string | null }

const ACCENT = '#7170ff'
const APP_URL = 'https://distinto-app.vercel.app'

/* Clave legible y fuerte: 10 caracteres sin ambiguos (0/O, 1/l/I). */
function generarClave(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const arr = new Uint32Array(10)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join('')
}

function mensajeInvitacion(a: AccesoCliente): string {
  const primer = (a.nombre || a.marcaNombre).split(/[\s\-·]/)[0]
  const cap = primer.charAt(0).toUpperCase() + primer.slice(1).toLowerCase()
  return `¡Hola ${cap}! 👋

Te doy la bienvenida al portal de ${a.marcaNombre} en Distinto Agencia. 🎉
Desde aquí puedes ver el calendario de tus publicaciones, aprobar tus videos y recibir un aviso en tu celular apenas se publique tu contenido.

🔗 Entra aquí:
${APP_URL}/login

📧 Usuario:
${a.email}

🔑 Contraseña:
${a.passwordInicial}

Ábrelo desde tu celular y activa las notificaciones. Cualquier consulta, escríbeme por aquí.

— Pedro`
}

/* ── Helpers visuales (copiados del estilo MemberCard de Mi equipo) ── */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#111827', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function ContactLine({ icon, value, mono }: { icon: React.ReactNode; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span style={{ color: '#9ca3af', display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono ? 'ui-monospace, monospace' : 'inherit', flex: 1, minWidth: 0 }}>{value}</span>
    </div>
  )
}

const MailIcon = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M2 4L7 7.5L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
const KeyIcon = <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4.5" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M6.5 7.5L11.5 2.5M9.5 4.5L11.5 6.5M8 6L9.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
const LockIcon = <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="3" y="6" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 6V4.5C4.5 3 5.5 2 6.5 2C7.5 2 8.5 3 8.5 4.5V6" stroke="currentColor" strokeWidth="1.2" /></svg>
const PencilIcon = <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L9.5 3.5L11 5L4 12H2.5V10.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
const TrashIcon = <svg width="11" height="11" viewBox="0 0 13 13" fill="none"><path d="M2 3.5H11M5 3.5V2.5H8V3.5M3.5 3.5L4 11H9L9.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
const DiceIcon = <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="4.5" cy="4.5" r="0.9" fill="currentColor" /><circle cx="8.5" cy="8.5" r="0.9" fill="currentColor" /><circle cx="8.5" cy="4.5" r="0.9" fill="currentColor" /><circle cx="4.5" cy="8.5" r="0.9" fill="currentColor" /></svg>

const btnOutline: React.CSSProperties = {
  flex: 1, height: 38, padding: '0 14px', background: '#fff', border: '1px solid #e5e7eb',
  borderRadius: 10, color: '#374151', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'all 150ms ease-out',
}

export function ClientesAdminView({ marcas, accesos }: { marcas: MarcaMini[]; accesos: AccesoCliente[] }) {
  const [lista, setLista] = useState(accesos)
  const [, startTransition] = useTransition()
  const [marca, setMarca] = useState(marcas[0]?.slug ?? '')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creando, setCreando] = useState(false)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [accesoAbierto, setAccesoAbierto] = useState<string | null>(null)
  const [pwNueva, setPwNueva] = useState('')
  const [pwGuardando, setPwGuardando] = useState(false)
  const [bulkCorriendo, setBulkCorriendo] = useState(false)

  const sinClave = lista.filter((a) => !a.passwordInicial && !a.id.startsWith('tmp-'))

  async function crear() {
    if (!marca || !email.trim() || password.length < 8) { toast.error('Completa marca, correo y contraseña (mín. 8)'); return }
    setCreando(true)
    const r = await crearAccesoCliente({ marcaSlug: marca, email: email.trim(), password, nombre: nombre.trim() })
    setCreando(false)
    if (!r.ok) { toast.error(r.error); return }
    const mm = marcas.find((m) => m.slug === marca)
    setLista((cur) => [{ id: `tmp-${Date.now()}`, nombre: nombre.trim() || (mm?.nombre ?? ''), email: email.trim().toLowerCase(), passwordInicial: password, creadoEl: new Date().toISOString(), marcaNombre: mm?.nombre ?? '', marcaSlug: mm?.slug ?? '', marcaEmoji: mm?.emoji ?? null }, ...cur])
    setNombre(''); setEmail(''); setPassword(''); setNuevoOpen(false)
    toast.success('✅ Acceso de cliente creado. Ya puede entrar desde su celular.')
  }

  function eliminar(id: string) {
    if (!confirm('¿Quitar este acceso? El cliente ya no podrá entrar.')) return
    setLista((cur) => cur.filter((a) => a.id !== id))
    startTransition(async () => { const r = await eliminarAccesoCliente(id); if (!r.ok) toast.error(r.error) })
  }

  async function guardarNombre(id: string) {
    const nuevo = editNombre.trim()
    if (!nuevo) { toast.error('El nombre no puede estar vacío'); return }
    setGuardando(true)
    const r = await actualizarNombreCliente(id, nuevo)
    setGuardando(false)
    if (!r.ok) { toast.error(r.error); return }
    setLista((cur) => cur.map((a) => (a.id === id ? { ...a, nombre: nuevo } : a)))
    setEditando(null)
    toast.success('✅ Nombre actualizado.')
  }

  function copiarInvitacion(a: AccesoCliente) {
    if (!a.passwordInicial) { toast.error('Este cliente aún no tiene clave — genera una en Acceso 🎲'); return }
    navigator.clipboard.writeText(mensajeInvitacion(a))
    toast.success('Invitación copiada — pégala en el WhatsApp del cliente')
  }

  async function guardarPassword(id: string, clave: string): Promise<boolean> {
    if (clave.length < 8) { toast.error('Mínimo 8 caracteres'); return false }
    setPwGuardando(true)
    const r = await setPasswordCliente(id, clave)
    setPwGuardando(false)
    if (!r.ok) { toast.error(r.error); return false }
    setLista((cur) => cur.map((a) => (a.id === id ? { ...a, passwordInicial: clave } : a)))
    return true
  }

  async function generarYGuardar(id: string) {
    if (await guardarPassword(id, generarClave())) toast.success('🎲 Clave generada y guardada')
  }

  async function generarFaltantes() {
    if (sinClave.length === 0) return
    if (!confirm(`¿Generar y guardar claves nuevas para ${sinClave.length} cliente(s) sin clave?`)) return
    setBulkCorriendo(true)
    let ok = 0
    for (const a of sinClave) {
      const clave = generarClave()
      const r = await setPasswordCliente(a.id, clave)
      if (r.ok) { ok++; setLista((cur) => cur.map((x) => (x.id === a.id ? { ...x, passwordInicial: clave } : x))) }
    }
    setBulkCorriendo(false)
    toast.success(`🎲 Listo: ${ok}/${sinClave.length} claves generadas y guardadas`)
  }

  const inputStyle: React.CSSProperties = { height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13.5, fontFamily: 'inherit', width: '100%' }

  return (
    <main style={{ minHeight: '100vh', padding: '32px 40px', background: '#fafafa' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {/* HEADER — igual que Mi equipo */}
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Accesos de clientes</h1>
              <p style={{ fontSize: 13.5, color: '#6b7280', margin: '4px 0 0', fontWeight: 400 }}>
                {lista.length} {lista.length === 1 ? 'acceso' : 'accesos'} al portal{sinClave.length > 0 ? ` · ${sinClave.length} sin clave` : ''}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            {sinClave.length > 0 && (
              <button
                onClick={generarFaltantes}
                disabled={bulkCorriendo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#374151', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', marginRight: 10, opacity: bulkCorriendo ? 0.6 : 1 }}
              >
                {DiceIcon} {bulkCorriendo ? 'Generando…' : `Generar claves (${sinClave.length})`}
              </button>
            )}
            <button
              onClick={() => setNuevoOpen((v) => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', background: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 10, color: '#fff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 3px rgba(113, 112, 255, 0.30)' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2V11M2 6.5H11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Nuevo acceso
            </button>
          </div>
        </header>

        {/* FORM crear (colapsable, misma estética de card) */}
        {nuevoOpen && (
          <div style={{ padding: 24, background: '#fff', border: '1px solid #f1f1f3', borderRadius: 16, boxShadow: '0 1px 2px rgba(16,24,40,0.04)', marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Nuevo acceso de cliente</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 5 }}>Marca
                <select value={marca} onChange={(e) => setMarca(e.target.value)} style={{ ...inputStyle, color: '#111827' }}>
                  {marcas.map((m) => <option key={m.slug} value={m.slug}>{m.emoji ? m.emoji + ' ' : ''}{m.nombre}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 5 }}>Nombre del contacto
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ana" style={inputStyle} />
              </label>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 5 }}>Usuario (correo)
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="off" placeholder="marca@clientes.agenciadistinto.com" style={inputStyle} />
              </label>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 5 }}>Contraseña
                <span style={{ display: 'flex', gap: 6 }}>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" autoComplete="new-password" placeholder="mín. 8" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                  <button type="button" onClick={() => setPassword(generarClave())} title="Generar clave segura" style={{ ...btnOutline, flex: 'none', width: 44, height: 40, color: ACCENT }}>{DiceIcon}</button>
                </span>
              </label>
            </div>
            <button onClick={crear} disabled={creando}
              style={{ marginTop: 14, height: 40, padding: '0 18px', background: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 10, color: '#fff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', opacity: creando ? 0.6 : 1 }}>
              {creando ? 'Creando…' : 'Crear acceso'}
            </button>
          </div>
        )}

        {/* ═══════ GRID DE CARDS — réplica del MemberCard de Mi equipo ═══════ */}
        {lista.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #e5e7eb', borderRadius: 16 }}>Aún no hay accesos de cliente.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {lista.map((a) => {
              const fechaIngreso = a.creadoEl
                ? new Date(a.creadoEl).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const abierto = accesoAbierto === a.id
              return (
                <div key={a.id}
                  style={{ padding: 24, background: '#fff', border: '1px solid #f1f1f3', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)', transition: 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(16,24,40,0.08), 0 4px 8px -4px rgba(16,24,40,0.04)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1f1f3'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(16,24,40,0.04)'; e.currentTarget.style.transform = 'none' }}
                >
                  {/* HEADER: quitar (izq) + pill Activo (der) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 22 }}>
                    <button onClick={() => eliminar(a.id)} title="Quitar este acceso"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 999, color: '#6b7280', fontFamily: 'inherit', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.background = '#fef2f2' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'transparent' }}>
                      {TrashIcon} Quitar
                    </button>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 9px 3px 7px', background: '#dcfce7', color: '#15803d', borderRadius: 999 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                      Activo
                    </span>
                  </div>

                  {/* AVATAR (logo real) + marca + contacto */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: -8 }}>
                    <span style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '1px solid #f1f1f3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      <MarcaLogo slug={a.marcaSlug} nombre={a.marcaNombre} emoji={a.marcaEmoji} size={44} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.marcaNombre}</div>
                      {editando === a.id ? (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus
                            style={{ ...inputStyle, height: 30, fontSize: 12.5, flex: 1, minWidth: 0 }}
                            onKeyDown={(e) => { if (e.key === 'Enter') guardarNombre(a.id); if (e.key === 'Escape') setEditando(null) }} />
                          <button onClick={() => guardarNombre(a.id)} disabled={guardando} style={{ ...btnOutline, flex: 'none', height: 30, padding: '0 10px', color: '#15803d' }}>✓</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.nombre || 'Sin contacto'} · Cliente del portal
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#f3f4f6' }} />

                  {/* Grid 2 col: Rol base / Ingreso — como Mi equipo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Rol base" value="Cliente · Portal" />
                    <Field label="Ingreso" value={fechaIngreso} />
                  </div>

                  {/* Contacto: email + clave */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ContactLine icon={MailIcon} value={a.email} />
                    <ContactLine
                      icon={KeyIcon}
                      mono={!!a.passwordInicial}
                      value={a.passwordInicial ?? <span style={{ color: '#9ca3af' }}>Sin clave — genera una en Acceso</span>}
                    />
                  </div>

                  {/* Botones: Editar (outline) + Acceso (sólido) — como Mi equipo */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => { setEditando(editando === a.id ? null : a.id); setEditNombre(a.nombre) }} style={btnOutline}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb' }}>
                      {PencilIcon} Editar
                    </button>
                    <button onClick={() => { setAccesoAbierto(abierto ? null : a.id); setPwNueva('') }}
                      style={{ ...btnOutline, background: ACCENT, border: `1px solid ${ACCENT}`, color: '#fff' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92' }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
                      {LockIcon} Acceso
                    </button>
                  </div>

                  {/* Panel ACCESO: credenciales + invitación */}
                  {abierto && (
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {a.passwordInicial ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <code style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '8px 10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.passwordInicial}</code>
                          <button onClick={() => { navigator.clipboard.writeText(a.passwordInicial!); toast.success('Contraseña copiada') }} style={{ ...btnOutline, flex: 'none', padding: '0 12px' }}>Copiar</button>
                        </div>
                      ) : (
                        <button onClick={() => generarYGuardar(a.id)} disabled={pwGuardando}
                          style={{ ...btnOutline, borderStyle: 'dashed', color: ACCENT, borderColor: `${ACCENT}66` }}>
                          {DiceIcon} Generar y guardar clave
                        </button>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input value={pwNueva} onChange={(e) => setPwNueva(e.target.value)} type="text" autoComplete="new-password"
                          placeholder={a.passwordInicial ? 'Cambiar contraseña (mín. 8)' : 'O escribe una tú (mín. 8)'}
                          style={{ ...inputStyle, height: 36, fontSize: 12.5, flex: 1, minWidth: 0 }}
                          onKeyDown={(e) => { if (e.key === 'Enter') guardarPassword(a.id, pwNueva).then((ok) => { if (ok) { setPwNueva(''); toast.success('✅ Contraseña guardada') } }) }} />
                        <button onClick={() => setPwNueva(generarClave())} title="Generar" style={{ ...btnOutline, flex: 'none', width: 40, height: 36, color: ACCENT }}>{DiceIcon}</button>
                        <button onClick={() => guardarPassword(a.id, pwNueva).then((ok) => { if (ok) { setPwNueva(''); toast.success('✅ Contraseña guardada') } })}
                          disabled={pwGuardando || pwNueva.length < 8}
                          style={{ ...btnOutline, flex: 'none', padding: '0 12px', height: 36, background: pwNueva.length >= 8 ? ACCENT : '#e5e7eb', border: 'none', color: '#fff' }}>
                          {pwGuardando ? '…' : 'OK'}
                        </button>
                      </div>
                      <button onClick={() => copiarInvitacion(a)}
                        style={{ height: 38, borderRadius: 10, border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: a.passwordInicial ? `linear-gradient(135deg, ${ACCENT}, #ba41f7)` : '#d1d5db' }}>
                        💬 Copiar invitación de WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
