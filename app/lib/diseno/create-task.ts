import { createHash, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// La misma solicitud del mismo usuario siempre llega a la misma clave primaria.
// La restricción de Postgres evita duplicados incluso con peticiones concurrentes.
export function idDeSolicitudDiseno(userId: string, solicitudId?: string): string {
  if (!solicitudId) return randomUUID() // compatibilidad con clientes ya abiertos
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(solicitudId)) {
    throw new Error('La solicitud no es válida. Cierra el formulario y vuelve a abrirlo.')
  }
  const hex = createHash('sha256').update(`distinto:diseno:${userId}:${solicitudId.toLowerCase()}`).digest('hex')
  const variant = ((parseInt(hex[16], 16) & 3) | 8).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export async function insertarDisenoUnaVez(service: SupabaseClient, payload: Record<string, unknown>) {
  const insert = { ...payload }
  const crear = () => service.from('publicaciones').insert(insert).select('id, marcas_extra').single()
  let result = await crear()
  if (result.error && (result.error.code === '42703' || /descripcion|fecha_entrega|reunion_hora|invitados_emails|marcas_extra/i.test(result.error.message ?? ''))) {
    // Mantener el MISMO id si hay que reintentar por columnas aún no migradas.
    for (const column of ['descripcion', 'fecha_entrega', 'reunion_hora', 'invitados_emails', 'marcas_extra']) delete insert[column]
    result = await service.from('publicaciones').insert(insert).select('id').single()
  }
  if (result.error?.code === '23505') {
    // Un reintento no debe sobrescribir una tarea que el equipo ya empezó a editar.
    const existing = await service.from('publicaciones').select('id')
      .eq('id', insert.id).eq('created_by', insert.created_by).eq('es_tarea_diseno', true).maybeSingle()
    if (existing.data && !existing.error) return { data: existing.data, error: null }
  }
  return result
}
