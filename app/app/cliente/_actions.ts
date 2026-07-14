// app/app/cliente/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getClienteActual } from '@/lib/cliente/get-cliente'
import { enviarPushAMiembros } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true; aprobadoAt: string } | { ok: false; error: string }

/* El CLIENTE aprueba un video de SU marca desde el portal. Marca
   aprobado_cliente_at y notifica por push SOLO a Erick, Lorena y Pedro
   (Pedro entra por ser director; Erick y Lorena por nombre). Aylin, Pieer,
   Nayeli, etc. NO reciben este aviso. Pedro 14-jul-2026. */
export async function aprobarVideoCliente(pubId: string): Promise<Result> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const service = createServiceClient() as Service
  const { data: pub } = await service
    .from('publicaciones')
    .select('id, nombre, marca_id, aprobado_cliente_at')
    .eq('id', pubId)
    .maybeSingle()
  if (!pub) return { ok: false, error: 'Publicación no encontrada' }
  // Seguridad: solo puede aprobar videos de SU marca.
  if (pub.marca_id !== cliente.marcaId) return { ok: false, error: 'Ese video no es de tu marca' }

  // Idempotente.
  if (pub.aprobado_cliente_at) return { ok: true, aprobadoAt: pub.aprobado_cliente_at as string }

  const aprobadoAt = new Date().toISOString()
  const { error } = await service.from('publicaciones').update({ aprobado_cliente_at: aprobadoAt }).eq('id', pubId)
  if (error) return { ok: false, error: error.message }

  // Aviso a Erick y Lorena (y Pedro por ser director) — "el cliente aprobó".
  await enviarPushAMiembros(['lorena', 'erick'], {
    title: `👍 ${cliente.marcaNombre} aprobó un video`,
    body: `${cliente.nombre ? cliente.nombre + ' — ' : ''}${pub.nombre ?? ''}`,
    url: '/publicaciones/publicar-hoy',
    tag: `aprob-cliente-${pubId}`,
  })

  revalidatePath('/cliente')
  revalidatePath('/publicaciones')
  return { ok: true, aprobadoAt }
}
