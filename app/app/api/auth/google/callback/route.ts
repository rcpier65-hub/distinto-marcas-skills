// app/app/api/auth/google/callback/route.ts
//
// Callback de OAuth: Google redirige acá con ?code=...&state=...
// Valida el state (anti-CSRF), intercambia el code por tokens, y redirige
// de vuelta a /grabaciones con un flag de éxito/error.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens } from '@/lib/integrations/google-calendar'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  // Usuario canceló o Google devolvió error
  if (error) {
    return NextResponse.redirect(`${APP_URL}/grabaciones?gcal=denied`)
  }
  if (!code) {
    return NextResponse.redirect(`${APP_URL}/grabaciones?gcal=nocode`)
  }

  // Validar state anti-CSRF
  const cookieStore = await cookies()
  const savedState = cookieStore.get('g_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/grabaciones?gcal=badstate`)
  }

  // Intercambiar code por tokens (guarda en BD)
  const result = await exchangeCodeForTokens(code)

  const res = result.ok
    ? NextResponse.redirect(`${APP_URL}/grabaciones?gcal=connected`)
    : NextResponse.redirect(`${APP_URL}/grabaciones?gcal=error&msg=${encodeURIComponent(result.ok === false ? result.error : '')}`)

  // Limpiar la cookie de state
  res.cookies.delete('g_oauth_state')
  return res
}
