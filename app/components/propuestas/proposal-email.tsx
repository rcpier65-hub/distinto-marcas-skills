'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { CheckCircle2, FileText, Mail, Send, X } from 'lucide-react'
import { defaultDelivery, validRecipientEmail } from '@/lib/propuestas/delivery'
import { proposalNumber, readyIssues, type ProposalRecord } from '@/lib/propuestas/model'
import type { EmailDelivery } from '@/lib/propuestas/email-model'
import styles from './proposal-email.module.css'

type Prepared = { proposal: ProposalRecord; sender: string | null; configured: boolean; history: EmailDelivery[] }
const statusText = { preparing: 'Preparando', sending: 'Enviando', sent: 'Enviado', failed: 'No enviado', uncertain: 'Por confirmar en Enviados' }

export function ProposalEmail({ prepare, disabled, className }: {
  prepare: () => Promise<{ id: string; revision: number }>
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const lock = useRef(false)
  const titleId = useId()
  useEffect(() => {
    const el = dialog.current
    if (open && el && !el.open) el.showModal()
    return () => { if (el?.open) el.close() }
  }, [open])

  async function start() {
    if (lock.current) return
    lock.current = true; setBusy(true); setOpen(true)
    setPrepared(null); setError(''); setSent('')
    try {
      const saved = await prepare()
      const response = await fetch(`/api/propuestas/correo?id=${encodeURIComponent(saved.id)}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo preparar el correo.')
      const data = result as Prepared
      if (data.proposal.revision !== saved.revision) throw new Error('La propuesta cambió en otra ventana. Cierra este cuadro y vuelve a preparar el correo.')
      const issues = readyIssues(data.proposal.data)
      if (issues.length) throw new Error(issues[0])
      const defaults = defaultDelivery(data.proposal)
      setTo(data.proposal.data.client.email || data.history[0]?.recipient || '')
      setSubject(data.proposal.data.delivery?.subject || defaults.subject)
      setMessage(data.proposal.data.delivery?.message || defaults.message)
      setPrepared(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo preparar el correo.') }
    finally { lock.current = false; setBusy(false) }
  }

  async function send() {
    if (lock.current || !prepared) return
    lock.current = true; setBusy(true); setError('')
    try {
      const response = await fetch('/api/propuestas/correo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: prepared.proposal.id, revision: prepared.proposal.revision, to, subject, message, confirmed: true }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No pudimos confirmar el envío. Revisa Enviados del correo antes de repetirlo.')
      setSent(result.alreadySent ? `Este correo ya se envió a ${result.recipient}. No se ha duplicado.` : `Propuesta enviada a ${result.recipient}.`)
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos confirmar el envío. Revisa Enviados del correo antes de repetirlo.') }
    finally { lock.current = false; setBusy(false) }
  }

  const close = () => { if (!lock.current) setOpen(false) }
  const valid = prepared?.configured && validRecipientEmail(to) && subject.trim() && !/[\r\n]/.test(subject) && message.trim()
  return <>
    <button type="button" className={className || styles.launch} disabled={disabled || busy} onClick={() => void start()}><Mail size={17}/> Enviar por correo</button>
    {open && <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); close() }}>
      <header className={styles.header}><div><span>DISTINTO · PROPUESTAS</span><h2 id={titleId}>Enviar por correo</h2></div><button type="button" aria-label="Cerrar correo" disabled={busy} onClick={close}><X size={20}/></button></header>
      {!prepared && <div className={styles.content} aria-live="polite">{busy ? 'Guardando la propuesta y preparando el correo…' : 'No se pudo preparar el envío.'}</div>}
      {sent ? <div className={styles.success} role="status"><CheckCircle2 size={36}/><h3>{sent}</h3><p>El PDF va adjunto. Puedes consultar el envío en el correo de la agencia.</p><button type="button" className={styles.launch} onClick={close}>Listo</button></div> : prepared && <form onSubmit={e => { e.preventDefault(); void send() }}>
        <div className={styles.content}>
          <div className={styles.sender}>Desde <b>{prepared.sender || 'Sin configurar'}</b></div>
          {!prepared.configured && <p role="alert" className={styles.error}>El correo de la agencia todavía no está configurado.</p>}
          <label>Para · correo del cliente<input type="email" autoComplete="email" required maxLength={180} value={to} disabled={busy} placeholder="nombre@empresa.com" onChange={e => setTo(e.target.value)}/></label>
          <p className={styles.hint}>Revisa el correo registrado o escribe el destinatario de esta propuesta.</p>
          <label>Asunto<input required maxLength={180} value={subject} disabled={busy} onChange={e => setSubject(e.target.value)}/></label>
          <label>Mensaje<textarea required maxLength={1600} rows={6} value={message} disabled={busy} onChange={e => setMessage(e.target.value)}/></label>
          <div className={styles.attachment}><FileText size={25}/><div><b>{proposalNumber(prepared.proposal)}.pdf</b><span>{prepared.proposal.data.client.name} · PDF de la propuesta guardada</span></div></div>
          {prepared.history.length > 0 && <details className={styles.history}><summary>Últimos envíos</summary><ul>{prepared.history.map(item => <li key={item.id}><b>{statusText[item.status]}</b> · {item.recipient}<span>{new Date(item.sent_at || item.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</span></li>)}</ul></details>}
        </div>
        <footer className={styles.footer}><button type="button" disabled={busy} onClick={close}>Cancelar</button><button type="submit" className={styles.launch} disabled={busy || !valid}><Send size={17}/>{busy ? 'Enviando PDF…' : 'Enviar correo con PDF'}</button></footer>
      </form>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </dialog>}
  </>
}
