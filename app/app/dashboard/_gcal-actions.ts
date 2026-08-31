// app/app/dashboard/_gcal-actions.ts
'use server'

/* Botón "Sync calendario" de la card de marca: manda las publicaciones de
   la marca (de esta semana en adelante) al Google Calendar, invitando al
   cliente con sus correos. Solo directores. Pedro 31-ago-2026. */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { sincronizarPubsMarca, type SyncPubsResultado } from '@/lib/publicaciones/gcal-sync'

export async function sincronizarPublicacionesGcal(marcaSlug: string): Promise<SyncPubsResultado> {
  await requireUser()
  const p = await getCurrentMemberPermisos()
  const esDirector = !p || p.member.rol_base === 'director' || p.member.rol_base === 'admin'
  if (!esDirector) return { ok: false, error: 'Solo los directores pueden sincronizar publicaciones al calendario.' }
  const slug = (marcaSlug ?? '').trim()
  if (!slug) return { ok: false, error: 'Falta la marca.' }

  const r = await sincronizarPubsMarca(slug)
  if (r.ok) revalidatePath('/dashboard')
  return r
}
