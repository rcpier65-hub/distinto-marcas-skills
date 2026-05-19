// app/lib/auth/get-user.ts
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Devuelve el usuario autenticado en una server component/route.
 * Retorna null si no hay sesión válida.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Igual que getUser pero THROW si no hay sesión.
 * Usar en rutas que YA pasaron el middleware (deberían estar autenticadas).
 */
export async function requireUser(): Promise<User> {
  const user = await getUser()
  if (!user) {
    throw new Error('No authenticated user')
  }
  return user
}
