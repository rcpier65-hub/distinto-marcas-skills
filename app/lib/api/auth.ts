import 'server-only'

// app/lib/api/auth.ts
//
// - checkApiBearer: solo CRON_SECRET (rutinas existentes; no cambiar).
// - resolveV1Actor: cookie de sesión, JWT de Supabase, o clave dst_live_.
//   Las rutas nuevas de Nay usan esto. CRON_SECRET no abre estas rutas.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/get-user'
import { authenticateDeviceKey } from '@/lib/api/device-keys'
import { isDeviceApiKeyToken } from '@/lib/api/device-key-token'
import { scopeSatisfies } from '@/lib/api/device-key-scopes'

export function checkApiBearer(request: Request): { ok: true } | { response: NextResponse } {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Unauthorized: necesita header Authorization: Bearer <token>' },
        { status: 401 },
      ),
    }
  }
  return { ok: true }
}

export type V1Actor =
  | { kind: 'session' | 'jwt'; userId: string }
  | {
      kind: 'device'
      userId: string
      teamMemberId: string | null
      scopes: string[]
    }

const UNAUTHORIZED =
  'Unauthorized: necesitás sesión de Distinto, Authorization: Bearer <access_token> o Bearer <dst_live_…>'

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: UNAUTHORIZED }, { status: 401 })
}

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

async function userIdFromSupabaseJwt(token: string): Promise<
  { ok: true; userId: string } | { ok: false; kind: 'invalid' | 'misconfigured' }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return { ok: false, kind: 'misconfigured' }

  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { ok: false, kind: 'invalid' }
  return { ok: true, userId: data.user.id }
}

/**
 * 1. Sin header Authorization → cookie de sesión (getUser).
 * 2. Bearer dst_live_… → clave de dispositivo. No se reintenta como JWT.
 * 3. Otro Bearer → access token de Supabase. CRON_SECRET no cuenta.
 */
export async function resolveV1Actor(
  request: Request,
): Promise<{ ok: true; actor: V1Actor } | { response: NextResponse }> {
  const header = request.headers.get('authorization')
  if (header == null) {
    const user = await getUser()
    if (!user) return { response: unauthorized() }
    return { ok: true, actor: { kind: 'session', userId: user.id } }
  }

  const token = bearerToken(request)
  if (!token) return { response: unauthorized() }

  if (isDeviceApiKeyToken(token)) {
    const found = await authenticateDeviceKey(token)
    if (!found.ok) {
      const error = found.status === 401 ? UNAUTHORIZED : found.error
      return { response: jsonError(error, found.status) }
    }
    return {
      ok: true,
      actor: {
        kind: 'device',
        userId: found.userId,
        teamMemberId: found.teamMemberId,
        scopes: found.scopes,
      },
    }
  }

  const cron = process.env.CRON_SECRET
  if (cron && token === cron) {
    return { response: jsonError('Unauthorized: esta ruta no acepta CRON_SECRET', 401) }
  }

  const jwt = await userIdFromSupabaseJwt(token)
  if (!jwt.ok) {
    if (jwt.kind === 'misconfigured') {
      return { response: jsonError('Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY', 500) }
    }
    return { response: unauthorized() }
  }
  return { ok: true, actor: { kind: 'jwt', userId: jwt.userId } }
}

/** Sesión o JWT para crear y revocar claves. Rechaza dst_live_ y CRON_SECRET. */
export async function resolveDeviceKeyOwner(
  request: Request,
): Promise<{ ok: true; userId: string } | { response: NextResponse }> {
  const header = request.headers.get('authorization')
  if (header != null) {
    const token = bearerToken(request)
    if (!token) return { response: unauthorized() }
    if (isDeviceApiKeyToken(token)) {
      return {
        response: jsonError(
          'Las claves de dispositivo no pueden crear, listar ni revocar claves. Entrá a Distinto con tu sesión.',
          401,
        ),
      }
    }
    const cron = process.env.CRON_SECRET
    if (cron && token === cron) return { response: unauthorized() }
    const jwt = await userIdFromSupabaseJwt(token)
    if (!jwt.ok) {
      if (jwt.kind === 'misconfigured') {
        return { response: jsonError('Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY', 500) }
      }
      return { response: unauthorized() }
    }
    return { ok: true, userId: jwt.userId }
  }

  const user = await getUser()
  if (!user) return { response: unauthorized() }
  return { ok: true, userId: user.id }
}

export function deviceScopeAllows(actor: V1Actor, required: string): boolean {
  switch (actor.kind) {
    case 'session':
    case 'jwt':
      return true
    case 'device':
      return scopeSatisfies(actor.scopes, required)
    default: {
      const _never: never = actor
      return _never
    }
  }
}

export function jsonApiError(error: string, status: number): NextResponse {
  return jsonError(error, status)
}
