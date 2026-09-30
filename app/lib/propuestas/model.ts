import { z } from 'zod'
import { PLANES, type PlanItem } from '../planes/catalogo'

const text = (max = 2000) => z.string().max(max)
const amount = z.number().finite().min(0).max(10000000)
export const serviceSchema = z.object({
  id: z.string().uuid(), sourceId: text(100), name: text(160), category: text(60),
  summary: text(), scope: text(6000), deliverables: text(6000), exclusions: text(6000),
  quantity: z.number().int().min(1).max(10000), price: amount.nullable(),
  frequency: z.enum(['mensual', 'unico']), optional: z.boolean(),
})
export const proposalSchema = z.object({
  title: text(160), date: z.iso.date(), validityDays: z.number().int().min(1).max(365),
  minimum: text(160), currency: z.enum(['PEN', 'USD']), tax: z.enum(['sin_igv', 'mas_igv']),
  status: z.enum(['borrador', 'lista']),
  client: z.object({ name: text(200), contact: text(160), document: text(40), email: text(180), phone: text(50), industry: text(200), address: text(300), coverage: text(200) }),
  objective: text(4000), services: z.array(serviceSchema).max(30),
  monthlyDiscount: amount, onceDiscount: amount,
  payment: text(4000), terms: text(8000), externalCosts: text(4000), team: text(3000),
})
export type ProposalData = z.infer<typeof proposalSchema>
export type ProposalService = z.infer<typeof serviceSchema>
export type ProposalRecord = { id: string; numero: number; revision: number; data: ProposalData; updated_at: string }
export const AGENCY = { name: 'AGENCIA DISTINTO S.A.C.', ruc: '20614387930', phone: '983 852 191', web: 'distintostudio.com', email: 'hola@agenciadistinto.com' }

export function emptyProposal(): ProposalData {
  return {
    title: 'Propuesta comercial', date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    validityDays: 15, minimum: '', currency: 'PEN', tax: 'sin_igv', status: 'borrador',
    client: { name: '', contact: '', document: '', email: '', phone: '', industry: '', address: '', coverage: '' },
    objective: '', services: [], monthlyDiscount: 0, onceDiscount: 0,
    payment: '', terms: 'Los alcances y entregables son los descritos en esta propuesta.\nLos servicios adicionales se cotizan y aprueban por separado.\nHorario del equipo: lunes a viernes, de 9:00 a. m. a 5:00 p. m.',
    externalCosts: '', team: '',
  }
}

export const STANDALONE = [
  { id: 'solo-social', name: 'Social Media', category: 'Social Media', summary: 'Gestión de contenido y presencia de la marca en redes sociales.', scope: 'Planificación de contenido y calendario editorial\nGuiones, copys y coordinación de publicaciones', exclusions: 'Inversión publicitaria\nGestión de campañas de pago, salvo contratación expresa' },
  { id: 'solo-paid', name: 'Paid Media', category: 'Paid Media', summary: '', scope: '', exclusions: 'Inversión publicitaria: la paga el cliente directamente a la plataforma' },
  { id: 'solo-trafficker', name: 'Trafficker digital', category: 'Trafficker digital', summary: '', scope: '', exclusions: 'Inversión publicitaria: la paga el cliente directamente a la plataforma' },
  { id: 'solo-produccion', name: 'Producción audiovisual', category: 'Producción', summary: 'Producción de piezas audiovisuales para la marca.', scope: 'Guiones y planificación de rodaje\nDirección durante la grabación\nEdición de las piezas acordadas', exclusions: 'Talentos, locaciones externas, vestuario y utilería, salvo acuerdo expreso' },
  { id: 'solo-asesoria', name: 'Asesoría comercial', category: 'Asesoría', summary: 'Revisión de la atención, seguimiento y conversión de consultas.', scope: 'Diagnóstico del recorrido del cliente\nRecomendaciones para el seguimiento y cierre de ventas', exclusions: '' },
  { id: 'personalizado', name: 'Servicio personalizado', category: 'A medida', summary: '', scope: '', exclusions: '' },
]

export function serviceFromTemplate(id: string, uid: string): ProposalService {
  const plan = PLANES.find(p => p.id === id)
  if (plan) return serviceFromPlan(plan, uid)
  const item = STANDALONE.find(p => p.id === id) ?? STANDALONE[5]
  if (id === 'solo-social') return { ...serviceFromPlan(PLANES.find(p => p.id === 'sm-contenido')!, uid), sourceId: id }
  return { id: uid, sourceId: item.id, name: item.name, category: item.category, summary: item.summary, scope: item.scope, exclusions: item.exclusions, deliverables: '', quantity: 1, price: null, frequency: 'mensual', optional: false }
}

