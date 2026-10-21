// Presentaciones comerciales (Pedro 21-oct-2026). Solo dirección, igual que
// Propuestas. GET lista · POST crea · PUT guarda (autosave de la reunión).
import { z } from 'zod'
import { proposalActor, proposalBody, proposalError, ProposalError } from '@/lib/propuestas/server'
import { sesionSchema } from '@/lib/presentacion/web'

export const dynamic = 'force-dynamic'
const campos = 'id,servicio,data,propuesta_id,created_at,updated_at'
const sinCache = { headers: { 'Cache-Control': 'no-store' } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabla = (db: unknown) => (db as any).from('presentacion_sesiones')

export async function GET(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const { data, error } = await tabla(db).select(campos).eq('created_by', user.id).order('updated_at', { ascending: false }).limit(100)
    if (error) throw error
    return Response.json({ sesiones: data }, sinCache)
  } catch (e) { return proposalError(e) }
}

export async function POST(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const body = z.object({ cliente: sesionSchema.shape.cliente, servicios: sesionSchema.shape.servicios }).parse(await proposalBody(req))
    if (!body.cliente.empresa && !body.cliente.nombre) throw new ProposalError('Escribe el nombre del cliente o de su empresa.')
    const data = sesionSchema.parse({ cliente: body.cliente, servicios: body.servicios })
    const { data: fila, error } = await tabla(db).insert({ created_by: user.id, data }).select(campos).single()
    if (error) throw error
    return Response.json({ sesion: fila }, sinCache)
  } catch (e) { return proposalError(e) }
}

export async function PUT(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const body = z.object({ id: z.string().uuid(), data: sesionSchema }).parse(await proposalBody(req))
    const { data: fila, error } = await tabla(db).update({ data: body.data, updated_at: new Date().toISOString() }).eq('id', body.id).eq('created_by', user.id).select(campos).maybeSingle()
    if (error) throw error
    if (!fila) throw new ProposalError('Presentación no encontrada.', 404)
    return Response.json({ sesion: fila }, sinCache)
  } catch (e) { return proposalError(e) }
}
