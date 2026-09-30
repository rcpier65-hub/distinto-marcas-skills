import { z } from 'zod'
import { proposalActor, proposalBody, proposalError, ProposalError } from '@/lib/propuestas/server'
import { proposalSchema, proposalNumber, readyIssues } from '@/lib/propuestas/model'
import { proposalPdf } from '@/lib/propuestas/pdf'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const { id, revision } = z.object({ id: z.string().uuid(), revision: z.number().int().positive() }).parse(await proposalBody(req))
    const { data: row, error } = await db.from('propuestas_comerciales').select('numero,revision,data').eq('id', id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (!row) throw new ProposalError('Propuesta no encontrada.', 404)
    if (row.revision !== revision) throw new ProposalError('La propuesta cambió. Vuelve a abrirla antes de exportar.', 409)
    const data = proposalSchema.parse(row.data)
    const issues = readyIssues(data)
    if (issues.length) throw new ProposalError(issues[0])
    const number = proposalNumber({ numero: row.numero, data })
    const pdf = await proposalPdf(data, number)
    return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${number}.pdf"`, 'Cache-Control': 'no-store' } })
  } catch (e) { return proposalError(e) }
}
