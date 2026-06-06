// app/lib/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type AuthActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

/**
 * Login con email + password (para miembros del team que Pedro creó
 * en /equipo). Pedro asigna la contraseña ahí, el miembro la usa acá.
 *
 * Si el email pertenece a un team_member desactivado, rechazamos
 * incluso si la contraseña es correcta — defensa adicional contra
 * cuentas que se desactivaron sin cerrar sesión.
 */
export async function signInWithPassword(formData: FormData): Promise<void> {
  const email = formData.get('email')?.toString().trim().toLowerCase()
  const password = formData.get('password')?.toString()

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Email y contraseña son obligatorios'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email!, password: password! })

  if (error) {
    console.error('[signInWithPassword]', error.message)
    redirect('/login?error=' + encodeURIComponent('Email o contraseña incorrectos'))
  }

  /* Redirigir al landing dinámico según permisos del usuario.
     Admin → /cockpit; Editor → /editor; CM → /comentarios; etc. */
  const { getLandingRoute } = await import('@/lib/team/permisos-helper')
  redirect(await getLandingRoute())
}

export async function sendMagicLink(formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email')?.toString().trim()

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Email inválido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    console.error('[sendMagicLink] error:', error.message)
    return { ok: false, error: 'No pudimos enviar el link. Probá de nuevo.' }
  }

  return { ok: true, message: `Enviamos un link a ${email}. Revisá tu inbox.` }
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    console.error('[signInWithGoogle] error:', error.message)
    redirect('/login?error=oauth_failed')
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
