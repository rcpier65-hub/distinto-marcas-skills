/* "Hoy" en hora de Lima (America/Lima), formato YYYY-MM-DD.

   USAR SIEMPRE esto para el día actual — NUNCA new Date().toISOString().slice(0,10)
   (que es UTC): después de las 7pm de Lima el UTC ya cambió de día, y eso hace
   que las tareas marcadas "para hoy" desaparezcan de la lista del día.
   Regla del proyecto (Pedro). */

export function ymdLima(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/* Atajo: la fecha de hoy (Lima) como 'YYYY-MM-DD'. */
export function hoyLima(): string {
  return ymdLima(new Date())
}