export function priceSuggestion(sourceId: string) {
  if (sourceId !== 'solo-paid' && sourceId !== 'solo-trafficker') return null
  const pro = PLANES.find(p => p.id === 'sm-integration-pro')!.precioDesde!
  const social = PLANES.find(p => p.id === 'sm-contenido')!.precioDesde!
  return {
    price: pro - social,
    explanation: `Referencia calculada: Integration Pro (S/ ${pro}) menos Social Media Contenido (S/ ${social}). Los paquetes también difieren en producción y entregables; S/ ${pro - social} es una estimación editable, no una tarifa independiente del catálogo.`,
    scope: 'Configuración y gestión de campañas en las plataformas acordadas\nSegmentación de audiencias y seguimiento de conversiones\nOptimización semanal\nReporte mensual de resultados',
  }
}
export function commercialWarnings(data: ProposalData) {
  const warnings: string[] = []
  const included = data.services.filter(s => !s.optional)
  const ads = included.filter(s => ['solo-paid', 'solo-trafficker', 'sm-integration', 'sm-integration-pro', 'sm-ecommerce', 'sm-forneed'].includes(s.sourceId))
  if (ads.length > 1) warnings.push('Hay más de un servicio con gestión de pauta. Revisa el alcance para no cobrar dos veces Paid Media / Trafficker o la pauta ya incluida en un plan.')
  if (included.some(s => s.sourceId === 'add-hostinger')) warnings.push('El hosting lo paga el cliente directamente. Confirma si deseas facturarlo como servicio de la agencia.')
  return warnings
}
export function excessAdFee(budget: number) { return Math.round(Math.max(0, budget - 3000) * 0.1 * 100) / 100 }
function serviceFromPlan(plan: PlanItem, id: string): ProposalService {
  const gross = plan.notas?.some(n => /IGV incluido/i.test(n))
  return {
    id, sourceId: plan.id, name: plan.nombre, category: plan.categoria === 'social' ? 'Plan combinado' : plan.categoria === 'web' ? 'Web' : 'Adicional',
    summary: [plan.aplica, plan.minimo, ...(plan.notas ?? []).filter(n => !/IGV incluido/i.test(n))].filter(Boolean).join('\n'),
    scope: plan.incluye.join('\n'), deliverables: '', exclusions: plan.noIncluye.join('\n'), quantity: 1,
    price: plan.precioDesde == null ? null : gross ? Math.round(plan.precioDesde / 1.18 * 100) / 100 : plan.precioDesde,
    frequency: plan.periodo.includes('mensual') ? 'mensual' : 'unico', optional: plan.id === 'add-hostinger',
  }
}

export function proposalNumber(record: Pick<ProposalRecord, 'numero' | 'data'>) {
  return `COT-${record.data.date.slice(0, 4)}-${String(record.numero).padStart(4, '0')}`
}
export function money(value: number, currency: ProposalData['currency']) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
}
// Trabajar en céntimos evita errores de punto flotante en descuentos e IGV.
export function totals(data: ProposalData) {
  const bucket = (frequency: ProposalService['frequency'], discount: number) => {
    const rows = data.services.filter(s => !s.optional && s.frequency === frequency)
    const cents = rows.reduce((sum, s) => sum + Math.round((s.price ?? 0) * 100) * s.quantity, 0)
    const deduction = Math.round(discount * 100)
    const net = Math.max(0, cents - deduction)
    const tax = data.tax === 'mas_igv' ? Math.round(net * 0.18) : 0
    return { subtotal: cents / 100, discount, net: net / 100, tax: tax / 100, total: (net + tax) / 100, invalidDiscount: deduction > cents, pending: rows.some(s => s.price == null), count: rows.length }
  }
  return { monthly: bucket('mensual', data.monthlyDiscount), once: bucket('unico', data.onceDiscount) }
}
export function readyIssues(data: ProposalData): string[] {
  const errors: string[] = []
  if (!data.client.name.trim()) errors.push('Completa el nombre del cliente.')
  if (!data.title.trim()) errors.push('Completa el título de la propuesta.')
  if (!data.services.some(s => !s.optional)) errors.push('Agrega al menos un servicio contratado.')
  for (const s of data.services) {
    if (!s.name.trim()) errors.push('Hay un servicio sin nombre.')
    if (!s.optional && s.price == null) errors.push(`Define el precio de ${s.name}.`)
    if (!s.optional && !s.scope.trim() && !s.deliverables.trim()) errors.push(`Define el alcance de ${s.name}.`)
  }
  if (!data.payment.trim()) errors.push('Define la forma de pago.')
  const t = totals(data)
  if (t.monthly.invalidDiscount || t.once.invalidDiscount) errors.push('El descuento no puede superar el subtotal correspondiente.')
  return errors
}
