import 'server-only'
import { getUser } from '@/lib/auth/get-user'
import { esPedroEmail } from '@/lib/planes/catalogo'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { createHash } from 'node:crypto'
import { ProposalError } from './errors'
export { ProposalError } from './errors'

// Esquema acotado: las interfaces antiguas de otras tablas no cumplen el
// GenericSchema de la versión actual del cliente Supabase.
type ProposalDatabase = { public: {
  Tables: Pick<Database['public']['Tables'], 'propuestas_comerciales'>
  Views: Record<string, never>
  Functions: { booking_rate_limit: { Args: { p_key: string; p_limit: number; p_seconds: number }; Returns: boolean } }
} }

export async function proposalRateLimit(db: SupabaseClient<ProposalDatabase>, userId: string, action: string, limit: number) {
  const { data, error } = await db.rpc('booking_rate_limit', { p_key: createHash('sha256').update(`proposals:${action}:${userId}`).digest('hex'), p_limit: limit, p_seconds: 60 })
  if (error) throw new ProposalError('No se pudo comprobar la solicitud. Intenta nuevamente.', 503)
  if (!data) throw new ProposalError('Hay varias solicitudes en curso. Espera un minuto para continuar.', 429)
}
export async function proposalActor(request: Request) {
  const origin = request.headers.get('origin')
  if (request.method !== 'GET' && origin && origin !== new URL(request.url).origin) throw new ProposalError('Origen no permitido', 403)
  const user = await getUser()
  if (!user) throw new ProposalError('Inicia sesión para continuar.', 401)
  if (!esPedroEmail(user.email)) throw new ProposalError('Solo la dirección puede gestionar propuestas.', 403)
  return { user, db: createServiceClient() as unknown as SupabaseClient<ProposalDatabase> }
}
export async function proposalBody(request: Request) {
  const raw = await request.text()
  if (raw.length > 350000) throw new ProposalError('La propuesta es demasiado extensa.', 413)
  try { return JSON.parse(raw) } catch { throw new ProposalError('Solicitud inválida.') }
}
export function proposalError(error: unknown) {
  if (error instanceof ProposalError) return Response.json({ error: error.message }, { status: error.status })
  if (error instanceof z.ZodError) return Response.json({ error: 'Revisa los campos de la propuesta: ' + error.issues[0]?.message }, { status: 400 })
  console.error('[propuestas]', error instanceof Error ? error.message : 'Error de almacenamiento')
  return Response.json({ error: 'No se pudo completar la operación. Tus cambios siguen en pantalla.' }, { status: 500 })
}
