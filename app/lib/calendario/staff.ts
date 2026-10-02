// app/lib/calendario/staff.ts
/* Staff de Distinto Studio invitable con un toque desde el asistente de
   agenda (correos personales de Google Calendar). Pedro 31-ago-2026. */
export const STAFF_DISTINTO: Array<{ nombre: string; rol: string; email: string }> = [
  { nombre: 'Erick',  rol: 'Director',     email: 'erickramirezgarcia15@gmail.com' },
  { nombre: 'Lorena', rol: 'Social media', email: 'lorechavarry@gmail.com' },
  { nombre: 'Ailyn',  rol: 'Diseño',       email: 'isaguirre0803@gmail.com' },
  { nombre: 'Pieer',  rol: 'Editor',       email: 'pieermedina99@gmail.com' },
  { nombre: 'Feling', rol: 'Sistemas',     email: 'reyescalderonfeling@gmail.com' },
]

/* Correo de calendario de un miembro: el personal del staff si lo hay
   (primer nombre), si no el de su cuenta. */
export function correoCalendarioDe(nombre: string, emailCuenta: string | null | undefined): string | null {
  const primero = (nombre ?? '').trim().split(/\s+/)[0]?.toLowerCase()
  const s = STAFF_DISTINTO.find((x) => x.nombre.toLowerCase() === primero)
  return s?.email ?? emailCuenta ?? null
}
