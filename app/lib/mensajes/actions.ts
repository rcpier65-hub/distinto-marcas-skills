'use server'

/* Server actions del chat interno. Todas resuelven el miembro logueado desde
   la sesión (nunca confían en un id que mande el navegador) y escriben con el
   service client. La lectura en vivo va por Realtime con RLS (ver migración
   20260924120001_mensajes_directos.sql). */

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAMiembroId } from '@/lib/push/send'
import { actividadEquipo } from './actividad'
import { MAX_BYTES, TIPOS_IMAGEN, borrarArchivo, prepararSubida, urlsDeLectura, type SubidaPreparada } from './almacen'
import {
  GRUPO_ID, GRUPO_NOMBRE, MENSAJE_GRUPO_SELECT, MENSAJE_MAX, MENSAJE_SELECT, rowToMensaje, rowToMensajeGrupo, vistaPrevia,
  estadoEnvio,
  type AdjuntoEnviado, type ChatInicial, type ContactoChat, type LecturaGrupo, type MensajeDirecto,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

// Los ids viajan a filtros PostgREST (.or) → solo aceptamos UUIDs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* Completa la URL firmada de lectura de los mensajes con imagen. */
async function firmar(mensajes: MensajeDirecto[]): Promise<MensajeDirecto[]> {
  const refs = mensajes.filter((m) => m.adjunto).map((m) => m.adjunto!.ref)
  if (refs.length === 0) return mensajes
  const urls = await urlsDeLectura(refs)
  return mensajes.map((m) => (m.adjunto ? { ...m, adjunto: { ...m.adjunto, url: urls.get(m.adjunto.ref) ?? null } } : m))
}

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

    /* Abrir la app = los mensajes que me mandaron ya me "llegaron" (✓✓). */
    await service.from('mensajes_directos').update({ entregado_at: new Date().toISOString() })
      .eq('para_id', yo.id).is('entregado_at', null)

    const [{ data: miembros }, { data: recientes }, grupo, actividad] = await Promise.all([
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
      resumenGrupo(service, yo.id),
      actividadEquipo(service),
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
        ultimo: u ? { texto: vistaPrevia(u.texto, !!u.adjunto), createdAt: u.createdAt, esMio: u.deId === yo.id, estado: estadoEnvio(u) } : null,
        noLeidos: conEl.filter((x) => x.paraId === yo.id && !x.leidoAt).length,
        actividad: actividad.get(m.id) ?? null,
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
        grupo,
        totalNoLeidos: contactos.reduce((s, c) => s + c.noLeidos, 0) + grupo.noLeidos,
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

    return { ok: true, mensajes: await firmar((data ?? []).map(rowToMensaje).reverse()) }
  } catch (e) {
    console.error('[mensajes] getConversacion', e)
    return { ok: false, error: 'No se pudo cargar la conversación.' }
  }
}

/* Paso 1 de enviar una imagen: el servidor da una URL firmada y el navegador
   sube el archivo (ya comprimido) directo al almacén. */
export async function prepararImagen(tipo: string, bytes: number): Promise<Result<{ subida: SubidaPreparada }>> {
  if (!(TIPOS_IMAGEN as readonly string[]).includes(tipo)) return { ok: false, error: 'Solo se pueden enviar imágenes.' }
  if (!(bytes > 0 && bytes <= MAX_BYTES)) return { ok: false, error: 'La imagen pesa más de 5 MB.' }
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    return { ok: true, subida: await prepararSubida(yo.id, tipo) }
  } catch (e) {
    console.error('[mensajes] prepararImagen', e)
    return { ok: false, error: 'No se pudo preparar la imagen.' }
  }
}

export async function enviarMensaje(
  paraId: string,
  texto: string,
  adjunto?: AdjuntoEnviado | null,
): Promise<Result<{ mensaje: MensajeDirecto }>> {
  if (!UUID.test(paraId)) return { ok: false, error: 'Contacto inválido.' }
  const limpio = texto.trim()
  if (!limpio && !adjunto) return { ok: false, error: 'El mensaje está vacío.' }
  if (limpio.length > MENSAJE_MAX) return { ok: false, error: `Máximo ${MENSAJE_MAX} caracteres.` }

  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    if (paraId === yo.id) return { ok: false, error: 'No puedes escribirte a ti mismo.' }

    /* La imagen tiene que estar en la carpeta del que envía (la dio
       prepararImagen): nadie puede adjuntar archivos de otro. */
    if (adjunto) {
      const valido = adjunto.ref.startsWith(`sb:${yo.id}/`) && !adjunto.ref.includes('..')
        && (TIPOS_IMAGEN as readonly string[]).includes(adjunto.tipo)
        && adjunto.bytes > 0 && adjunto.bytes <= MAX_BYTES
      if (!valido) return { ok: false, error: 'Imagen inválida.' }
    }

    const { data: destino } = await service
      .from('team_members').select('id').eq('id', paraId).eq('activo', true).maybeSingle()
    if (!destino) return { ok: false, error: 'Esa persona ya no está en el equipo.' }

    const { data, error } = await service
      .from('mensajes_directos')
      .insert({
        de_id: yo.id,
        para_id: paraId,
        texto: limpio,
        ...(adjunto ? {
          adjunto_path: adjunto.ref,
          adjunto_tipo: adjunto.tipo,
          adjunto_ancho: Math.round(adjunto.ancho) || null,
          adjunto_alto: Math.round(adjunto.alto) || null,
          adjunto_bytes: adjunto.bytes,
        } : {}),
      })
      .select(MENSAJE_SELECT)
      .single()
    if (error) {
      if (adjunto) await borrarArchivo(adjunto.ref).catch(() => {})
      throw error
    }

    // Aviso push al destinatario; tocarlo abre el chat con quien escribió.
    const previa = vistaPrevia(limpio, !!adjunto)
    await enviarPushAMiembroId(paraId, {
      title: `💬 ${yo.nombre}`,
      body: previa.length > 140 ? `${previa.slice(0, 137)}…` : previa,
      url: `/inicio?chat=${yo.id}`,
      tag: `chat-${yo.id}`,
    })

    const [mensaje] = await firmar([rowToMensaje(data)])
    return { ok: true, mensaje }
  } catch (e) {
    console.error('[mensajes] enviarMensaje', e)
    return { ok: false, error: 'No se pudo enviar el mensaje.' }
  }
}

