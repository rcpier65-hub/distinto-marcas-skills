// app/lib/api/auth.ts
//
// Helper común para endpoints /api/v1/*.
// - checkApiBearer: solo CRON_SECRET (endpoints de rutinas existentes; no cambiar).
// - resolveApiCaller: clave de dispositivo dst_live_, JWT de Supabase, o CRON_SECRET
//   de servidor (GET /api/v1/tareas). Kairos usa la clave de dispositivo.
// - resolveDeviceKeyOwner: sesión cookie o JWT de usuario. No acepta dst_live_ ni CRON_SECRET.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/get-user'
import { authenticateDeviceKey, OWNER_SCOPE, scopeSatisfies } from '@/lib/api/device-keys'
import { isDeviceApiKeyToken } from '@/lib/api/device-key-token'

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

/** Quién llama a un endpoint que acepta usuario, dispositivo o rutina. */
export type ApiCaller =
  | { kind: 'cron' }
  | { kind: 'user'; userId: string }
  | {
      kind: 'device'
      userId: string
      /** Membresía guardada en la clave. NULL = se emitió con alcance CEO. */
      teamMemberId: string | null
      scopes: string[]
    }

const UNAUTHORIZED_MSG =
  'Unauthorized: necesita Authorization: Bearer <dst_live_…> o Bearer <supabase access_token>'

const SESSION_UNAUTHORIZED_MSG =
  'Unauthorized: necesitás iniciar sesión en Distinto o mandar Authorization: Bearer <supabase access_token>'

export const DEVICE_KEY_NEEDS_OWNER =
  'La clave de dispositivo solo tiene tareas:read. En Perfil → Kairos ampliá el alcance a owner (el token dst_live_ no cambia) o creá una clave nueva.'

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: UNAUTHORIZED_MSG }, { status: 401 })
}

function unauthorizedSession(): NextResponse {
  return NextResponse.json({ ok: false, error: SESSION_UNAUTHORIZED_MSG }, { status: 401 })
}

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
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

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Auth para GET /api/v1/tareas (y otros endpoints de usuario).
 *
 * 1. `Bearer dst_live_…` → clave de dispositivo. Rechaza revocadas, actualiza
 *    last_used_at y devuelve el dueño. Si `requiredScope` no está en la clave → 403.
 *    El alcance `owner` (o alias `full` / `*`) cubre cualquier scope, incluido `tareas:read`.
 * 2. `Bearer <CRON_SECRET>` → `{ kind: 'cron' }` solo para rutinas de servidor.
 * 3. Cualquier otro bearer se valida como JWT de Supabase (`auth.getUser`).
 *
 * Una clave dst_live_ inválida no se reintenta como JWT.
 * No acepta cookie de sesión: el cliente manda el bearer.
 */
export async function resolveApiCaller(
  request: Request,
  options?: { requiredScope?: string },
): Promise<{ ok: true; caller: ApiCaller } | { response: NextResponse }> {
  const token = bearerToken(request)
  if (!token) return { response: unauthorized() }

  if (isDeviceApiKeyToken(token)) {
    const found = await authenticateDeviceKey(token)
    if (!found.ok) {
      const error = found.status === 401 ? UNAUTHORIZED_MSG : found.error
      return { response: jsonError(error, found.status) }
    }
    const required = options?.requiredScope
    if (required && !scopeSatisfies(found.scopes, required)) {
      return { response: jsonError(`La clave no incluye el permiso ${required}`, 403) }
    }
    return {
      ok: true,
      caller: {
        kind: 'device',
        userId: found.userId,
        teamMemberId: found.teamMemberId,
        scopes: found.scopes,
      },
    }
  }

  const cron = process.env.CRON_SECRET
  if (cron && token === cron) return { ok: true, caller: { kind: 'cron' } }

  const jwt = await userIdFromSupabaseJwt(token)
  if (!jwt.ok) {
    if (jwt.kind === 'misconfigured') {
      return { response: jsonError('Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY', 500) }
    }
    return { response: unauthorized() }
  }
  return { ok: true, caller: { kind: 'user', userId: jwt.userId } }
}

/**
 * Dueño logueado para crear, listar y revocar claves.
 * Acepta cookie de sesión de Distinto o `Bearer` JWT de Supabase.
 * Rechaza claves dst_live_ (una clave no crea otra) y CRON_SECRET.
 */
export async function resolveDeviceKeyOwner(
  request: Request,
): Promise<{ ok: true; userId: string } | { response: NextResponse }> {
  const header = request.headers.get('authorization')
  if (header != null) {
    const token = bearerToken(request)
    if (!token) return { response: unauthorizedSession() }
    if (isDeviceApiKeyToken(token)) {
      return {
        response: jsonError(
          'Las claves de dispositivo no pueden crear, listar ni revocar claves. Entrá a Distinto con tu sesión.',
          401,
        ),
      }
    }
    const cron = process.env.CRON_SECRET
    if (cron && token === cron) return { response: unauthorizedSession() }
    const jwt = await userIdFromSupabaseJwt(token)
    if (!jwt.ok) {
      if (jwt.kind === 'misconfigured') {
        return { response: jsonError('Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY', 500) }
      }
      return { response: unauthorizedSession() }
    }
    return { ok: true, userId: jwt.userId }
  }

  const user = await getUser()
  if (!user) return { response: unauthorizedSession() }
  return { ok: true, userId: user.id }
}

/**
 * Escritura de usuario: JWT de Supabase o clave dst_live_ con alcance owner.
 * No acepta CRON_SECRET (eso queda en las rutinas de servidor).
 * La clave con solo tareas:read recibe 403.
 */
export async function requireApiActor(
  request: Request,
): Promise<{ ok: true; userId: string } | { response: NextResponse }> {
  const auth = await resolveApiCaller(request)
  if ('response' in auth) return auth

  switch (auth.caller.kind) {
    case 'user':
      return { ok: true, userId: auth.caller.userId }
    case 'device':
      if (!scopeSatisfies(auth.caller.scopes, OWNER_SCOPE)) {
        return { response: jsonError(DEVICE_KEY_NEEDS_OWNER, 403) }
      }
      return { ok: true, userId: auth.caller.userId }
    case 'cron':
      return { response: jsonError('Unauthorized: esta operación no acepta CRON_SECRET', 401) }
    default: {
      const _never: never = auth.caller
      return _never
    }
  }
}
