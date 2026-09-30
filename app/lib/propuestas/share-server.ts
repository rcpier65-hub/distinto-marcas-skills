import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { documentKey, SHARE_SECONDS } from './delivery'
import { proposalPdf } from './pdf'
import { proposalNumber, type ProposalRecord } from './model'

export const PROPOSALS_BUCKET = 'propuestas-comerciales'
export async function shareProposalPdf(userId: string, row: ProposalRecord) {
  const storage = createServiceClient().storage.from(PROPOSALS_BUCKET)
  const number = proposalNumber(row)
  // Las copias enviadas son inmutables: editar la propuesta produce otro archivo.
  const hash = createHash('sha256').update(`pdf-v1:${number}:${documentKey(row.data)}`).digest('hex')
  const file = `${userId}/${row.id}/${hash}.pdf`
  const { data: exists, error: existsError } = await storage.exists(file)
  // Storage devuelve 400/404 junto con data:false cuando aún no existe el PDF.
  if (existsError && !(exists === false && ['400', '404'].includes(String(existsError.statusCode)))) throw existsError
  if (!exists) {
    const pdf = await proposalPdf(row.data, number)
    const { error } = await storage.upload(file, pdf, { contentType: 'application/pdf', upsert: false, cacheControl: '0' })
    // Otra petición puede terminar el mismo PDF primero; nunca sobreescribirlo.
    if (error && error.message !== 'The resource already exists' && String(error.statusCode) !== '409') throw error
  }
  const { data, error } = await storage.createSignedUrl(file, SHARE_SECONDS, { download: `${number}.pdf` })
  if (error || !data) throw error || new Error('No se pudo crear el enlace')
  return { url: data.signedUrl, expiresAt: new Date(Date.now() + SHARE_SECONDS * 1000).toISOString() }
}
