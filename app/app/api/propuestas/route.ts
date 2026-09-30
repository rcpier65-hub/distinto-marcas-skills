import { z } from 'zod'
import { proposalSchema, readyIssues } from '@/lib/propuestas/model'
import { proposalActor, proposalBody, proposalError, ProposalError } from '@/lib/propuestas/server'

export const dynamic = 'force-dynamic'
const fields = 'id,numero,revision,data,updated_at'
export async function GET(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const { data, error } = await db.from('propuestas_comerciales').select(fields).eq('created_by', user.id).order('updated_at', { ascending: false }).limit(200)
    if (error) throw error
    return Response.json({ proposals: data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return proposalError(e) }
}
export async function PUT(req: Request) {
  try {
    const { user, db } = await proposalActor(req)
    const body = z.object({ id: z.string().uuid(), revision: z.number().int().min(0), data: proposalSchema }).parse(await proposalBody(req))
    if (body.data.status === 'lista') {
      const issues = readyIssues(body.data)
      if (issues.length) throw new ProposalError(issues[0])
    }
    if (body.revision === 0) {
      const { data, error } = await db.from('propuestas_comerciales').insert({ id: body.id, created_by: user.id, data: body.data }).select(fields).single()
      if (!error) return Response.json({ proposal: data })
      if (error.code !== '23505') throw error
    } else {
      const { data, error } = await db.from('propuestas_comerciales').update({ data: body.data, revision: body.revision + 1, updated_at: new Date().toISOString() }).eq('id', body.id).eq('created_by', user.id).eq('revision', body.revision).select(fields).maybeSingle()
      if (error) throw error
      if (data) return Response.json({ proposal: data })
    }
    // Respuesta perdida: reconocer el mismo contenido sin crear otra propuesta.
    const { data: existing, error } = await db.from('propuestas_comerciales').select(fields).eq('id', body.id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (existing && JSON.stringify(proposalSchema.parse(existing.data)) === JSON.stringify(body.data)) return Response.json({ proposal: existing })
    throw new ProposalError('Esta propuesta cambió en otra ventana. Conserva tus cambios y vuelve a abrir la versión guardada.', 409)
  } catch (e) { return proposalError(e) }
}
