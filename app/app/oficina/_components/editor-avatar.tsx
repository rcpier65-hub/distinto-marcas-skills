'use client'
import { useEffect, useRef, useState } from 'react'
import AvatarPreview from './avatar-preview'
import { X } from 'lucide-react'
import { normalizarAvatar, PIELES, PELOS, ROPAS, OJOS, PANTALONES, PEINADOS, ACCESORIOS, CUERPOS, ROSTROS, VESTIMENTAS, BARBAS, type AvatarConfig } from '../_avatar'

const labels: Record<string, string> = { mono: 'Moño', audifonos: 'Audífonos', neutro: 'Neutro', hombre: 'Hombre', mujer: 'Mujer', bob: 'Bob', cola: 'Coleta' }
function Opciones({ title, values, value, onChange }: { title: string; values: readonly string[]; value: string; onChange: (v: string) => void }) {
  return <fieldset className="mb-4"><legend className="mb-2 text-xs font-semibold text-slate-500">{title}</legend>
    <div className="flex flex-wrap gap-1.5">{values.map(v => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`rounded-xl border px-3 py-2 text-xs capitalize transition-colors ${value === v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{labels[v] || v}</button>)}</div>
  </fieldset>
}
function Colores({ title, values, value, onChange }: { title: string; values: string[]; value: string; onChange: (v: string) => void }) {
  return <fieldset className="mb-4"><legend className="mb-2 text-xs font-semibold text-slate-500">{title}</legend><div className="flex flex-wrap gap-2">
    {values.map((v, i) => <button key={v} type="button" aria-label={`${title}: tono ${i + 1}`} aria-pressed={value === v} onClick={() => onChange(v)} style={{ background: v }} className={`h-8 w-8 rounded-full border-2 ${value === v ? 'border-violet-500 ring-2 ring-violet-200 ring-offset-2' : 'border-black/10'}`} />)}
  </div></fieldset>
}
export default function EditorAvatar({ avatar, nombre, onGuardar, onCerrar }: {
  avatar: AvatarConfig; nombre: string; onGuardar: (a: AvatarConfig) => Promise<boolean>; onCerrar: () => void
}) {
  const [cfg, setCfg] = useState(() => normalizarAvatar(avatar)), [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('Rostro'), dialog = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onCerrar, saving })
  useEffect(() => { callbacks.current = { onCerrar, saving } }, [onCerrar, saving])
  const change = (key: keyof AvatarConfig, value: string) => setCfg(c => normalizarAvatar({ ...c, [key]: value }))
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLElement>('button')?.focus()
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !callbacks.current.saving) { e.stopPropagation(); callbacks.current.onCerrar() }
      if (e.key !== 'Tab') return
      const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') ?? [])
      const first = focusable[0], last = focusable.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [])
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm" onClick={() => { if (!saving) onCerrar() }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="avatar-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between"><div><h2 id="avatar-title" className="text-xl font-bold text-slate-800">Hazlo tuyo</h2><p className="text-sm text-slate-500">Tu personaje en la oficina.</p></div><button disabled={saving} onClick={onCerrar} aria-label="Cerrar personalización" className="rounded-full bg-slate-100 p-2"><X size={18} /></button></div>
      <div className="grid gap-6 sm:grid-cols-[230px_1fr]">
        <div><AvatarPreview avatar={cfg} /><p className="mt-2 text-center text-sm font-semibold text-slate-700">{nombre}</p><p className="mt-1 text-center text-xs text-slate-400">Arrastra para girar · Acerca para ver el rostro</p>
          <div className="mt-5"><Opciones title="Personaje" values={CUERPOS} value={cfg.cuerpo} onChange={v => change('cuerpo', v)} /></div>
        </div>
        <div><div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Personalización">{['Rostro', 'Cabello', 'Estilo'].map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === t ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>{t}</button>)}</div>
          <div role="tabpanel" aria-label={tab}>
            {tab === 'Rostro' && <><Opciones title="Forma del rostro" values={ROSTROS} value={cfg.rostro} onChange={v => change('rostro', v)} /><Colores title="Piel" values={PIELES} value={cfg.piel} onChange={v => change('piel', v)} /><Colores title="Ojos" values={OJOS} value={cfg.ojos} onChange={v => change('ojos', v)} /><Opciones title="Barba" values={BARBAS} value={cfg.barba} onChange={v => change('barba', v)} /></>}
            {tab === 'Cabello' && <><Opciones title="Peinado" values={PEINADOS} value={cfg.peinado} onChange={v => change('peinado', v)} /><Colores title="Color del cabello" values={PELOS} value={cfg.pelo} onChange={v => change('pelo', v)} /></>}
            {tab === 'Estilo' && <><Opciones title="Vestimenta" values={VESTIMENTAS} value={cfg.vestimenta} onChange={v => change('vestimenta', v)} /><Colores title="Color de la ropa" values={ROPAS} value={cfg.ropa} onChange={v => change('ropa', v)} /><Colores title="Pantalón" values={PANTALONES} value={cfg.pantalon} onChange={v => change('pantalon', v)} /><Opciones title="Accesorios" values={ACCESORIOS} value={cfg.accesorio} onChange={v => change('accesorio', v)} /></>}
          </div>
        </div>
      </div>
      <button disabled={saving} onClick={async () => { setSaving(true); try { await onGuardar(cfg) } finally { setSaving(false) } }} className="mt-5 h-12 w-full rounded-2xl bg-violet-600 font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar mi personaje'}</button>
    </div>
  </div>
}
