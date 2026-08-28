'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, KeyRound, Building2, Pencil, Check, X, Copy, MessageCircle } from 'lucide-react'
import { crearAccesoCliente, eliminarAccesoCliente, actualizarNombreCliente, setPasswordCliente } from '../_actions'

export type MarcaMini = { slug: string; nombre: string; emoji: string | null }
export type AccesoCliente = { id: string; nombre: string; email: string; passwordInicial: string | null; marcaNombre: string; marcaEmoji: string | null }

const APP_URL = 'https://distinto-app.vercel.app'

/* Mensaje de invitación para WhatsApp — espejo del de Mi equipo, en versión
   cliente (portal de su marca). */
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

const AGENCY = '#7170ff'
const AGENCY2 = '#ba41f7'

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
  /* Panel de contraseña por cliente (ver/copiar/cambiar + invitación). */
  const [pwAbierto, setPwAbierto] = useState<string | null>(null)
  const [pwNueva, setPwNueva] = useState('')
  const [pwGuardando, setPwGuardando] = useState(false)

  function copiarInvitacion(a: AccesoCliente) {
    if (!a.passwordInicial) {
      toast.error('Primero asigna la contraseña con el botón 🔑 (los accesos viejos no la tienen guardada)')
      setPwAbierto(a.id); setPwNueva('')
      return
    }
    navigator.clipboard.writeText(mensajeInvitacion(a))
    toast.success('Invitación copiada — pégala en el WhatsApp del cliente')
  }

  function copiarPassword(a: AccesoCliente) {
    if (!a.passwordInicial) { toast.error('Sin contraseña guardada — asígnala primero'); return }
    navigator.clipboard.writeText(a.passwordInicial)
    toast.success('Contraseña copiada')
  }

  async function guardarPassword(id: string) {
    if (pwNueva.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setPwGuardando(true)
    const r = await setPasswordCliente(id, pwNueva)
    setPwGuardando(false)
    if (!r.ok) { toast.error(r.error); return }
    setLista((cur) => cur.map((a) => (a.id === id ? { ...a, passwordInicial: pwNueva } : a)))
    setPwNueva('')
    toast.success('✅ Contraseña guardada — ya puedes copiar la invitación')
  }

  async function crear() {
    if (!marca || !email.trim() || password.length < 8) { toast.error('Completa marca, correo y contraseña (mín. 8)'); return }
    setCreando(true)
    const r = await crearAccesoCliente({ marcaSlug: marca, email: email.trim(), password, nombre: nombre.trim() })
    setCreando(false)
    if (!r.ok) { toast.error(r.error); return }
    const mm = marcas.find((m) => m.slug === marca)
    setLista((cur) => [{ id: `tmp-${Date.now()}`, nombre: nombre.trim() || (mm?.nombre ?? ''), email: email.trim().toLowerCase(), passwordInicial: password, marcaNombre: mm?.nombre ?? '', marcaEmoji: mm?.emoji ?? null }, ...cur])
    setNombre(''); setEmail(''); setPassword('')
    toast.success('✅ Acceso de cliente creado. Ya puede entrar desde su celular.')
  }

  function eliminar(id: string) {
    if (!confirm('¿Quitar este acceso? El cliente ya no podrá entrar.')) return
    setLista((cur) => cur.filter((a) => a.id !== id))
    startTransition(async () => { const r = await eliminarAccesoCliente(id); if (!r.ok) toast.error(r.error) })
  }

  function empezarEdicion(a: AccesoCliente) { setEditando(a.id); setEditNombre(a.nombre) }

  async function guardarNombre(id: string) {
    const nuevo = editNombre.trim()
    if (!nuevo) { toast.error('El nombre no puede estar vacío'); return }
    setGuardando(true)
    const r = await actualizarNombreCliente(id, nuevo)
    setGuardando(false)
    if (!r.ok) { toast.error(r.error); return }
    setLista((cur) => cur.map((a) => (a.id === id ? { ...a, nombre: nuevo } : a)))
    setEditando(null)
    toast.success('✅ Nombre actualizado. El cliente lo verá en su portal.')
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6 pb-24 space-y-5">
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2} 60%, #ec4899)` }}>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> Accesos de clientes</h1>
        <p className="text-white/85 text-sm mt-1">Crea el usuario y contraseña de cada marca. El cliente entra desde su celular a ver sus publicaciones y recibe avisos cuando se publica su video.</p>
      </div>

      {/* Crear acceso */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
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
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" autoComplete="new-password" placeholder="mín. 8 caracteres" className="h-10 px-3 rounded-lg border bg-background text-sm" />
          </label>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <KeyRound className="w-3.5 h-3.5" /> La contraseña se guarda cifrada en Supabase. Anótala y pásasela al cliente.
        </div>
        <button onClick={crear} disabled={creando} className="w-full h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}>
          {creando ? 'Creando…' : 'Crear acceso de cliente'}
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accesos creados · {lista.length}</div>
        {lista.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 text-center text-sm text-muted-foreground py-6">Aún no hay accesos de cliente.</div>
        ) : lista.map((a) => (
          <div key={a.id} className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 p-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eef0f7', color: '#534ab7' }}>{a.marcaEmoji ?? '🏷️'}</span>
              {editando === a.id ? (
                <>
                  <div className="flex-1 min-w-0">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      autoFocus
                      placeholder="Nombre del contacto (sale en el saludo)"
                      className="w-full h-9 px-3 rounded-lg border bg-background text-sm"
                      onKeyDown={(e) => { if (e.key === 'Enter') guardarNombre(a.id); if (e.key === 'Escape') setEditando(null) }}
                    />
                    <div className="text-[11px] text-muted-foreground truncate mt-1">{a.marcaNombre} · {a.email}</div>
                  </div>
                  <button onClick={() => guardarNombre(a.id)} disabled={guardando} title="Guardar" className="w-8 h-8 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-50 shrink-0 disabled:opacity-50"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditando(null)} title="Cancelar" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{a.marcaNombre}{a.nombre ? ` · ${a.nombre}` : ''}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                  </div>
                  <button onClick={() => copiarInvitacion(a)} title="Copiar invitación para WhatsApp (link + usuario + contraseña)" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-muted" style={{ color: AGENCY }}><MessageCircle className="w-4 h-4" /></button>
                  <button onClick={() => { setPwAbierto(pwAbierto === a.id ? null : a.id); setPwNueva('') }} title="Ver / cambiar contraseña" className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-muted ${pwAbierto === a.id ? 'text-foreground bg-muted' : 'text-muted-foreground'}`}><KeyRound className="w-4 h-4" /></button>
                  <button onClick={() => empezarEdicion(a)} title="Cambiar nombre" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => eliminar(a.id)} title="Quitar acceso" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>

            {/* Panel: contraseña guardada (copiar) + asignar/cambiar */}
            {pwAbierto === a.id && (
              <div className="border-t px-3 py-3 space-y-2 bg-muted/30 rounded-b-xl">
                {a.passwordInicial ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate text-sm px-3 h-9 leading-9 rounded-lg border bg-background">{a.passwordInicial}</code>
                    <button onClick={() => copiarPassword(a)} title="Copiar contraseña" className="h-9 px-3 rounded-lg border bg-background text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted shrink-0"><Copy className="w-3.5 h-3.5" /> Copiar</button>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground">Este acceso no tiene la contraseña guardada (se creó antes de esta función). Asigna una nueva abajo y quedará guardada para copiar la invitación.</p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={pwNueva}
                    onChange={(e) => setPwNueva(e.target.value)}
                    type="text"
                    autoComplete="new-password"
                    placeholder={a.passwordInicial ? 'Nueva contraseña (mín. 8)' : 'Asignar contraseña (mín. 8)'}
                    className="flex-1 min-w-0 h-9 px-3 rounded-lg border bg-background text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') guardarPassword(a.id) }}
                  />
                  <button onClick={() => guardarPassword(a.id)} disabled={pwGuardando || pwNueva.length < 8} className="h-9 px-3 rounded-lg text-white text-xs font-semibold shrink-0 disabled:opacity-50" style={{ background: AGENCY }}>
                    {pwGuardando ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
                <p className="text-[10.5px] text-muted-foreground">Cambiarla actualiza el login del cliente al instante (la anterior deja de servir).</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
