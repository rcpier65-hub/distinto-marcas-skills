// Regla del tablero /tareas y de los pendientes de /inicio:
// solo el dueño (sin fila en team_members, o el miembro llamado "Pedro")
// ve el trabajo de todo el equipo. El resto ve lo suyo.

export function esDuenoDelTablero(sinFilaTeamMember: boolean, nombre: string | null | undefined): boolean {
  return sinFilaTeamMember || (nombre ?? '').trim().toLowerCase() === 'pedro'
}

export function esDirectorDeAgenda(sinFilaTeamMember: boolean, rolBase: string | null | undefined): boolean {
  if (sinFilaTeamMember) return true
  return rolBase === 'director' || rolBase === 'admin'
}
