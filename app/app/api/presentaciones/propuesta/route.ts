// Genera la propuesta borrador de una presentación (Pedro 21-oct-2026).
// Idempotente: si la sesión ya tiene propuesta, devuelve esa y no crea otra.
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { proposalActor, proposalBody, proposalError, ProposalError } from '@/lib/propuestas/server'
import { proposalSchema } from '@/lib/propuestas/model'
import { aPropuesta, sesionSchema } from '@/lib/presentacion/web'
import { todayLima } from '@/lib/estrategia/model'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const { id } = z.object({ id: z.string().uuid() }).parse(await proposalBody(req))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const any = db as any
    const { data: s, error } = await any.from('presentacion_sesiones').select('id,data,propuesta_id').eq('id', id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (!s) throw new ProposalError('Presentación no encontrada.', 404)
    if (s.propuesta_id) {
      const { data: p } = await any.from('propuestas_comerciales').select('id,numero').eq('id', s.propuesta_id).eq('created_by', user.id).maybeSingle()
      if (p) return Response.json({ propuestaId: p.id, numero: p.numero, existente: true })
      /* La propuesta se borró en Planes: se libera la reunión para generar otra. */
      await any.from('presentacion_sesiones').update({ propuesta_id: null }).eq('id', id).eq('created_by', user.id).eq('propuesta_id', s.propuesta_id)
    }
    const data = proposalSchema.parse(aPropuesta(sesionSchema.parse(s.data), todayLima(), randomUUID))
    const propuestaId = randomUUID()
    /* Reserva la propuesta en la sesión antes de crearla: un segundo clic
       simultáneo no pasa este filtro y no crea otra. */
    const { data: reservada, error: e1 } = await any.from('presentacion_sesiones').update({ propuesta_id: propuestaId, updated_at: new Date().toISOString() })
      .eq('id', id).eq('created_by', user.id).is('propuesta_id', null).select('id').maybeSingle()
    if (e1) throw e1
    if (!reservada) {
      const { data: otra } = await any.from('presentacion_sesiones').select('propuesta_id').eq('id', id).maybeSingle()
      const { data: p } = await any.from('propuestas_comerciales').select('id,numero').eq('id', otra?.propuesta_id).maybeSingle()
      if (p) return Response.json({ propuestaId: p.id, numero: p.numero, existente: true })
      throw new ProposalError('La propuesta se está generando. Espera unos segundos y vuelve a intentar.', 409)
    }
    const { data: p, error: e2 } = await any.from('propuestas_comerciales').insert({ id: propuestaId, created_by: user.id, data }).select('id,numero').single()
    if (e2) {
      await any.from('presentacion_sesiones').update({ propuesta_id: null }).eq('id', id).eq('propuesta_id', propuestaId)
      throw e2
    }
    return Response.json({ propuestaId: p.id, numero: p.numero, existente: false })
  } catch (e) { return proposalError(e) }
}
