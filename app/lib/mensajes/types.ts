/* Tipos del chat interno (mensajes directos 1 a 1 entre miembros del equipo). */

export type MensajeDirecto = {
  id: string
  deId: string
  paraId: string
  texto: string
  leidoAt: string | null
  createdAt: string
}

export type ContactoChat = {
  id: string
  nombre: string
  avatarUrl: string | null
  rolBase: string | null
  ultimo: { texto: string; createdAt: string; esMio: boolean } | null
  noLeidos: number
}

export type ChatInicial = {
  yo: { id: string; nombre: string }
  contactos: ContactoChat[]
  totalNoLeidos: number
}

export const MENSAJE_SELECT = 'id, de_id, para_id, texto, leido_at, created_at'
export const MENSAJE_MAX = 4000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToMensaje(r: any): MensajeDirecto {
  return {
    id: r.id,
    deId: r.de_id,
    paraId: r.para_id,
    texto: r.texto,
    leidoAt: r.leido_at ?? null,
    createdAt: r.created_at,
  }
}
