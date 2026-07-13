'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, KeyRound, Building2 } from 'lucide-react'
import { crearAccesoCliente, eliminarAccesoCliente } from '../_actions'

export type MarcaMini = { slug: string; nombre: string; emoji: string | null }
export type AccesoCliente = { id: string; nombre: string; email: string; marcaNombre: string; marcaEmoji: string | null }

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

  async function crear() {
    if (!marca || !email.trim() || password.length < 8) { toast.error('Completa marca, correo y contraseña (mín. 8)'); return }
    setCreando(true)
    const r = await crearAccesoCliente({ marcaSlug: marca, email: email.trim(), password, nombre: nombre.trim() })
    setCreando(false)
    if (!r.ok) { toast.error(r.error); return }
    const mm = marcas.find((m) => m.slug === marca)
    setLista((cur) => [{ id: `tmp-${Date.now()}`, nombre: nombre.trim() || (mm?.nombre ?? ''), email: email.trim().toLowerCase(), marcaNombre: mm?.nombre ?? '', marcaEmoji: mm?.emoji ?? null }, ...cur])
    setNombre(''); setEmail(''); setPassword('')
    toast.success('✅ Acceso de cliente creado. Ya puede entrar desde su celular.')
  }

  function eliminar(id: string) {
    if (!confirm('¿Quitar este acceso? El cliente ya no podrá entrar.')) return
    setLista((cur) => cur.filter((a) => a.id !== id))
    startTransition(async () => { const r = await eliminarAccesoCliente(id); if (!r.ok) toast.error(r.error) })
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
          <label className="text-xs text-muted-foreground flex flex-col gap-1">Nombre del contacto (opcional)
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
          <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eef0f7', color: '#534ab7' }}>{a.marcaEmoji ?? '🏷️'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{a.marcaNombre}{a.nombre ? ` · ${a.nombre}` : ''}</div>
              <div className="text-xs text-muted-foreground truncate">{a.email}</div>
            </div>
            <button onClick={() => eliminar(a.id)} title="Quitar acceso" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </main>
  )
}
