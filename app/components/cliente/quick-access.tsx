'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Copy, KeyRound, LayoutDashboard, Loader2, X } from 'lucide-react'
import { clientResources, type ClientResource } from '@/lib/cliente/access-resources'

export function ClientQuickAccess({ marcaId, marcaSlug, portalLink = true, compact = false }: { marcaId: string; marcaSlug: string; portalLink?: boolean; compact?: boolean }) {
  const [selected, setSelected] = useState<ClientResource | null>(null)
  const close = useCallback(() => setSelected(null), [])
  return <section aria-label="Accesos de tu marca" className={compact ? 'divide-y divide-slate-100' : `grid gap-3 ${portalLink ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
    {portalLink && <Link href={`/marca/${encodeURIComponent(marcaSlug)}/estrategia`} className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 font-semibold text-violet-800 hover:bg-violet-100">
      <LayoutDashboard className="h-5 w-5 shrink-0" /><span className="flex-1">Portal de marca<small className="mt-1 block font-normal text-xs">Resumen, planificación y reportes</small></span><ArrowUpRight className="h-4 w-4" />
    </Link>}
    {marcaSlug === 'little-joe' && clientResources.map(resource => <div key={resource.id} className={compact ? "flex items-center justify-between gap-3 py-2" : "flex flex-col justify-between gap-3 rounded-2xl border bg-white p-4"}>
      <a href={resource.url} target="_blank" rel="noopener noreferrer" className={compact ? "flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-slate-700 hover:text-violet-700" : "flex items-center justify-between gap-3 font-semibold text-slate-900 hover:text-violet-700"}>{compact ? (resource.id === 'catalogos' ? 'Catálogos' : 'Libro de reclamaciones') : resource.label}<ArrowUpRight className="h-4 w-4 shrink-0" /></a>
      <button type="button" onClick={() => setSelected(resource)} className={compact ? "flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-violet-700 hover:bg-violet-50" : "flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"} aria-label={`Ver contraseña: ${resource.label}`}><KeyRound className="h-4 w-4" />{compact ? 'Contraseña' : 'Ver contraseña'}</button>
    </div>)}
    {selected && <AccessDialog key={`${marcaId}:${selected.id}`} marcaId={marcaId} resource={selected} close={close} />}
  </section>
}

function AccessDialog({ marcaId, resource, close }: { marcaId: string; resource: ClientResource; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), controller = useRef<AbortController | null>(null)
  const [codigo, setCodigo] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState('')
  const [busy, setBusy] = useState(false), [copied, setCopied] = useState(false)
  useEffect(() => {
    dialog.current?.showModal()
    const hide = () => { if (document.visibilityState === 'hidden') { controller.current?.abort(); close() } }
    const leaving = () => { controller.current?.abort(); close() }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', leaving)
    return () => { controller.current?.abort(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leaving) }
  }, [close])
  useEffect(() => {
    if (!password) return
    const timer = setTimeout(close, 60000)
    return () => clearTimeout(timer)
  }, [password, close])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setPassword(''); setCopied(false)
    const ac = new AbortController(); controller.current = ac
    try {
      const res = await fetch('/cliente/accesos', { method: 'POST', cache: 'no-store', signal: ac.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marcaId, resource: resource.id, codigo }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar el código')
      if (!ac.signal.aborted) setPassword(data.password)
    } catch (err) { if (!ac.signal.aborted) setError(err instanceof Error ? err.message : 'No se pudo consultar el acceso') }
    finally { if (!ac.signal.aborted) { setCodigo(''); setBusy(false) } }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(password); setCopied(true) }
    catch { setError('No se pudo copiar. Selecciona la contraseña y cópiala manualmente.') }
  }
  return <dialog ref={dialog} onCancel={close} aria-labelledby="private-access-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/40">
    <div className="mb-4 flex items-start justify-between gap-3"><h2 id="private-access-title" className="text-lg font-bold text-slate-900">{resource.label}</h2><button type="button" onClick={close} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></div>
    {password ? <div className="space-y-4"><p className="text-sm text-slate-600">Contraseña de este acceso. Se ocultará al salir o después de un minuto.</p>
      <div className="select-all break-all rounded-xl bg-slate-50 p-4 font-mono text-sm" aria-label="Contraseña del acceso">{password}</div>
      <button type="button" onClick={copy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white"><Copy size={16} />{copied ? 'Copiada' : 'Copiar contraseña'}</button>
    </div> : <form onSubmit={submit} className="space-y-4"><p className="text-sm text-slate-600">Ingresa el código de acceso que te compartió la agencia.</p>
      <label className="block text-sm font-medium" htmlFor="private-access-code">Código de acceso</label><input id="private-access-code" type="password" inputMode="numeric" autoComplete="off" maxLength={16} value={codigo} onChange={e => setCodigo(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-lg tracking-widest" required autoFocus />
      <button type="submit" disabled={busy || !codigo} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Verificando…' : 'Ver contraseña'}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </dialog>
}
