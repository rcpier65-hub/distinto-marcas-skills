// app/app/publicaciones/publicar-hoy/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAClientesDeMarca, enviarPushAMiembros } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

/* Confirmar publicación: estado → 'publicado' + publicado_at = ahora, y manda
   una notificación PUSH real al celular/PC de Pedro y Lorena. La pieza sale de
   "Publicar hoy" y queda en el historial. */
export async function marcarPublicado(id: string): Promise<Result> {
  const user = await requireUser()
  const service = createServiceClient() as Service

  const { data: pub } = await service
    .from('publicaciones')
    .select('nombre, plataformas, marca:marcas(id, nombre, emoji_marca)')
    .eq('id', id)
    .maybeSingle()

  const { error } = await service
    .from('publicaciones')
    .update({ estado: 'publicado', publicado_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  const m = pub ? (Array.isArray(pub.marca) ? pub.marca[0] : pub.marca) : null
  const hora = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date())
  const redes = Array.isArray(pub?.plataformas) && pub.plataformas.length ? ` · ${pub.plataformas.join(', ')}` : ''
  const marcaNombre = m?.nombre ?? 'Marca'
  // Al CLIENTE de la marca (portal): "tu video ya se publicó".
  if (m?.id) {
    await enviarPushAClientesDeMarca(m.id, {
      title: `✅ ¡Tu video se publicó! ${m.emoji_marca ?? ''}`.trim(),
      body: `${pub?.nombre ?? marcaNombre}${redes} · ${hora}`,
      url: `/cliente?pub=${id}`,   // abre directo esa publicación en el portal
      tag: `cliente-pub-${id}`,
    })
  }

  // Al EQUIPO (Pedro + Lorena): aviso de que se confirmó una publicación, con el
  // nombre de quién la subió. Pedro 05-ago-2026: "cuando Erick confirme una
  // publicación, que nos llegue a mí y a Lorena". enviarPushAMiembros siempre
  // incluye a los directores (Pedro/Erick); Erick suele ser quien confirma, no
  // molesta que le llegue su propia copia.
  const { data: quien } = await service
    .from('team_members')
    .select('nombre')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const porQuien = quien?.nombre ? ` · por ${quien.nombre}` : ''
  await enviarPushAMiembros(['lorena'], {
    title: `✅ Publicado en redes — ${marcaNombre} ${m?.emoji_marca ?? ''}`.trim(),
    body: `Ya se subió a las redes: «${pub?.nombre ?? marcaNombre}»${redes} · ${hora}${porQuien}`,
    url: `/publicaciones/${id}`,
    tag: `pub-confirmada-eq-${id}`,
  })

  revalidatePath('/publicaciones/publicar-hoy')
  revalidatePath('/publicaciones')
  revalidatePath('/inicio')
  return { ok: true }
}

/* Deshacer: vuelve a "por publicar" (estado 'programar') y limpia publicado_at.
   Por si se confirmó por error. */
export async function desmarcarPublicado(id: string): Promise<Result> {
  await requireUser()
  const service = createServiceClient() as Service
  const { error } = await service
    .from('publicaciones')
    .update({ estado: 'programar', publicado_at: null })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/publicaciones/publicar-hoy')
  revalidatePath('/publicaciones')
  return { ok: true }
}

/* Elimina una publicación desde el historial. Pedro 08-jul: poder borrar las
   publicaciones ya hechas. Destructivo (la UI confirma antes). */
export async function eliminarPublicacion(id: string): Promise<Result> {
  await requireUser()
  const service = createServiceClient() as Service
  const { error } = await service.from('publicaciones').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/publicaciones/publicar-hoy')
  revalidatePath('/publicaciones')
  revalidatePath('/inicio')
  return { ok: true }
}
