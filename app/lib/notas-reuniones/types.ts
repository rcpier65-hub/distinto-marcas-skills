// Tipos del módulo Notas y reuniones (/notas-reuniones).

export type NotaEstado = 'borrador' | 'en_curso' | 'finalizada'

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

/* Tarea propuesta por la IA al mejorar las notas; el usuario la aprueba y
   se crea en Tareas (tareaId queda seteado). */
export type AccionNota = {
  id: string
  texto: string
  responsableId: string | null
  responsableNombre: string | null
  fecha: string | null      // YYYY-MM-DD
  /* Marca a la que va la tarea (sale en el trabajo de esa marca). */
  marcaId: string | null
  tareaId: string | null
}

export type Plantilla = 'general' | 'cliente' | 'grabacion' | 'interna'

export const PLANTILLAS: { id: Plantilla; nombre: string; descripcion: string }[] = [
  { id: 'general', nombre: 'General', descripcion: 'Resumen, decisiones y próximos pasos' },
  { id: 'cliente', nombre: 'Reunión con cliente', descripcion: 'Necesidades, feedback, acuerdos, pendientes del cliente' },
  { id: 'grabacion', nombre: 'Planeación de grabación', descripcion: 'Ideas de contenido, locación, guiones, logística' },
  { id: 'interna', nombre: 'Reunión interna', descripcion: 'Estado por persona, bloqueos, prioridades' },
]

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
  marcaId: string | null
  marcaReunionId: string | null
  googleEventId: string | null
  reunionInicio: string | null
  meetLink: string | null
  modalidad: 'presencial' | 'virtual' | null
  plantilla: Plantilla
  resumen: string | null
  acciones: AccionNota[]
  enhancedAt: string | null
}

export type ProximaItem = {
  id: string
  titulo: string
  startsAt: string // ISO
  endsAt: string | null
  fuente: 'marca_reuniones' | 'google_calendar' | 'nota'
  meetLink?: string | null
  marcaId?: string | null
  /* Nota ya creada para esta reunión (para abrirla en vez de crear otra). */
  notaId?: string | null
}

export const NOTA_SELECT =
  'id, team_member_id, titulo, cuerpo, transcript, chat, estado, started_at, ended_at, created_at, updated_at, marca_id, marca_reunion_id, google_event_id, reunion_inicio, meet_link, modalidad, plantilla, resumen, acciones, enhanced_at'

export function parseAcciones(raw: unknown): AccionNota[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((a) => {
    if (!a || typeof a !== 'object') return []
    const o = a as Record<string, unknown>
    const texto = typeof o.texto === 'string' ? o.texto.trim() : ''
    if (!texto) return []
    return [{
      id: typeof o.id === 'string' ? o.id : crypto.randomUUID(),
      texto,
      responsableId: typeof o.responsableId === 'string' ? o.responsableId : null,
      responsableNombre: typeof o.responsableNombre === 'string' ? o.responsableNombre : null,
      fecha: typeof o.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.fecha) ? o.fecha : null,
      marcaId: typeof o.marcaId === 'string' ? o.marcaId : null,
      tareaId: typeof o.tareaId === 'string' ? o.tareaId : null,
    }]
  })
}

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
    marcaId: (row.marca_id ?? null) as string | null,
    marcaReunionId: (row.marca_reunion_id ?? null) as string | null,
    googleEventId: (row.google_event_id ?? null) as string | null,
    reunionInicio: (row.reunion_inicio ?? null) as string | null,
    meetLink: (row.meet_link ?? null) as string | null,
    modalidad: row.modalidad === 'presencial' || row.modalidad === 'virtual' ? row.modalidad : null,
    plantilla: (['general', 'cliente', 'grabacion', 'interna'].includes(row.plantilla) ? row.plantilla : 'general') as Plantilla,
    resumen: (row.resumen ?? null) as string | null,
    acciones: parseAcciones(row.acciones),
    enhancedAt: (row.enhanced_at ?? null) as string | null,
  }
}
