// app/app/oficina/_actions.ts
'use server'

// Acciones de la oficina virtual: guardar el avatar y reclamar escritorio.
// El avatar vive en la base (no en el navegador) para que se vea igual desde
// cualquier computadora. Pedro 31-ago-2026.

import { requireUser } from '@/lib/auth/get-user'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { guardarAvatarDb, reclamarEscritorioDb, leerPerfilesDb, type PerfilOficina } from '@/lib/oficina/db'

type Ok = { ok: true } | { ok: false; error: string }

const CLAVES = ['piel', 'pelo', 'peinado', 'ropa', 'accesorio'] as const

async function miNombre(): Promise<string> {
  try {
    const p = await getCurrentMemberPermisos()
    if (p?.member?.nombre) return p.member.nombre
  } catch { /* usa el correo */ }
  const u = await requireUser()
  return u.email?.split('@')[0] ?? 'Alguien'
}

export async function guardarAvatarOficina(avatar: Record<string, string>): Promise<Ok> {
  const user = await requireUser()
  /* Solo dejamos pasar las 5 claves conocidas y como texto corto: esto lo
     manda el navegador, no se confía en la forma. */
  const limpio: Record<string, string> = {}
  for (const k of CLAVES) {
    const v = avatar?.[k]
    if (typeof v === 'string' && v.length <= 24) limpio[k] = v
  }
  if (Object.keys(limpio).length !== CLAVES.length) return { ok: false, error: 'Avatar incompleto' }
  try {
    await guardarAvatarDb(user.id, await miNombre(), limpio)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function reclamarEscritorio(escritorio: string | null): Promise<Ok> {
  const user = await requireUser()
  const e = escritorio ? String(escritorio).trim().slice(0, 40) : null
  try {
    await reclamarEscritorioDb(user.id, await miNombre(), e)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function leerPerfilesOficina(): Promise<PerfilOficina[]> {
  await requireUser()
  return leerPerfilesDb()
}
