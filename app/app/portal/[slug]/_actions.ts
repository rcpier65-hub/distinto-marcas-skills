// app/app/portal/[slug]/_actions.ts
'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/get-user'
import { sendWhatsAppToPhone } from '@/lib/integrations/rubi'
import { revalidatePath } from 'next/cache'

const PEDRO_PHONE = '51983852191'

export async function aprobarDesdePortal(grillaId: string): Promise<void> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  // Verificar que el user tiene acceso a la marca de esta grilla
  const { data: grilla } = await supabase
    .from('grillas_pendientes')
    .select('id, marca_id, marca:marcas(nombre, slug)')
    .eq('id', grillaId)
    .maybeSingle()

  if (!grilla) return

  const { data: acceso } = await supabase
    .from('marca_usuarios')
    .select('id')
    .eq('marca_id', grilla.marca_id)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!acceso) return

  // Marcar como aprobada por cliente (Pedro debe confirmar envío al grupo en WhatsApp)
  await supabase
    .from('grillas_pendientes')
    .update({ estado: 'aprobada', aprobada_at: new Date().toISOString() })
    .eq('id', grillaId)

  await supabase.from('aprobaciones').insert({
    grilla_id: grillaId,
    usuario_id: user.id,
    accion: 'aprobar',
    via: 'dashboard',
    comentario: `Aprobado por cliente ${user.email} desde portal`,
  })

  // Avisar a Pedro
  const marca = Array.isArray(grilla.marca) ? grilla.marca[0] : grilla.marca
  await sendWhatsAppToPhone(
    PEDRO_PHONE,
    `🟢 *Cliente aprobó* — ${marca?.nombre}\nUsuario: ${user.email}\n\nResponde "ok ${marca?.slug}" para enviar al grupo.`
  )

  revalidatePath(`/portal/${marca?.slug}`)
}

export async function rechazarDesdePortal(grillaId: string): Promise<void> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const { data: grilla } = await supabase
    .from('grillas_pendientes')
    .select('id, marca_id, marca:marcas(nombre, slug)')
    .eq('id', grillaId)
    .maybeSingle()

  if (!grilla) return

  const { data: acceso } = await supabase
    .from('marca_usuarios')
    .select('id')
    .eq('marca_id', grilla.marca_id)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!acceso) return

  await supabase.from('aprobaciones').insert({
    grilla_id: grillaId,
    usuario_id: user.id,
    accion: 'rechazar',
    via: 'dashboard',
    comentario: `Cliente pidió cambios desde portal (${user.email})`,
  })

  const marca = Array.isArray(grilla.marca) ? grilla.marca[0] : grilla.marca
  await sendWhatsAppToPhone(
    PEDRO_PHONE,
    `🔴 *Cliente pidió cambios* — ${marca?.nombre}\nUsuario: ${user.email}\n\nContactalo para entender qué ajustar.`
  )

  revalidatePath(`/portal/${marca?.slug}`)
}
