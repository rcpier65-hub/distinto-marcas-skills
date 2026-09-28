/* Tipos del chat interno (mensajes directos 1 a 1 entre miembros del equipo). */

export type Adjunto = {
  ref: string            // 'sb:chat/<de_id>/<uuid>.webp'
  tipo: string           // image/webp, image/jpeg…
  ancho: number | null
  alto: number | null
  url: string | null     // URL firmada de lectura (la pone el servidor)
}

/* Id especial de la conversación grupal "Equipo Distinto". */
export const GRUPO_ID = 'equipo'
export const GRUPO_NOMBRE = 'Equipo Distinto'

export type MensajeDirecto = {
  id: string
  deId: string
  /* Solo en el grupo: nombre de quien escribió. */
  deNombre?: string | null
  paraId: string
  texto: string
  leidoAt: string | null
  /* Le llegó a la app de la otra persona (✓✓ gris). */
  entregadoAt: string | null
  createdAt: string
  adjunto: Adjunto | null
}

/* Estado de un mensaje mío: ✓ enviado · ✓✓ entregado · ✓✓ azul leído. */
export type EstadoEnvio = 'enviado' | 'entregado' | 'leido'
export function estadoEnvio(m: Pick<MensajeDirecto, 'leidoAt' | 'entregadoAt'>): EstadoEnvio {
  return m.leidoAt ? 'leido' : m.entregadoAt ? 'entregado' : 'enviado'
}

/* Lo que está haciendo la persona (se muestra bajo su nombre). */
export type ActividadChat = { tipo: 'editando' | 'disenando' | 'tarea'; texto: string; marca: string | null; desde?: string | null }

/* Hasta cuándo leyó cada miembro el grupo (para el visto del grupo). */
export type LecturaGrupo = { id: string; nombre: string; leidoHasta: string | null }

export type ContactoChat = {
  id: string
  nombre: string
  avatarUrl: string | null
  rolBase: string | null
  ultimo: { texto: string; createdAt: string; esMio: boolean; estado?: EstadoEnvio } | null
  noLeidos: number
  actividad?: ActividadChat | null
}

export type ChatInicial = {
  yo: { id: string; nombre: string }
  contactos: ContactoChat[]
  /* Chat grupal de todo el equipo. */
  grupo: { ultimo: { texto: string; createdAt: string; esMio: boolean; deNombre: string | null } | null; noLeidos: number }
  totalNoLeidos: number
}

/* Lo que el navegador manda al enviar una imagen ya subida. */
export type AdjuntoEnviado = { ref: string; tipo: string; ancho: number; alto: number; bytes: number }

export const MENSAJE_SELECT = 'id, de_id, para_id, texto, leido_at, entregado_at, created_at, adjunto_path, adjunto_tipo, adjunto_ancho, adjunto_alto'
export const MENSAJE_MAX = 4000

/* Texto de vista previa (lista de chats, push): "📷 Foto" si es imagen. */
export function vistaPrevia(texto: string, conAdjunto: boolean): string {
  const t = texto.trim()
  if (!conAdjunto) return t
  return t ? `📷 ${t}` : '📷 Foto'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToMensaje(r: any): MensajeDirecto {
  return {
    id: r.id,
    deId: r.de_id,
    paraId: r.para_id,
    texto: r.texto ?? '',
    leidoAt: r.leido_at ?? null,
    entregadoAt: r.entregado_at ?? r.leido_at ?? null,
    createdAt: r.created_at,
    adjunto: r.adjunto_path
      ? { ref: r.adjunto_path, tipo: r.adjunto_tipo ?? 'image/webp', ancho: r.adjunto_ancho ?? null, alto: r.adjunto_alto ?? null, url: null }
      : null,
  }
}

export const MENSAJE_GRUPO_SELECT = 'id, de_id, texto, created_at, adjunto_path, adjunto_tipo, adjunto_ancho, adjunto_alto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToMensajeGrupo(r: any, deNombre?: string | null): MensajeDirecto {
  return { ...rowToMensaje({ ...r, para_id: GRUPO_ID, leido_at: null }), deNombre: deNombre ?? null }
}
