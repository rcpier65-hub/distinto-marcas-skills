import 'server-only'
/* Acceso a las presentaciones: solo Pedro, igual que Propuestas. */
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { esPedroEmail } from '@/lib/planes/catalogo'
import { sesionSchema, type Sesion } from './web'

export async function soloDireccion() {
  const user = await getUser()
  if (!user) redirect('/login')
  if (!esPedroEmail(user.email)) redirect('/inicio')
  return user
}

export type SesionGuardada = { id: string; data: Sesion; propuestaId: string | null; updatedAt: string }

export async function cargarSesion(id: string): Promise<SesionGuardada> {
  const user = await soloDireccion()
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createServiceClient() as any).from('presentacion_sesiones').select('id,data,propuesta_id,updated_at').eq('id', id).eq('created_by', user.id).maybeSingle()
  if (!data) notFound()
  return { id: data.id, data: sesionSchema.parse(data.data), propuestaId: data.propuesta_id ?? null, updatedAt: data.updated_at }
}
