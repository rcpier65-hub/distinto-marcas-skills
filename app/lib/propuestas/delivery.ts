import { type ProposalData, type ProposalRecord } from './model'

export const SHARE_SECONDS = 7 * 24 * 60 * 60
export function documentKey(data: ProposalData) {
  // El mensaje de entrega y el estado interno no forman parte del PDF.
  const { delivery: _delivery, status: _status, ...document } = data
  void _delivery; void _status
  return JSON.stringify(document)
}
export function defaultDelivery(record: Pick<ProposalRecord, 'numero' | 'data'>) {
  const { data } = record
  return {
    subject: `${data.title} · Distinto`.slice(0, 180),
    message: `Hola${data.client.contact.trim() ? `, ${data.client.contact.trim()}` : ''}:\n\nTe compartimos nuestra propuesta «${data.title}» para ${data.client.name}. En el documento encontrarás el alcance de los servicios, la inversión y las condiciones de trabajo.\n\nQuedamos atentos a tus consultas y comentarios para coordinar los siguientes pasos.\n\nSaludos,\nEquipo Distinto`,
  }
}
export function whatsappPhone(value: string): string | null {
  if (!/^[+\d\s().-]+$/.test(value.trim())) return null
  const international = /^(\+|00)/.test(value.trim())
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!international && /^9\d{8}$/.test(digits)) digits = `51${digits}`
  if (!international && !/^51\d{9}$/.test(digits)) return null
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null
}
export function validRecipientEmail(value: string): boolean {
  return /^[^\s@,;<>?&#]+@[^\s@,;<>?&#]+\.[^\s@,;<>?&#]+$/.test(value.trim()) && value.length <= 180
}
export function deliveryBody(message: string, url: string) {
  return `${message.trim()}\n\nVer propuesta en PDF (enlace disponible durante 7 días):\n${url}`
}
export function deliveryLinks(phone: string, email: string, subject: string, body: string) {
  const normalized = whatsappPhone(phone)
  return {
    whatsapp: normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(body)}` : null,
    email: validRecipientEmail(email) ? `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject.replace(/[\r\n]/g, ' '))}&body=${encodeURIComponent(body)}` : null,
  }
}
