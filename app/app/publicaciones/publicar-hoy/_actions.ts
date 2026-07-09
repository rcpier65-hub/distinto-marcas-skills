// app/app/publicaciones/publicar-hoy/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsAppMessage } from '@/lib/integrations/rubi'
import { enviarPushAMiembros } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true } | { ok: false; error: string }

/* Notifica al grupo interno (Pedro + Lorena). Nunca rompe el confirmar:
   si WhatsApp falla, se loguea y seguimos. Reusa la config del endpoint
   /api/v1/whatsapp/notify (chatId directo o nombre de grupo "New team"). */
async function notificarWhatsApp(texto: string): Promise<void> {
  try {
    const chatId = process.env.WHATSAPP_INTERNAL_GROUP_CHATID
    const groupName = process.env.WHATSAPP_INTERNAL_GROUP_ALIAS ?? 'New team'
    const dest = chatId ? { chatId } : { group_name: groupName }
    await sendWhatsAppMessage({ ...dest, text: texto })
  } catch (e) {
    console.error('[publicar-hoy] WhatsApp notify falló:', e)
  }
}

/* Confirmar publicación: estado → 'publicado' + publicado_at = ahora, y avisa
   por WhatsApp al grupo interno. La pieza sale de "Publicar hoy" y queda en el
   historial. */
export async function marcarPublicado(id: string): Promise<Result> {
  await requireUser()
  const service = createServiceClient() as Service

  const { data: pub } = await service
    .from('publicaciones')
    .select('nombre, plataformas, marca:marcas(nombre, emoji_marca)')
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
  await notificarWhatsApp(
    `✅ *Publicado* — ${m?.emoji_marca ? m.emoji_marca + ' ' : ''}${marcaNombre}\n📄 ${pub?.nombre ?? ''}${redes}\n🕐 ${hora}`,
  )
  // Notificación push real al celular/PC de Pedro y Lorena.
  await enviarPushAMiembros(['pedro', 'lorena'], {
    title: `✅ Publicado — ${marcaNombre}`,
    body: `${pub?.nombre ?? ''}${redes} · ${hora}`,
    url: '/publicaciones/publicar-hoy',
    tag: `pub-${id}`,
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
