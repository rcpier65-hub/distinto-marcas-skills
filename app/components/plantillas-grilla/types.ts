// app/components/plantillas-grilla/types.ts
// Tipo común para todas las plantillas de grilla.
// Las publicaciones llegan desde la BD `publicaciones` filtradas por marca + semana.

export type GrillaPublicacionLite = {
  id: string
  titulo: string
  fecha: string  // YYYY-MM-DD
  plataformas: string[]
  tipo_contenido: string[]
}
