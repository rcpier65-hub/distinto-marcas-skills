// app/lib/tareas/types.ts

export type FocusLane = 'ia' | 'manual' | 'delegar'

export type Tarea = {
  id: string
  teamMemberId: string | null     // dueño / asignado
  teamMemberNombre: string | null // nombre del dueño (para vista CEO)
  createdBy: string | null
  texto: string
  categoria: string               // columna (entidad: cliente/marca/persona)
  color: string
  completada: boolean
  focusLane: FocusLane | null      // null = en el board
  createdAt: string
  completadaAt: string | null      // cuándo se marcó lista (para el historial/archivo)
  marcaSlug: string | null         // marca elegida rápido (puente a Diseños)
  disenoId: string | null          // si se mandó a "Diseños para hoy", la publicacion creada
}
