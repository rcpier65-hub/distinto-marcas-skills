// app/lib/portal/coordinacion.ts
// Datos de coordinación del portal del cliente:
//   - Observaciones  (cliente → equipo)
//   - Reuniones      (equipo → cliente)
//   - Grabaciones    (se leen de la tabla `grabaciones` existente)
// Pedro 15-jul-2026.

export type Observacion = {
  id: string
  autorNombre: string | null
  texto: string
  atendida: boolean
  createdAt: string
}

export type Reunion = {
  id: string
  titulo: string
  fechaHora: string
  modalidad: 'virtual' | 'presencial'
  lugarEnlace: string | null
  notas: string | null
  estado: 'agendada' | 'realizada' | 'cancelada'
}

export type GrabacionCliente = {
  id: string
  fechaPlaneada: string
  horaPlaneada: string | null
  fechaReal: string | null
  estado: 'planeada' | 'cumplida' | 'cancelada'
  videosGrabados: number | null
  notas: string | null
  agendadaPorCliente: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getObservacionesMarca(service: any, marcaId: string, limit = 200): Promise<Observacion[]> {
  const { data } = await service
    .from('marca_observaciones')
    .select('id, autor_nombre, texto, atendida, created_at')
    .eq('marca_id', marcaId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .then((r: unknown) => r, () => ({ data: [] }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (((data as any) ?? []) as any[]).map((r) => ({
    id: r.id as string,
    autorNombre: (r.autor_nombre ?? null) as string | null,
    texto: (r.texto ?? '') as string,
    atendida: !!r.atendida,
    createdAt: r.created_at as string,
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getReunionesMarca(service: any, marcaId: string, limit = 100): Promise<Reunion[]> {
  const { data } = await service
    .from('marca_reuniones')
    .select('id, titulo, fecha_hora, modalidad, lugar_enlace, notas, estado')
    .eq('marca_id', marcaId)
    .order('fecha_hora', { ascending: true })
    .limit(limit)
    .then((r: unknown) => r, () => ({ data: [] }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (((data as any) ?? []) as any[]).map((r) => ({
    id: r.id as string,
    titulo: (r.titulo ?? '') as string,
    fechaHora: r.fecha_hora as string,
    modalidad: (r.modalidad === 'presencial' ? 'presencial' : 'virtual') as 'virtual' | 'presencial',
    lugarEnlace: (r.lugar_enlace ?? null) as string | null,
    notas: (r.notas ?? null) as string | null,
    estado: (['agendada', 'realizada', 'cancelada'].includes(r.estado) ? r.estado : 'agendada') as Reunion['estado'],
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getGrabacionesMarca(service: any, marcaId: string, limit = 60): Promise<GrabacionCliente[]> {
  const { data } = await service
    .from('grabaciones')
    .select('id, fecha_planeada, hora_planeada, fecha_real, estado, videos_grabados, notas, agendada_por_cliente')
    .eq('marca_id', marcaId)
    .order('fecha_planeada', { ascending: false })
    .limit(limit)
    .then((r: unknown) => r, () => ({ data: [] }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (((data as any) ?? []) as any[]).map((r) => ({
    id: r.id as string,
    fechaPlaneada: r.fecha_planeada as string,
    horaPlaneada: (r.hora_planeada ?? null) as string | null,
    fechaReal: (r.fecha_real ?? null) as string | null,
    estado: (['planeada', 'cumplida', 'cancelada'].includes(r.estado) ? r.estado : 'planeada') as GrabacionCliente['estado'],
    videosGrabados: (r.videos_grabados ?? null) as number | null,
    notas: (r.notas ?? null) as string | null,
    agendadaPorCliente: !!r.agendada_por_cliente,
  }))
}
