// app/lib/utils/is-redirect-error.ts
//
// Detecta el error especial NEXT_REDIRECT que lanza `redirect()` de Next.js.
//
// ⚠️ CRÍTICO (Pedro 26-jun-2026): cuando un client component llama a una server
// action que hace `redirect()` (crear / duplicar / borrar publicación) DENTRO
// de un try/catch, el catch se traga el NEXT_REDIRECT. Consecuencias en cadena:
//   1. Se muestra "Error: NEXT_REDIRECT" (falso error).
//   2. La navegación/refresh NO ocurre.
//   3. La acción YA corrió (la fila se creó/borró antes del redirect) → el
//      usuario cree que falló, reintenta y crea DUPLICADOS; o cree que el
//      borrado "no funciona" porque la lista no se refresca.
//
// Solución: en el catch, si es una redirección, RE-LANZARLA para que Next la
// procese y navegue. Solo los errores REALES llegan al toast.
export function esRedireccion(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const err = e as { digest?: unknown; message?: unknown }
  return (typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT'))
    || err.message === 'NEXT_REDIRECT'
}
