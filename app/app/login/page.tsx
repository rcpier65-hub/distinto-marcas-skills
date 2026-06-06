// app/app/login/page.tsx
//
// Pantalla de login — estilo "Light Editorial Premium" brand Distinto.
// La UI está en LoginScreen (client component con motion + huella SVG).
// Esta page solo:
//   - hace redirect si ya hay sesión (→ /cockpit)
//   - lee searchParams para error/message del último intento
//   - renderiza LoginScreen como client component
//
// Auth backend: signInWithPassword (lib/auth/actions.ts) — Pedro pidió
// quitar Google y magic link, solo email + password. Se mantiene.

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { LoginScreen } from './_components/login-screen'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  /* Si ya está logueado, ir directo al cockpit. */
  const user = await getUser()
  if (user) redirect('/cockpit')

  const params = await searchParams

  return (
    <LoginScreen
      initialError={params.error}
      initialMessage={params.message}
    />
  )
}
