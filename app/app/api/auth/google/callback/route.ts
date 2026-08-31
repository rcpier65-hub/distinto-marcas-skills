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

  /* Volver a la vista desde donde se inició la conexión (cookie que setea
     /api/auth/google/start). Solo paths internos; default /grabaciones. */
  const cookieStore = await cookies()
  const ret = cookieStore.get('g_oauth_return')?.value
  const vuelta = ret && ret.startsWith('/') && !ret.startsWith('//') ? ret : '/grabaciones'
  const limpiar = (res: NextResponse) => {
    res.cookies.delete('g_oauth_state')
    res.cookies.delete('g_oauth_return')
    return res
  }

  // Usuario canceló o Google devolvió error
  if (error) {
    return limpiar(NextResponse.redirect(`${APP_URL}${vuelta}?gcal=denied`))
  }
  if (!code) {
    return limpiar(NextResponse.redirect(`${APP_URL}${vuelta}?gcal=nocode`))
  }

  // Validar state anti-CSRF
  const savedState = cookieStore.get('g_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return limpiar(NextResponse.redirect(`${APP_URL}${vuelta}?gcal=badstate`))
  }

  // Intercambiar code por tokens (guarda en BD)
  const result = await exchangeCodeForTokens(code)

  const res = result.ok
    ? NextResponse.redirect(`${APP_URL}${vuelta}?gcal=connected`)
    : NextResponse.redirect(`${APP_URL}${vuelta}?gcal=error&msg=${encodeURIComponent(result.ok === false ? result.error : '')}`)

  return limpiar(res)
}
