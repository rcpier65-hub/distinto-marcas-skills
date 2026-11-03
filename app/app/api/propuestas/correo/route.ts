import { z } from 'zod'
import { proposalActor, proposalBody, proposalError, ProposalError, proposalRateLimit } from '@/lib/propuestas/server'
import { proposalSchema, readyIssues } from '@/lib/propuestas/model'
import { proposalEmailSchema } from '@/lib/propuestas/email-model'
import { proposalEmailConfig, sendProposalEmail } from '@/lib/propuestas/email-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const headers = { 'Cache-Control': 'no-store' }

export async function GET(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const id = z.string().uuid().parse(new URL(req.url).searchParams.get('id'))
    const { data: row, error } = await db.from('propuestas_comerciales').select('id,numero,revision,data,updated_at').eq('id', id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (!row) throw new ProposalError('Propuesta no encontrada.', 404)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history = await (db as any).from('proposal_email_deliveries').select('id,recipient,subject,status,created_at,sent_at').eq('proposal_id', id).eq('created_by', user.id).order('created_at', { ascending: false }).limit(5)
    if (history.error) throw history.error
    return Response.json({ ...proposalEmailConfig(), proposal: { ...row, data: proposalSchema.parse(row.data) }, history: history.data }, { headers })
  } catch (e) { return proposalError(e) }
}

export async function POST(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const input = proposalEmailSchema.parse(await proposalBody(req))
    const { data: row, error } = await db.from('propuestas_comerciales').select('id,numero,revision,data,updated_at').eq('id', input.id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (!row) throw new ProposalError('Propuesta no encontrada.', 404)
    if (row.revision !== input.revision) throw new ProposalError('La propuesta cambió. Prepara el correo de nuevo para enviar la versión actual.', 409)
    const data = proposalSchema.parse(row.data)
    const issues = readyIssues(data)
    if (issues.length) throw new ProposalError(issues[0])
    await proposalRateLimit(db, user.id, 'email', 5)
    return Response.json(await sendProposalEmail(user.id, { ...row, data }, input), { headers })
  } catch (e) { return proposalError(e) }
}
