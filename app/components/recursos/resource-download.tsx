'use client'

import { FormEvent, useState } from 'react'
import { CheckCircle2, Download, LoaderCircle } from 'lucide-react'
import s from './recursos.module.css'

export function ResourceDownload({ resource, title, filename }: {
  resource: 'decision-contenido' | 'madurez-digital'
  title: string
  filename: string
}) {
  const [form, setForm] = useState({ nombre: '', email: '', empresa: '', telefono: '', consentimiento: false, website: '' })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const href = `/recursos/${filename}`

  async function submit(event: FormEvent) {
    event.preventDefault()
    setState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/recursos/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, resource, payload: { delivery: 'pdf', title, filename } }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'No pudimos preparar la descarga.')
      setState('saved')
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos preparar la descarga.')
      setState('error')
    }
  }

  if (state === 'saved') return <div className={s.downloadCard}>
    <CheckCircle2 className={s.successIcon} size={38} />
    <h2>Tu guía está lista</h2>
    <p>La descarga comenzó. También puedes usar este botón para descargarla nuevamente.</p>
    <a className={s.downloadButton} href={href} download={filename}><Download size={18} /> Descargar PDF</a>
  </div>

  return <form className={s.downloadCard} onSubmit={submit}>
    <span className={s.sectionLabel}>Descarga gratuita</span>
    <h2>Recibe la guía completa</h2>
    <p>Déjanos tus datos y descarga el PDF de inmediato.</p>
    <label>Nombre<input required minLength={2} autoComplete="name" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
    <label>Correo de trabajo<input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
    <label>Empresa<input required minLength={2} autoComplete="organization" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} /></label>
    <label>WhatsApp <small>(opcional)</small><input autoComplete="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></label>
    <input aria-label="Sitio web" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className={s.honeypot} />
    <label className={s.consent}><input required type="checkbox" checked={form.consentimiento} onChange={e => setForm({ ...form, consentimiento: e.target.checked })} /><span>Acepto que Distinto guarde mis datos y me envíe información útil relacionada. Puedo solicitar la eliminación cuando quiera.</span></label>
    <button className={s.downloadButton} disabled={state === 'saving'}>{state === 'saving' ? <LoaderCircle className="animate-spin" size={18} /> : <Download size={18} />} Descargar guía en PDF</button>
    {message ? <div className={s.error}>{message}</div> : null}
    <small className={s.privacy}>Sin spam. Tratamos tus datos según nuestra <a href="/privacidad/" target="_blank">política de privacidad</a>.</small>
  </form>
}
