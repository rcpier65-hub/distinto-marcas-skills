import { actor, brandAccess, failure } from '@/lib/estrategia/access'
import { socialSummary } from '@/lib/estrategia/social'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(req: Request) {
  try {
    const a = await actor(req)
    const brand = await brandAccess(a, new URL(req.url).searchParams.get('marca') || '')
    return Response.json(await socialSummary(brand.id),
      { headers: { 'Cache-Control':'private, no-store' } })
  } catch (e) { return failure(e) }
}
