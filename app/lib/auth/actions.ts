// app/lib/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type AuthActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

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
