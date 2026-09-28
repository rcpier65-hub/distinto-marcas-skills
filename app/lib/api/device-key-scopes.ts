// Alcances de dst_live_. Sin imports de Node: lo usa también el perfil en el cliente.

export const TAREAS_READ_SCOPE = 'tareas:read'

/**
 * Alcance de director/owner: la clave actúa como la sesión de su dueño
 * (mismos módulos y marcas_acceso). Cubre tareas:read y el resto de la API
 * de usuario. `full` y `*` son alias aceptados al validar; al emitir se
 * guarda solo `owner`.
 */
export const OWNER_SCOPE = 'owner'

const OWNER_ALIASES = new Set(['owner', 'full', '*'])

export function scopeSatisfies(scopes: string[], required: string): boolean {
  if (scopes.includes(required)) return true
  return scopes.some((scope) => OWNER_ALIASES.has(scope))
}

export function hasOwnerScope(scopes: string[]): boolean {
  return scopeSatisfies(scopes, OWNER_SCOPE)
}

/** Director, admin, o usuario sin fila en team_members (owner de la agencia). */
export function canIssueOwnerScope(input: { teamMemberId: string | null; rolBase: string | null }): boolean {
  if (!input.teamMemberId) return true
  return input.rolBase === 'director' || input.rolBase === 'admin'
}

export function defaultDeviceKeyScopes(canIssueOwner: boolean): string[] {
  return canIssueOwner ? [OWNER_SCOPE] : [TAREAS_READ_SCOPE]
}

export function parseReplacementScopes(value: unknown): { ok: true; scopes: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length !== 1 || typeof value[0] !== 'string') {
    return { ok: false, error: 'scopes debe ser ["owner"] o ["tareas:read"]' }
  }
  if (value[0] === OWNER_SCOPE || value[0] === TAREAS_READ_SCOPE) {
    return { ok: true, scopes: [value[0]] }
  }
  return { ok: false, error: 'scopes debe ser ["owner"] o ["tareas:read"]' }
}
