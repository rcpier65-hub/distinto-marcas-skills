/* Quién ve y edita cada nota de Notas y reuniones. Pedro 24-sep-2026.
   - Nota del EQUIPO (privada=false): la ve y la puede completar todo el equipo.
   - Nota PRIVADA: solo su autor (ni otros directores).
   - Solo el super admin puede marcar notas como privadas. */

export const SUPER_ADMIN_EMAILS = ['pedro@agenciadistinto.com']

export function esSuperAdmin(email: string | null | undefined): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

type FilaNota = { team_member_id?: string | null; privada?: boolean | null }

export function puedeVerNota(row: FilaNota, meId: string | null): boolean {
  return !row.privada || (!!meId && row.team_member_id === meId)
}

/* Borrar: el autor, o un director si la nota es del equipo. */
export function puedeBorrarNota(row: FilaNota, meId: string | null, esDirector: boolean): boolean {
  if (meId && row.team_member_id === meId) return true
  return esDirector && !row.privada
}
