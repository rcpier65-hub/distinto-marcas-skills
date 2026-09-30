import { z } from 'zod'
import { proposalActor, proposalBody, proposalError, ProposalError, proposalRateLimit } from '@/lib/propuestas/server'
import { proposalSchema, readyIssues } from '@/lib/propuestas/model'
import { shareProposalPdf } from '@/lib/propuestas/share-server'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const { id, revision } = z.object({ id: z.string().uuid(), revision: z.number().int().positive() }).parse(await proposalBody(req))
    const { data: row, error } = await db.from('propuestas_comerciales').select('id,numero,revision,data,updated_at').eq('id', id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (!row) throw new ProposalError('Propuesta no encontrada.', 404)
    if (revision !== row.revision) throw new ProposalError('La propuesta cambió. Vuelve a abrirla antes de preparar el envío.', 409)
    const data = proposalSchema.parse(row.data)
    const issues = readyIssues(data)
    if (issues.length) throw new ProposalError(issues[0])
    await proposalRateLimit(db, user.id, 'share-pdf', 10)
    return Response.json(await shareProposalPdf(user.id, { ...row, data }), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return proposalError(e) }
}
