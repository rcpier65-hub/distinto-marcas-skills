// Genera o actualiza la propuesta de una presentación (Pedro 21-oct-2026).
// Una sola propuesta por reunión. Se actualiza con lo último de la reunión
// mientras nadie la haya editado en Planes y Propuestas; si se editó allá, se
// respeta y se devuelve tal cual.
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
    const { data: s, error } = await any.from('presentacion_sesiones').select('id,data,propuesta_id,propuesta_revision').eq('id', id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (!s) throw new ProposalError('Presentación no encontrada.', 404)
    const data = proposalSchema.parse(aPropuesta(sesionSchema.parse(s.data), todayLima(), randomUUID))

    if (s.propuesta_id) {
      const { data: p } = await any.from('propuestas_comerciales').select('id,numero,revision,data').eq('id', s.propuesta_id).eq('created_by', user.id).maybeSingle()
      if (p) {
        if (p.revision !== s.propuesta_revision) return Response.json({ propuestaId: p.id, numero: p.numero, revision: p.revision, editadaEnPlanes: true })
        const nueva = p.revision + 1
        /* Conserva la fecha original; el filtro por revisión evita pisar una edición simultánea en Planes. */
        const { data: u, error: eu } = await any.from('propuestas_comerciales')
          .update({ data: { ...data, date: p.data?.date ?? data.date }, revision: nueva, updated_at: new Date().toISOString() })
          .eq('id', p.id).eq('created_by', user.id).eq('revision', p.revision).select('id,numero,revision').maybeSingle()
        if (eu) throw eu
        if (!u) return Response.json({ propuestaId: p.id, numero: p.numero, revision: p.revision, editadaEnPlanes: true })
        await any.from('presentacion_sesiones').update({ propuesta_revision: nueva }).eq('id', id).eq('created_by', user.id)
        return Response.json({ propuestaId: u.id, numero: u.numero, revision: u.revision, existente: true })
      }
      /* La propuesta se borró en Planes: se libera la reunión para generar otra. */
      await any.from('presentacion_sesiones').update({ propuesta_id: null, propuesta_revision: null }).eq('id', id).eq('created_by', user.id).eq('propuesta_id', s.propuesta_id)
    }
    const propuestaId = randomUUID()
    /* Reserva la propuesta en la sesión antes de crearla: un segundo clic
       simultáneo no pasa este filtro y no crea otra. */
    const { data: reservada, error: e1 } = await any.from('presentacion_sesiones').update({ propuesta_id: propuestaId, propuesta_revision: 1, updated_at: new Date().toISOString() })
      .eq('id', id).eq('created_by', user.id).is('propuesta_id', null).select('id').maybeSingle()
    if (e1) throw e1
    if (!reservada) throw new ProposalError('La propuesta se está generando. Espera unos segundos y vuelve a intentar.', 409)
    const { data: p, error: e2 } = await any.from('propuestas_comerciales').insert({ id: propuestaId, created_by: user.id, data }).select('id,numero,revision').single()
    if (e2) {
      await any.from('presentacion_sesiones').update({ propuesta_id: null, propuesta_revision: null }).eq('id', id).eq('propuesta_id', propuestaId)
      throw e2
    }
    return Response.json({ propuestaId: p.id, numero: p.numero, revision: p.revision, existente: false })
  } catch (e) { return proposalError(e) }
}
