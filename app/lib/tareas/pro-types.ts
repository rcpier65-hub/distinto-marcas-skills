// app/lib/tareas/pro-types.ts
// Tipos de la vista PLAN de tareas — importables desde client components
// (la parte de BD vive en pro-db.ts, que es server-only).

export type EstadoTarea = 'sin_empezar' | 'en_proceso' | 'archivado'
export const ESTADOS_TAREA: EstadoTarea[] = ['sin_empezar', 'en_proceso', 'archivado']

export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  sin_empezar: 'Sin empezar',
  en_proceso: 'En proceso',
  archivado: 'Archivado',
}
