// app/app/reportes/_actions.ts
'use server'

// Candado por código para los reportes (Pedro 11-ago-2026: "no todos pueden
// ver"). El código se valida EN EL SERVIDOR y el desbloqueo vive en una cookie
// httpOnly — el código nunca llega al bundle del navegador. Aplica tanto al
// módulo interno /reportes como a la sección de reporte del portal del cliente.
// Se puede sobreescribir con la env var REPORTES_PIN sin tocar código.

import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth/get-user'

const PIN_COOKIE = 'reportes_pin'
const PIN_TTL_SEG = 60 * 60 * 12 // 12 horas — luego vuelve a pedir el código

function pinReal(): string {
  return (process.env.REPORTES_PIN || '8990').trim()
}

export async function verificarPinReportes(pin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  if ((pin ?? '').trim() !== pinReal()) {
    return { ok: false, error: 'Código incorrecto' }
  }
  const jar = await cookies()
  jar.set(PIN_COOKIE, 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: PIN_TTL_SEG,
    path: '/',
  })
  return { ok: true }
}

/** ¿La sesión ya desbloqueó los reportes? (para server components) */
export async function pinReportesOk(): Promise<boolean> {
  const jar = await cookies()
  return jar.get(PIN_COOKIE)?.value === 'ok'
}
