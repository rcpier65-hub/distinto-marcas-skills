'use client'

/* Accesos de clientes (portal) — diseño de CARDS estilo "Mi equipo"
   (Pedro 27-ago-2026: "cards bonitas ordenadas, no una fila"). Cada card:
   logo real de la marca, contacto, usuario, contraseña guardada (copiar /
   cambiar / 🎲 generar) y el botón de invitación para WhatsApp. Además un
   botón para GENERAR claves de golpe a todos los que no tienen (las genera
   la app al toque de Pedro/Erick — nunca viajan por el chat). */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, KeyRound, Building2, Pencil, Check, X, Copy, MessageCircle, Dices } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { crearAccesoCliente, eliminarAccesoCliente, actualizarNombreCliente, setPasswordCliente } from '../_actions'

export type MarcaMini = { slug: string; nombre: string; emoji: string | null }
export type AccesoCliente = { id: string; nombre: string; email: string; passwordInicial: string | null; marcaNombre: string; marcaSlug: string; marcaEmoji: string | null }

const AGENCY = '#7170ff'
const AGENCY2 = '#ba41f7'
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

export function ClientesAdminView({ marcas, accesos }: { marcas: MarcaMini[]; accesos: AccesoCliente[] }) {
  const [lista, setLista] = useState(accesos)
  const [, startTransition] = useTransition()
  const [marca, setMarca] = useState(marcas[0]?.slug ?? '')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [pwAbierto, setPwAbierto] = useState<string | null>(null)
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
    setLista((cur) => [{ id: `tmp-${Date.now()}`, nombre: nombre.trim() || (mm?.nombre ?? ''), email: email.trim().toLowerCase(), passwordInicial: password, marcaNombre: mm?.nombre ?? '', marcaSlug: mm?.slug ?? '', marcaEmoji: mm?.emoji ?? null }, ...cur])
    setNombre(''); setEmail(''); setPassword('')
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
    if (!a.passwordInicial) { toast.error('Este cliente aún no tiene clave — genera una con 🎲'); return }
    navigator.clipboard.writeText(mensajeInvitacion(a))
    toast.success('Invitación copiada — pégala en el WhatsApp del cliente')
  }

  function copiarPassword(a: AccesoCliente) {
    if (!a.passwordInicial) return
    navigator.clipboard.writeText(a.passwordInicial)
    toast.success('Contraseña copiada')
  }

  async function guardarPassword(id: string, clave: string) {
    if (clave.length < 8) { toast.error('Mínimo 8 caracteres'); return false }
    setPwGuardando(true)
    const r = await setPasswordCliente(id, clave)
    setPwGuardando(false)
    if (!r.ok) { toast.error(r.error); return false }
    setLista((cur) => cur.map((a) => (a.id === id ? { ...a, passwordInicial: clave } : a)))
    return true
  }

  /* 🎲 una card: genera + guarda al toque. */
  async function generarYGuardar(id: string) {
    const clave = generarClave()
    if (await guardarPassword(id, clave)) toast.success('🎲 Clave generada y guardada — ya puedes copiar la invitación')
  }

  /* 🎲 TODOS los que faltan, de un clic. */
  async function generarFaltantes() {
    if (sinClave.length === 0) return
    if (!confirm(`¿Generar y guardar claves nuevas para ${sinClave.length} cliente(s) sin clave?`)) return
    setBulkCorriendo(true)
    let ok = 0
    for (const a of sinClave) {
      const clave = generarClave()
      const r = await setPasswordCliente(a.id, clave)
      if (r.ok) {
        ok++
        setLista((cur) => cur.map((x) => (x.id === a.id ? { ...x, passwordInicial: clave } : x)))
      }
    }
    setBulkCorriendo(false)
    toast.success(`🎲 Listo: ${ok}/${sinClave.length} claves generadas y guardadas`)
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 pb-24 space-y-5">
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2} 60%, #ec4899)` }}>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> Accesos de clientes</h1>
        <p className="text-white/85 text-sm mt-1">Usuarios del portal por marca: contraseña guardada para copiar y mensaje de invitación listo para WhatsApp — igual que con el equipo.</p>
      </div>

      {/* Crear acceso */}
      <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm">
        <div className="text-sm font-semibold flex items-center gap-1.5"><UserPlus className="w-4 h-4" style={{ color: AGENCY }} /> Nuevo acceso</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground flex flex-col gap-1">Marca
            <select value={marca} onChange={(e) => setMarca(e.target.value)} className="h-10 px-2 rounded-lg border bg-background text-sm text-foreground">
              {marcas.map((m) => <option key={m.slug} value={m.slug}>{m.emoji ? m.emoji + ' ' : ''}{m.nombre}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">Nombre del contacto (sale en el saludo del portal)
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ana (Mil Ideas)" className="h-10 px-3 rounded-lg border bg-background text-sm" />
          </label>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">Usuario (correo)
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="off" placeholder="milideas@clientes.agenciadistinto.com" className="h-10 px-3 rounded-lg border bg-background text-sm" />
          </label>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">Contraseña
            <span className="flex gap-1.5">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" autoComplete="new-password" placeholder="mín. 8 caracteres" className="flex-1 min-w-0 h-10 px-3 rounded-lg border bg-background text-sm" />
              <button type="button" onClick={() => setPassword(generarClave())} title="Generar clave segura" className="h-10 px-3 rounded-lg border bg-background hover:bg-muted shrink-0"><Dices className="w-4 h-4" style={{ color: AGENCY }} /></button>
            </span>
          </label>
        </div>
        <button onClick={crear} disabled={creando} className="w-full h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}>
          {creando ? 'Creando…' : 'Crear acceso de cliente'}
        </button>
      </div>

      {/* Encabezado de lista + generar claves faltantes */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accesos · {lista.length}</div>
        <div className="flex-1" />
        {sinClave.length > 0 && (
          <button onClick={generarFaltantes} disabled={bulkCorriendo}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}>
            <Dices className="w-4 h-4" />
            {bulkCorriendo ? 'Generando…' : `Generar claves a los que faltan (${sinClave.length})`}
          </button>
        )}
      </div>

      {/* ═══════ CARDS (estilo Mi equipo) ═══════ */}
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 text-center text-sm text-muted-foreground py-8">Aún no hay accesos de cliente.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {lista.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              {/* Header: logo + marca + contacto */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center shrink-0 overflow-hidden">
                  <MarcaLogo slug={a.marcaSlug} nombre={a.marcaNombre} emoji={a.marcaEmoji} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold truncate leading-tight">{a.marcaNombre}</div>
                  {editando === a.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus
                        className="flex-1 min-w-0 h-8 px-2 rounded-lg border bg-background text-xs"
                        onKeyDown={(e) => { if (e.key === 'Enter') guardarNombre(a.id); if (e.key === 'Escape') setEditando(null) }} />
                      <button onClick={() => guardarNombre(a.id)} disabled={guardando} className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-50"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditando(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditando(a.id); setEditNombre(a.nombre) }} className="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5" title="Cambiar nombre del contacto">
                      {a.nombre || 'Sin contacto'} <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                </div>
                <button onClick={() => eliminar(a.id)} title="Quitar acceso" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-red-600 hover:bg-red-50 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>

              {/* Credenciales */}
              <div className="px-4 space-y-2">
                <div>
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">📧 Usuario</div>
                  <div className="text-xs font-mono truncate rounded-lg border bg-muted/40 px-2.5 py-1.5">{a.email}</div>
                </div>
                <div>
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">🔑 Contraseña</div>
                  {a.passwordInicial ? (
                    <div className="flex items-center gap-1.5">
                      <code className="flex-1 min-w-0 truncate text-xs rounded-lg border bg-muted/40 px-2.5 py-1.5">{a.passwordInicial}</code>
                      <button onClick={() => copiarPassword(a)} title="Copiar contraseña" className="w-8 h-7 rounded-lg border bg-background hover:bg-muted flex items-center justify-center shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setPwAbierto(pwAbierto === a.id ? null : a.id); setPwNueva('') }} title="Cambiar contraseña" className={`w-8 h-7 rounded-lg border flex items-center justify-center shrink-0 ${pwAbierto === a.id ? 'bg-muted' : 'bg-background hover:bg-muted'}`}><KeyRound className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => generarYGuardar(a.id)} disabled={pwGuardando}
                      className="w-full h-8 rounded-lg border border-dashed text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted disabled:opacity-50"
                      style={{ color: AGENCY, borderColor: `${AGENCY}66` }}>
                      <Dices className="w-3.5 h-3.5" /> Generar y guardar clave
                    </button>
                  )}
                </div>

                {/* Cambiar contraseña (expandible) */}
                {pwAbierto === a.id && (
                  <div className="flex items-center gap-1.5">
                    <input value={pwNueva} onChange={(e) => setPwNueva(e.target.value)} type="text" autoComplete="new-password"
                      placeholder="Nueva contraseña (mín. 8)" autoFocus
                      className="flex-1 min-w-0 h-8 px-2.5 rounded-lg border bg-background text-xs"
                      onKeyDown={(e) => { if (e.key === 'Enter') guardarPassword(a.id, pwNueva).then((ok) => { if (ok) { setPwAbierto(null); toast.success('✅ Contraseña cambiada') } }) }} />
                    <button onClick={() => setPwNueva(generarClave())} title="Generar" className="w-8 h-8 rounded-lg border bg-background hover:bg-muted flex items-center justify-center shrink-0"><Dices className="w-3.5 h-3.5" style={{ color: AGENCY }} /></button>
                    <button onClick={() => guardarPassword(a.id, pwNueva).then((ok) => { if (ok) { setPwAbierto(null); toast.success('✅ Contraseña cambiada') } })}
                      disabled={pwGuardando || pwNueva.length < 8}
                      className="h-8 px-2.5 rounded-lg text-white text-xs font-bold shrink-0 disabled:opacity-50" style={{ background: AGENCY }}>
                      {pwGuardando ? '…' : 'OK'}
                    </button>
                  </div>
                )}
              </div>

              {/* Invitación */}
              <div className="p-4 pt-3 mt-auto">
                <button onClick={() => copiarInvitacion(a)}
                  className="w-full h-10 rounded-xl text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: a.passwordInicial ? `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` : '#c7c9d4' }}>
                  <MessageCircle className="w-4 h-4" /> Copiar invitación
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