/* URL de una imagen que llegó por Realtime (el evento trae la ruta, no la
   URL firmada). Solo para participantes del mensaje. */
export async function urlImagen(mensajeId: string): Promise<Result<{ url: string }>> {
  if (!UUID.test(mensajeId)) return { ok: false, error: 'Mensaje inválido.' }
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    const { data } = await service
      .from('mensajes_directos').select('de_id, para_id, adjunto_path').eq('id', mensajeId).maybeSingle()
    if (!data?.adjunto_path || (data.de_id !== yo.id && data.para_id !== yo.id)) return { ok: false, error: 'No encontrado.' }
    const url = (await urlsDeLectura([data.adjunto_path])).get(data.adjunto_path)
    return url ? { ok: true, url } : { ok: false, error: 'No se pudo cargar la imagen.' }
  } catch (e) {
    console.error('[mensajes] urlImagen', e)
    return { ok: false, error: 'No se pudo cargar la imagen.' }
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
      .update({ leido_at: new Date().toISOString(), entregado_at: new Date().toISOString() })
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

/* ====================== Chat grupal "Equipo Distinto" ======================
   Pedro 24-sep-2026: "me falta una opción para enviar un mensaje general para
   todos". Todo el equipo activo lee y escribe; cada uno lleva su "leído hasta". */

async function resumenGrupo(service: Service, yoId: string): Promise<ChatInicial['grupo']> {
  const [{ data: ult }, { data: lect }] = await Promise.all([
    service.from('mensajes_grupo').select('de_id, texto, adjunto_path, created_at, autor:team_members!mensajes_grupo_de_id_fkey(nombre)')
      .order('created_at', { ascending: false }).limit(1),
    service.from('mensajes_grupo_lecturas').select('leido_hasta').eq('team_member_id', yoId).maybeSingle(),
  ])
  const u = ult?.[0]
  let q = service.from('mensajes_grupo').select('id', { count: 'exact', head: true }).neq('de_id', yoId)
  if (lect?.leido_hasta) q = q.gt('created_at', lect.leido_hasta)
  const { count } = await q
  const autor = Array.isArray(u?.autor) ? u.autor[0] : u?.autor
  return {
    ultimo: u ? { texto: vistaPrevia(u.texto ?? '', !!u.adjunto_path), createdAt: u.created_at, esMio: u.de_id === yoId, deNombre: autor?.nombre ?? null } : null,
    noLeidos: count ?? 0,
  }
}

async function nombresDe(service: Service, ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids)]
  if (!unicos.length) return new Map()
  const { data } = await service.from('team_members').select('id, nombre').in('id', unicos)
  return new Map(((data ?? []) as { id: string; nombre: string }[]).map((m) => [m.id, m.nombre]))
}

export async function getConversacionGrupo(): Promise<Result<{ mensajes: MensajeDirecto[]; lecturas: LecturaGrupo[] }>> {
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    const { data, error } = await service.from('mensajes_grupo').select(MENSAJE_GRUPO_SELECT)
      .order('created_at', { ascending: false }).limit(150)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((data ?? []) as any[]).reverse()
    const nombres = await nombresDe(service, rows.map((r) => r.de_id))
    const [{ data: equipo }, { data: lect }] = await Promise.all([
      service.from('team_members').select('id, nombre').eq('activo', true),
      service.from('mensajes_grupo_lecturas').select('team_member_id, leido_hasta'),
    ])
    const hasta = new Map(((lect ?? []) as { team_member_id: string; leido_hasta: string }[]).map((l) => [l.team_member_id, l.leido_hasta]))
    const lecturas: LecturaGrupo[] = ((equipo ?? []) as { id: string; nombre: string }[]).map((m) => ({ id: m.id, nombre: m.nombre, leidoHasta: hasta.get(m.id) ?? null }))
    return { ok: true, mensajes: await firmar(rows.map((r) => rowToMensajeGrupo(r, nombres.get(r.de_id)))), lecturas }
  } catch (e) {
    console.error('[mensajes] getConversacionGrupo', e)
    return { ok: false, error: 'No se pudo cargar el chat del equipo.' }
  }
}

