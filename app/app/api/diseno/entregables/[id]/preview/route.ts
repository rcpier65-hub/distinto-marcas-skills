import { z } from 'zod'
import { failure, StrategyError } from '@/lib/estrategia/access'
import { strategyDB } from '@/lib/estrategia/db'
import { reviewActor, reviewPublication } from '@/lib/creative-review/server'
import { serveMedia } from '@/lib/creative-review/media'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Lee siempre el archivo guardado, no la miniatura de Drive (caché de 24 h).
// El navegador solo elige un entregable/slide; nunca una URL de proxy libre.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const a = await reviewActor(req)
    const id = z.string().uuid().parse((await params).id)
    const slide = z.coerce.number().int().min(0).max(19).parse(new URL(req.url).searchParams.get('slide') ?? 0)
    const { rows } = await strategyDB().query(
      'SELECT tarea_id,publicacion_id,link,slides FROM diseno_entregables WHERE id=$1', [id],
    )
    const e = rows[0]
    if (!e) throw new StrategyError('Entregable no encontrado', 404)
    await reviewPublication(a, e.tarea_id)
    if (e.publicacion_id) await reviewPublication(a, e.publicacion_id)
    const link = Array.isArray(e.slides) ? e.slides[slide] : slide === 0 ? e.link : null
    if (!link) throw new StrategyError('Este archivo todavía no tiene un enlace guardado', 404)
    return await serveMedia({ url: link, publicacion_id: e.publicacion_id ?? e.tarea_id }, req)
  } catch (e) {
    const response = failure(e)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
}
