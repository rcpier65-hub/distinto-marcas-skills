import { proposalActor, proposalBody, proposalError, proposalRateLimit } from '@/lib/propuestas/server'
import { writingSchema } from '@/lib/propuestas/writing'
import { improveProposalText } from '@/lib/propuestas/writing-server'
export const maxDuration = 60
export async function POST(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const { field, text } = writingSchema.parse(await proposalBody(req))
    await proposalRateLimit(db, user.id, 'writing', 20)
    return Response.json({ text: await improveProposalText(field, text) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return proposalError(e) }
}
