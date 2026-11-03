import 'server-only'
import nodemailer from 'nodemailer'
import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { documentKey, validRecipientEmail } from './delivery'
import { proposalNumber, type ProposalRecord } from './model'
import { proposalPdf } from './pdf'
import { deliverProposalEmail } from './email-flow'
import { ProposalError } from './errors'
import type { EmailStatus, ProposalEmailInput } from './email-model'

export function proposalEmailConfig() {
  const sender = process.env.SMTP_USER?.trim() || ''
  return { configured: validRecipientEmail(sender) && !!process.env.SMTP_PASS, sender: sender || null }
}

export async function sendProposalEmail(userId: string, row: ProposalRecord, input: ProposalEmailInput) {
  const config = proposalEmailConfig()
  if (!config.configured || !config.sender) throw new ProposalError('El correo de la agencia todavía no está configurado.', 503)
  const sender = config.sender
  const key = createHash('sha256').update(JSON.stringify([row.id, documentKey(row.data), sender, input.to.toLowerCase(), input.subject, input.message])).digest('hex')
  // Tabla nueva, privada del servidor; no exponer acceso directo desde el cliente.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  let deliveryId = ''
  const result = await deliverProposalEmail({
    claim: async () => {
      const { data, error } = await db.from('proposal_email_deliveries').insert({ created_by: userId, proposal_id: row.id, proposal_revision: row.revision, delivery_key: key, recipient: input.to, subject: input.subject, sender, status: 'preparing' }).select('id,status').single()
      if (!error) { deliveryId = data.id; return { claimed: true, status: data.status } }
      if (error.code !== '23505') throw error
      const existing = await db.from('proposal_email_deliveries').select('id,status').eq('created_by', userId).eq('delivery_key', key).single()
      if (existing.error) throw existing.error
      deliveryId = existing.data.id
      if (existing.data.status !== 'failed') return { claimed: false, status: existing.data.status }
      const retry = await db.from('proposal_email_deliveries').update({ status: 'preparing', proposal_revision: row.revision, updated_at: new Date().toISOString() }).eq('id', deliveryId).eq('created_by', userId).eq('status', 'failed').select('id').maybeSingle()
      if (retry.error) throw retry.error
      return { claimed: !!retry.data, status: 'preparing' }
    },
    render: () => proposalPdf(row.data, proposalNumber(row)),
    current: async () => {
      const { data, error } = await db.from('propuestas_comerciales').select('revision').eq('id', row.id).eq('created_by', userId).maybeSingle()
      if (error) throw error
      return data?.revision === row.revision
    },
    state: async (status: EmailStatus) => {
      const { error } = await db.from('proposal_email_deliveries').update({ status, updated_at: new Date().toISOString(), ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}) }).eq('id', deliveryId).eq('created_by', userId)
      if (error) throw error
    },
    send: async pdf => {
      const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: sender, pass: process.env.SMTP_PASS }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 })
      try {
        const info = await transport.sendMail({ from: { name: 'Distinto Studio', address: sender }, replyTo: sender, to: input.to, subject: input.subject, text: input.message, attachments: [{ filename: `${proposalNumber(row)}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }], disableFileAccess: true, disableUrlAccess: true })
        if (!info.accepted?.length || info.rejected?.length) throw new Error('SMTP no confirmó al destinatario.')
      } finally { transport.close() }
    },
  })
  return { ...result, deliveryId, recipient: input.to, sender }
}
