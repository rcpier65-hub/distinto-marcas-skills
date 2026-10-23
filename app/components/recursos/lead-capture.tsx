'use client'

import { useState } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import s from './recursos.module.css'

export function LeadCapture({ resource, payload }: { resource: 'decision-contenido' | 'madurez-digital'; payload: unknown }) {
  const [form, setForm] = useState({ nombre: '', email: '', empresa: '', telefono: '', consentimiento: false, website: '' })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function save() {
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/recursos/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, resource, payload }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'No pudimos guardar el diagnóstico.')
      setState('saved')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el diagnóstico.')
      setState('error')
    }
  }

  return (
    <div className={`${s.leadBox} ${s.noPrint}`}>
      <h3>Guarda este diagnóstico</h3>
      <p>Déjanos tus datos para registrar el resultado y habilitar una versión limpia para imprimir o guardar como PDF.</p>
      {state !== 'saved' ? <>
        <div className={s.leadFields}>
          <input aria-label="Nombre" placeholder="Tu nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
          <input aria-label="Correo" placeholder="Correo de trabajo" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input aria-label="Empresa" placeholder="Empresa" value={form.empresa} onChange={(event) => setForm({ ...form, empresa: event.target.value })} />
          <input aria-label="Teléfono" placeholder="WhatsApp (opcional)" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} />
          <input aria-label="Sitio web" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} style={{ position: 'absolute', left: '-10000px' }} />
        </div>
        <label className={s.consent}>
          <input type="checkbox" checked={form.consentimiento} onChange={(event) => setForm({ ...form, consentimiento: event.target.checked })} />
          <span>Acepto que Distinto guarde estos datos y me contacte sobre el resultado, según la <a href="/privacidad/" target="_blank">Política de privacidad</a>.</span>
        </label>
        <button className={`${s.button} ${s.primary}`} type="button" onClick={save} disabled={state === 'saving' || !form.consentimiento || form.nombre.trim().length < 2 || !form.email.includes('@') || form.empresa.trim().length < 2}>
          {state === 'saving' ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}
          Guardar y habilitar descarga
        </button>
        {message ? <div className={s.error}>{message}</div> : null}
      </> : <div>
        <p className={s.saved}>✓ Diagnóstico guardado. Ya puedes imprimirlo o guardarlo como PDF.</p>
        <button className={`${s.button} ${s.primary}`} type="button" onClick={() => window.print()}><Download size={17} /> Imprimir / guardar PDF</button>
      </div>}
    </div>
  )
}
