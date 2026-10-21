// Caso real para las presentaciones de Social Media y Publicidad. Solo dirección.
import { proposalActor, proposalError } from '@/lib/propuestas/server'
import { casoMarca } from '@/lib/presentacion/caso'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { db } = await proposalActor(req)
    const r = await casoMarca(db, new URL(req.url).searchParams.get('marca'))
    return Response.json(r, { status: 'error' in r ? 404 : 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return proposalError(e) }
}
