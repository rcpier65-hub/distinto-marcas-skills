// app/lib/auth/get-user.ts
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Devuelve el usuario autenticado en una server component/route.
 * Retorna null si no hay sesión válida.
 */
export async function getUser(): Promise<User | null> {
  // Defensive: si env vars Supabase no están configuradas (ej. mockup local sin
  // .env.local poblado), devolvemos null sin crashear. Header.tsx ya maneja null
  // retornando null (no renderiza nada).
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
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
