'use client'
import { useEffect, useState } from 'react'
import { Copy, Mail, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { defaultDelivery, deliveryBody, deliveryLinks, documentKey, whatsappPhone } from '@/lib/propuestas/delivery'
import type { ProposalData, ProposalRecord } from '@/lib/propuestas/model'
import { ProposalTextField } from './proposal-text-field'
import styles from './propuestas.module.css'

export type PreparedDelivery = { id: string; key: string; url: string; expiresAt: string }
export function ProposalDelivery({ record, prepared, busy, update, prepare }: {
  record: ProposalRecord; prepared: PreparedDelivery | null; busy: boolean
  update: (patch: Partial<ProposalData>) => void
  prepare: (delivery: ProposalData['delivery']) => Promise<void>
}) {
  const defaults = defaultDelivery(record)
  const [message, setMessage] = useState(record.data.delivery?.message || defaults.message)
  const [subject, setSubject] = useState(record.data.delivery?.subject || defaults.subject)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  const valid = !!prepared && prepared.id === record.id && prepared.key === documentKey(record.data) && Date.parse(prepared.expiresAt) > now
  const body = valid ? deliveryBody(message, prepared.url) : ''
  const links = deliveryLinks(record.data.client.phone, record.data.client.email, subject, body)
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); toast.success('Copiado.') }
    catch { toast.error('No se pudo copiar. Puedes seleccionar y copiar el texto manualmente.') }
  }
  return <section className={styles.deliveryPanel} aria-label="Enviar propuesta">
    <div className={styles.sectionHeading}><div className={styles.kicker}>LISTA PARA COMPARTIR</div><h2>Enviar propuesta</h2><p>Prepara el PDF y abre el mensaje en WhatsApp o en tu aplicación de correo. Tú revisas y completas el envío allí.</p></div>
    <div className={styles.twoCols}>
      <ProposalTextField label="WhatsApp del cliente" value={record.data.client.phone} maxLength={50} onChange={phone => update({ client: { ...record.data.client, phone } })} hint="Perú: puedes escribir 9 dígitos. Para otro país incluye +código de país."/>
      <ProposalTextField label="Correo del cliente" value={record.data.client.email} maxLength={180} onChange={email => update({ client: { ...record.data.client, email } })}/>
    </div>
    <ProposalTextField label="Asunto del correo" value={subject} maxLength={180} onChange={v => { setSubject(v); update({ delivery: { subject: v, message } }) }}/>
    <ProposalTextField label="Mensaje para el cliente" value={message} multiline maxLength={1600} onChange={v => { setMessage(v); update({ delivery: { subject, message: v } }) }} hint="Se añadirá al final el enlace del PDF. Puedes mejorar este mensaje con IA."/>
    {!valid && <button type="button" className={styles.primary} disabled={busy || !message.trim()} onClick={() => void prepare({ subject, message })}><Send size={16}/>{busy ? 'Preparando PDF…' : prepared ? 'Actualizar PDF para enviar' : 'Preparar envío'}</button>}
    {prepared && !valid && <p className={styles.note}>El contenido cambió o el enlace venció. Prepara el PDF actualizado antes de compartirlo.</p>}
    {valid && <>
      <div className={styles.shareReady}><b>PDF preparado</b><span>Enlace disponible hasta {new Date(prepared.expiresAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}. Quien reciba el enlace podrá descargar esta versión, sin entrar a la app.</span><button type="button" onClick={() => void copy(prepared.url)}><Copy size={13}/> Copiar enlace del PDF</button></div>
      <div className={styles.deliveryActions}>
        {links.whatsapp && message.trim() ? <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.whatsapp}><MessageCircle size={17}/> Abrir WhatsApp</a> : <button type="button" disabled><MessageCircle size={17}/> Completa el WhatsApp</button>}
        {links.email && subject.trim() && message.trim() ? <a href={links.email} target="_blank" rel="noopener noreferrer" className={styles.email}><Mail size={17}/> Abrir correo</a> : <button type="button" disabled><Mail size={17}/> Completa el correo y asunto</button>}
        <button type="button" disabled={!message.trim()} onClick={() => void copy(body)}><Copy size={15}/> Copiar mensaje completo</button>
      </div>
      {whatsappPhone(record.data.client.phone) && <p className={styles.note}>WhatsApp se abrirá para +{whatsappPhone(record.data.client.phone)}. El mensaje incluye un enlace al PDF; no se adjunta automáticamente un archivo.</p>}
    </>}
  </section>
}
