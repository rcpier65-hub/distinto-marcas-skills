import 'server-only'
/* Acceso a las presentaciones: solo Pedro, igual que Propuestas. */
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { esPedroEmail } from '@/lib/planes/catalogo'
import { sesionSchema, type Sesion } from './web'
import { proposalSchema, type ProposalRecord } from '../propuestas/model'

export async function soloDireccion() {
  const user = await getUser()
  if (!user) redirect('/login')
  if (!esPedroEmail(user.email)) redirect('/inicio')
  return user
}

export type SesionGuardada = { id: string; data: Sesion; propuestaId: string | null; updatedAt: string; propuestaRevision?: number | null; propuestaGuardada?: ProposalRecord | null }

export async function cargarSesion(id: string): Promise<SesionGuardada> {
  const user = await soloDireccion()
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data } = await db.from('presentacion_sesiones').select('id,data,propuesta_id,propuesta_revision,updated_at').eq('id', id).eq('created_by', user.id).maybeSingle()
  if (!data) notFound()
  let propuestaGuardada: ProposalRecord | null = null
  if (data.propuesta_id) {
    const { data: p, error } = await db.from('propuestas_comerciales').select('id,numero,revision,data,updated_at').eq('id', data.propuesta_id).eq('created_by', user.id).maybeSingle()
    if (error) throw error
    if (p) propuestaGuardada = { ...p, data: proposalSchema.parse(p.data) }
  }
  return { id: data.id, data: sesionSchema.parse(data.data), propuestaId: data.propuesta_id ?? null, updatedAt: data.updated_at, propuestaRevision: data.propuesta_revision, propuestaGuardada }
}
