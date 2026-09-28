import 'server-only'

// Persistencia de api_device_keys. Las rutas usan el service role.
// El rol authenticated puede leer metadata propia (RLS) y no tiene GRANT sobre key_hash.

import { createServiceClient } from '@/lib/supabase/service'
import { hashDeviceApiKey } from '@/lib/api/device-key-token'
import { canIssueOwnerScope } from '@/lib/api/device-key-scopes'

export {
  TAREAS_READ_SCOPE,
  OWNER_SCOPE,
  scopeSatisfies,
  hasOwnerScope,
  canIssueOwnerScope,
  defaultDeviceKeyScopes,
  parseReplacementScopes,
} from '@/lib/api/device-key-scopes'

export type KeyIssuer = {
  teamMemberId: string | null
  rolBase: string | null
  canIssueOwner: boolean
}

export type DeviceKeyPublic = {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked: boolean
  scopes: string[]
}

type DbError = { code?: string; message?: string } | null

type KeyRow = {
  id: string
  user_id: string
  team_member_id: string | null
  scopes: unknown
  revoked_at: string | null
}

export type DeviceKeyAuth =
  | { ok: true; keyId: string; userId: string; teamMemberId: string | null; scopes: string[] }
  | { ok: false; status: 401 | 500; error: string }

function missingTable(error: DbError): boolean {
  if (!error) return false
  const msg = error.message ?? ''
  return error.code === 'PGRST205' || error.code === '42P01' || msg.includes('api_device_keys')
}

function asScopes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function service(): { client: ReturnType<typeof createServiceClient> } | { error: string } {
  try {
    return { client: createServiceClient() }
  } catch {
    return { error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }
  }
}

export function toPublicKey(row: {
  id: string
  name: string
  key_prefix: string
  scopes: unknown
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}): DeviceKeyPublic {
  return {
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    revoked: row.revoked_at != null,
    scopes: asScopes(row.scopes),
  }
}

const MISSING_TABLE_ERROR = 'Falta la tabla api_device_keys. Aplicá la migration en Supabase.'

export async function authenticateDeviceKey(token: string): Promise<DeviceKeyAuth> {
  const db = service()
  if ('error' in db) return { ok: false, status: 500, error: db.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = db.client as any
  const { data, error } = await svc
    .from('api_device_keys')
    .select('id, user_id, team_member_id, scopes, revoked_at')
    .eq('key_hash', hashDeviceApiKey(token))
    .maybeSingle()

  if (error) {
    if (missingTable(error)) return { ok: false, status: 500, error: MISSING_TABLE_ERROR }
    return { ok: false, status: 500, error: error.message }
  }

  const row = data as KeyRow | null
  if (!row || row.revoked_at) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const now = new Date().toISOString()
  const { error: touchError } = await svc
    .from('api_device_keys')
    .update({ last_used_at: now })
    .eq('id', row.id)
    .is('revoked_at', null)
  if (touchError && !missingTable(touchError)) {
    console.error('api_device_keys last_used_at', touchError.message)
  }

  return {
    ok: true,
    keyId: row.id,
    userId: row.user_id,
    teamMemberId: row.team_member_id,
    scopes: asScopes(row.scopes),
  }
}

export async function listDeviceKeys(userId: string): Promise<
  { ok: true; keys: DeviceKeyPublic[] } | { ok: false; status: number; error: string }
> {
  const db = service()
  if ('error' in db) return { ok: false, status: 500, error: db.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = db.client as any
  const { data, error } = await svc
    .from('api_device_keys')
    .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    if (missingTable(error)) return { ok: false, status: 500, error: MISSING_TABLE_ERROR }
    return { ok: false, status: 500, error: error.message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keys = ((data ?? []) as any[]).map((row) => toPublicKey(row))
  return { ok: true, keys }
}

export async function loadKeyIssuer(userId: string): Promise<
  { ok: true; issuer: KeyIssuer } | { ok: false; status: number; error: string }
> {
  const db = service()
  if ('error' in db) return { ok: false, status: 500, error: db.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = db.client as any
  const { data, error } = await svc
    .from('team_members')
    .select('id, activo, rol_base')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) return { ok: false, status: 500, error: error.message }
  if (data && data.activo === false) {
    return { ok: false, status: 403, error: 'Miembro desactivado' }
  }

  const teamMemberId = (data?.id as string | undefined) ?? null
  const rolBase = typeof data?.rol_base === 'string' ? data.rol_base : null
  return {
    ok: true,
    issuer: {
      teamMemberId,
      rolBase,
      canIssueOwner: canIssueOwnerScope({ teamMemberId, rolBase }),
    },
  }
}

export async function loadOwnerTeamMember(userId: string): Promise<
  | { ok: true; teamMemberId: string | null }
  | { ok: false; status: number; error: string }
> {
  const loaded = await loadKeyIssuer(userId)
  if (!loaded.ok) return loaded
  return { ok: true, teamMemberId: loaded.issuer.teamMemberId }
}