export async function enviarMensajeGrupo(texto: string, adjunto?: AdjuntoEnviado | null): Promise<Result<{ mensaje: MensajeDirecto }>> {
  const limpio = texto.trim()
  if (!limpio && !adjunto) return { ok: false, error: 'El mensaje está vacío.' }
  if (limpio.length > MENSAJE_MAX) return { ok: false, error: `Máximo ${MENSAJE_MAX} caracteres.` }
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    if (adjunto) {
      const valido = adjunto.ref.startsWith(`sb:${yo.id}/`) && !adjunto.ref.includes('..')
        && (TIPOS_IMAGEN as readonly string[]).includes(adjunto.tipo) && adjunto.bytes > 0 && adjunto.bytes <= MAX_BYTES
      if (!valido) return { ok: false, error: 'Imagen inválida.' }
    }
    const { data, error } = await service.from('mensajes_grupo').insert({
      de_id: yo.id,
      texto: limpio,
      ...(adjunto ? { adjunto_path: adjunto.ref, adjunto_tipo: adjunto.tipo, adjunto_ancho: Math.round(adjunto.ancho) || null, adjunto_alto: Math.round(adjunto.alto) || null, adjunto_bytes: adjunto.bytes } : {}),
    }).select(MENSAJE_GRUPO_SELECT).single()
    if (error) {
      if (adjunto) await borrarArchivo(adjunto.ref).catch(() => {})
      throw error
    }
    // Quien escribe ya lo "leyó".
    await service.from('mensajes_grupo_lecturas').upsert({ team_member_id: yo.id, leido_hasta: data.created_at }, { onConflict: 'team_member_id' })

    // Push a todo el equipo (menos a quien escribe); mismo tag = un aviso por grupo.
    const previa = vistaPrevia(limpio, !!adjunto)
    const { data: equipo } = await service.from('team_members').select('id').eq('activo', true).neq('id', yo.id)
    await Promise.all(((equipo ?? []) as { id: string }[]).map((m) => enviarPushAMiembroId(m.id, {
      title: `💬 ${GRUPO_NOMBRE} · ${yo.nombre}`,
      body: previa.length > 140 ? `${previa.slice(0, 137)}…` : previa,
      url: `/inicio?chat=${GRUPO_ID}`,
      tag: `chat-${GRUPO_ID}`,
    })))

    const [mensaje] = await firmar([rowToMensajeGrupo(data, yo.nombre)])
    return { ok: true, mensaje }
  } catch (e) {
    console.error('[mensajes] enviarMensajeGrupo', e)
    return { ok: false, error: 'No se pudo enviar el mensaje.' }
  }
}

export async function marcarLeidosGrupo(): Promise<Result<object>> {
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    await service.from('mensajes_grupo_lecturas').upsert({ team_member_id: yo.id, leido_hasta: new Date().toISOString() }, { onConflict: 'team_member_id' })
    return { ok: true }
  } catch (e) {
    console.error('[mensajes] marcarLeidosGrupo', e)
    return { ok: false, error: 'No se pudo actualizar.' }
  }
}

/* Nombre del autor + URL de imagen de un mensaje del grupo que llegó por
   Realtime (el evento trae ids y rutas, no nombres ni URLs firmadas). */
export async function detalleMensajeGrupo(id: string): Promise<Result<{ deNombre: string | null; url: string | null }>> {
  if (!UUID.test(id)) return { ok: false, error: 'Mensaje inválido.' }
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    const { data } = await service.from('mensajes_grupo').select('de_id, adjunto_path, autor:team_members!mensajes_grupo_de_id_fkey(nombre)').eq('id', id).maybeSingle()
    if (!data) return { ok: false, error: 'No encontrado.' }
    const autor = Array.isArray(data.autor) ? data.autor[0] : data.autor
    const url = data.adjunto_path ? (await urlsDeLectura([data.adjunto_path])).get(data.adjunto_path) ?? null : null
    return { ok: true, deNombre: autor?.nombre ?? null, url }
  } catch (e) {
    console.error('[mensajes] detalleMensajeGrupo', e)
    return { ok: false, error: 'No se pudo cargar.' }
  }
}

/* Me llegó un mensaje por Realtime → marcarlo entregado (✓✓ gris al que lo mandó). */
export async function marcarEntregados(): Promise<Result<object>> {
  try {
    const service = createServiceClient() as Service
    const yo = await miembroActual(service)
    if (!yo) return { ok: false, error: 'Tu usuario no está en el equipo.' }
    await service.from('mensajes_directos').update({ entregado_at: new Date().toISOString() }).eq('para_id', yo.id).is('entregado_at', null)
    return { ok: true }
  } catch (e) {
    console.error('[mensajes] marcarEntregados', e)
    return { ok: false, error: 'No se pudo actualizar.' }
  }
}
