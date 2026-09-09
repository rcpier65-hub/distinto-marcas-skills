// Tipos del módulo Notas y reuniones (/notas-reuniones).

export type NotaEstado = 'borrador' | 'en_curso' | 'finalizada'

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export type NotaReunion = {
  id: string
  teamMemberId: string | null
  titulo: string
  cuerpo: string
  transcript: string
  chat: ChatMessage[]
  estado: NotaEstado
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
  autorNombre?: string
}

export type ProximaItem = {
  id: string
  titulo: string
  startsAt: string // ISO
  endsAt: string | null
  fuente: 'marca_reuniones' | 'google_calendar' | 'nota'
  meetLink?: string | null
}

export const NOTA_SELECT =
  'id, team_member_id, titulo, cuerpo, transcript, chat, estado, started_at, ended_at, created_at, updated_at'

export function parseChat(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  const out: ChatMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue
    const o = m as Record<string, unknown>
    const role = o.role === 'assistant' || o.role === 'system' || o.role === 'user' ? o.role : null
    const content = typeof o.content === 'string' ? o.content : ''
    if (!role || !content) continue
    out.push({
      id: typeof o.id === 'string' ? o.id : crypto.randomUUID(),
      role,
      content,
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
    })
  }
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToNota(row: any, autorNombre?: string): NotaReunion {
  return {
    id: row.id as string,
    teamMemberId: (row.team_member_id ?? null) as string | null,
    titulo: (row.titulo ?? 'Nueva nota') as string,
    cuerpo: (row.cuerpo ?? '') as string,
    transcript: (row.transcript ?? '') as string,
    chat: parseChat(row.chat),
    estado: (['borrador', 'en_curso', 'finalizada'].includes(row.estado) ? row.estado : 'borrador') as NotaEstado,
    startedAt: (row.started_at ?? null) as string | null,
    endedAt: (row.ended_at ?? null) as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    autorNombre,
  }
}
