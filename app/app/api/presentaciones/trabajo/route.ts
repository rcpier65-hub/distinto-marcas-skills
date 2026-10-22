// Datos reales de producción por marca para la presentación de Social Media. Solo dirección.
import { proposalActor, proposalError } from '@/lib/propuestas/server'
import { trabajoMarca } from '@/lib/presentacion/trabajo'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { db } = await proposalActor(req)
    const r = await trabajoMarca(db, new URL(req.url).searchParams.get('marca'))
    return Response.json(r, { status: 'error' in r ? 404 : 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return proposalError(e) }
}
