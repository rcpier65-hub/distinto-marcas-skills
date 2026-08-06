import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAClientesDeMarca } from '@/lib/push/send'

/* Avisa al CLIENTE de la marca que su VIDEO está listo para aprobar. Se llama en
   la TRANSICIÓN a estado 'aprobar' desde CUALQUIER ruta (detalle, kanban, editor)
   para que — sin importar por dónde el equipo mande el video a aprobar — al
   cliente de esa marca le llegue el aviso. Pedro 5-ago-2026: "si subo un video en
   novalamps, que le notifique al portal del cliente sobre su video para aprobar;
   igual con las demás marcas". No lanza (best-effort). Solo VIDEOS (los diseños
   no van al flujo de aprobar video). */
export async function avisarClienteVideoListo(pubId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    const { data: pub } = await service
      .from('publicaciones')
      .select('id, nombre, es_tarea_diseno, video_con_musica_url, marca:marcas(id, nombre, emoji_marca)')
      .eq('id', pubId)
      .maybeSingle()
    if (!pub) return
    // Un diseño SIN video no entra al flujo de aprobar video (igual que el portal).
    const esDisenoSinVideo = pub.es_tarea_diseno === true && !pub.video_con_musica_url
    if (esDisenoSinVideo) return
    const m = Array.isArray(pub.marca) ? pub.marca[0] : pub.marca
    if (!m?.id) return
    await enviarPushAClientesDeMarca(m.id, {
      title: `🎬 Tienes un video listo para aprobar${m.emoji_marca ? ` ${m.emoji_marca}` : ''}`,
      body: `${pub.nombre ?? 'Tu video'} — entra a tu portal para verlo y aprobarlo. 👀`,
      url: `/cliente?pub=${pubId}`,
      tag: `listo-aprobar-${pubId}`,
    })
  } catch (e) {
    console.error('[avisarClienteVideoListo]', e)
  }
}
