'use server'

/* Server actions del chat interno. Todas resuelven el miembro logueado desde
   la sesión (nunca confían en un id que mande el navegador) y escriben con el
   service client. La lectura en vivo va por Realtime con RLS (ver migración
   20260924120001_mensajes_directos.sql). */

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAMiembroId } from '@/lib/push/send'
import {
  MENSAJE_MAX, MENSAJE_SELECT, rowToMensaje,
  type ChatInicial, type ContactoChat, type MensajeDirecto,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

// Los ids viajan a filtros PostgREST (.or) → solo aceptamos UUIDs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function miembroActual(service: Service): Promise<{ id: string; nombre: string } | null> {
  const user = await requireUser()
  const { data } = await service
    .from('team_members')
    .select('id, nombre')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()
  return data ?? null
}

/* Lista de contactos (todo el equipo activo menos yo) con su último mensaje y
   cuántos no leí. Con un equipo chico basta traer los mensajes recientes y
   agrupar en memoria. */
export async function getChatInicial(): Promise<Result<{ data: ChatInicial }>> {
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }

    const [{ data: miembros }, { data: recientes }] = await Promise.all([
      service
        .from('team_members')
        .select('id, nombre, avatar_url, rol_base')
        .eq('activo', true)
        .neq('id', yo.id)
        .order('nombre'),
      service
        .from('mensajes_directos')
        .select(MENSAJE_SELECT)
        .or(`de_id.eq.${yo.id},para_id.eq.${yo.id}`)
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

    const mensajes: MensajeDirecto[] = (recientes ?? []).map(rowToMensaje)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactos: ContactoChat[] = (miembros ?? []).map((m: any) => {
      const conEl = mensajes.filter((x) => x.deId === m.id || x.paraId === m.id)
      const u = conEl[0]
      return {
        id: m.id,
        nombre: m.nombre,
        avatarUrl: m.avatar_url ?? null,
        rolBase: m.rol_base ?? null,
        ultimo: u ? { texto: u.texto, createdAt: u.createdAt, esMio: u.deId === yo.id } : null,
        noLeidos: conEl.filter((x) => x.paraId === yo.id && !x.leidoAt).length,
      }
    })

    // Conversaciones con actividad arriba (más reciente primero); el resto alfabético.
    contactos.sort((a, b) => {
      if (a.ultimo && b.ultimo) return b.ultimo.createdAt.localeCompare(a.ultimo.createdAt)
      if (a.ultimo) return -1
      if (b.ultimo) return 1
      return a.nombre.localeCompare(b.nombre)
    })

    return {
      ok: true,
      data: {
        yo,
        contactos,
        totalNoLeidos: contactos.reduce((s, c) => s + c.noLeidos, 0),
      },
    }
  } catch (e) {
    console.error('[mensajes] getChatInicial', e)
    return { ok: false, error: 'No se pudo cargar el chat.' }
  }
}

/* Últimos 100 mensajes con una persona, en orden cronológico. */
export async function getConversacion(otroId: string): Promise<Result<{ mensajes: MensajeDirecto[] }>> {
  if (!UUID.test(otroId)) return { ok: false, error: 'Contacto inválido.' }
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }

    const { data, error } = await service
      .from('mensajes_directos')
      .select(MENSAJE_SELECT)
      .or(`and(de_id.eq.${yo.id},para_id.eq.${otroId}),and(de_id.eq.${otroId},para_id.eq.${yo.id})`)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    return { ok: true, mensajes: (data ?? []).map(rowToMensaje).reverse() }
  } catch (e) {
    console.error('[mensajes] getConversacion', e)
    return { ok: false, error: 'No se pudo cargar la conversación.' }
  }
}

export async function enviarMensaje(paraId: string, texto: string): Promise<Result<{ mensaje: MensajeDirecto }>> {
  if (!UUID.test(paraId)) return { ok: false, error: 'Contacto inválido.' }
  const limpio = texto.trim()
  if (!limpio) return { ok: false, error: 'El mensaje está vacío.' }
  if (limpio.length > MENSAJE_MAX) return { ok: false, error: `Máximo ${MENSAJE_MAX} caracteres.` }

  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    if (paraId === yo.id) return { ok: false, error: 'No puedes escribirte a ti mismo.' }

    const { data: destino } = await service
      .from('team_members').select('id').eq('id', paraId).eq('activo', true).maybeSingle()
    if (!destino) return { ok: false, error: 'Esa persona ya no está en el equipo.' }

    const { data, error } = await service
      .from('mensajes_directos')
      .insert({ de_id: yo.id, para_id: paraId, texto: limpio })
      .select(MENSAJE_SELECT)
      .single()
    if (error) throw error

    // Aviso push al destinatario; tocarlo abre el chat con quien escribió.
    await enviarPushAMiembroId(paraId, {
      title: `💬 ${yo.nombre}`,
      body: limpio.length > 140 ? `${limpio.slice(0, 137)}…` : limpio,
      url: `/inicio?chat=${yo.id}`,
      tag: `chat-${yo.id}`,
    })

    return { ok: true, mensaje: rowToMensaje(data) }
  } catch (e) {
    console.error('[mensajes] enviarMensaje', e)
    return { ok: false, error: 'No se pudo enviar el mensaje.' }
  }
}

/* Marca como leídos los mensajes que `otroId` me mandó. */
export async function marcarLeidos(otroId: string): Promise<Result<object>> {
  if (!UUID.test(otroId)) return { ok: false, error: 'Contacto inválido.' }
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }

    const { error } = await service
      .from('mensajes_directos')
      .update({ leido_at: new Date().toISOString() })
      .eq('de_id', otroId)
      .eq('para_id', yo.id)
      .is('leido_at', null)
    if (error) throw error
    return { ok: true }
  } catch (e) {
    console.error('[mensajes] marcarLeidos', e)
    return { ok: false, error: 'No se pudo actualizar.' }
  }
}
