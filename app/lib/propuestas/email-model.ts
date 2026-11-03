import { z } from 'zod'
import { validRecipientEmail } from './delivery'

export const proposalEmailSchema = z.object({
  id: z.string().uuid(), revision: z.number().int().positive(),
  to: z.string().trim().max(180).refine(validRecipientEmail, 'Escribe un correo válido para el cliente.'),
  subject: z.string().trim().min(1).max(180).refine(v => !/[\r\n]/.test(v), 'El asunto debe ocupar una sola línea.'),
  message: z.string().trim().min(1).max(1600),
  confirmed: z.literal(true),
})
export type ProposalEmailInput = z.infer<typeof proposalEmailSchema>
export type EmailStatus = 'preparing' | 'sending' | 'sent' | 'failed' | 'uncertain'
export type EmailDelivery = { id: string; recipient: string; subject: string; status: EmailStatus; created_at: string; sent_at: string | null }
