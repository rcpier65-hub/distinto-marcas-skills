// app/lib/api/auth.ts
//
// Helper común para endpoints /api/v1/*.
// - checkApiBearer: solo CRON_SECRET (endpoints de rutinas existentes; no cambiar).
// - resolveApiCaller: CRON_SECRET o JWT de usuario Supabase (GET /api/v1/tareas).

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

/** Quién llama a un endpoint que acepta usuario o rutina. */
export type ApiCaller =
  | { kind: 'cron' }
  | { kind: 'user'; userId: string }

const UNAUTHORIZED_MSG =
  'Unauthorized: necesita Authorization: Bearer <supabase access_token> o Bearer <CRON_SECRET>'

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: UNAUTHORIZED_MSG }, { status: 401 })
}

/**
 * Auth dual para endpoints que Kairos (u otro cliente de usuario) consume
 * sin CRON_SECRET.
 *
 * 1. `Bearer <CRON_SECRET>` → `{ kind: 'cron' }` (rutinas / servidor).
 * 2. Cualquier otro bearer se valida como JWT de sesión de Supabase
 *    (`anon key` + `auth.getUser(jwt)`). Si es válido → `{ kind: 'user' }`.
 *
 * No acepta cookie de sesión: el cliente tiene que mandar el access_token.
 */
export async function resolveApiCaller(
  request: Request,
): Promise<{ ok: true; caller: ApiCaller } | { response: NextResponse }> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return { response: unauthorized() }
  const token = header.slice('Bearer '.length).trim()
  if (!token) return { response: unauthorized() }

  const cron = process.env.CRON_SECRET
  if (cron && token === cron) return { ok: true, caller: { kind: 'cron' } }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY' },
        { status: 500 },
      ),
    }
  }

  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { response: unauthorized() }
  return { ok: true, caller: { kind: 'user', userId: data.user.id } }
}
