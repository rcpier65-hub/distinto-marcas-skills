// app/app/api/auth/google/start/route.ts
//
// Inicia el flujo OAuth: genera un `state` anti-CSRF, lo guarda en cookie,
// y redirige a la pantalla de consentimiento de Google.
//
// Requiere sesión user (solo alguien logueado puede conectar el calendar).

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { buildAuthUrl } from '@/lib/integrations/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Solo usuarios logueados pueden iniciar la conexión
  try {
    await requireUser()
  } catch {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app'))
  }

  /* ¿A qué vista volver al terminar? El botón manda ?from=/grabaciones/calendario
     (u otra ruta interna). Solo aceptamos paths internos ('/x', nunca '//x')
     para no abrir un open-redirect. Default: /grabaciones. */
  const from = new URL(request.url).searchParams.get('from')
  const retorno = from && from.startsWith('/') && !from.startsWith('//') ? from : '/grabaciones'

  // state anti-CSRF: random, guardado en cookie httpOnly para validar en callback
  const state = crypto.randomUUID()
  const url = buildAuthUrl(state)
  if (!url) {
    return NextResponse.json(
      { ok: false, error: 'GOOGLE_OAUTH_CLIENT_ID/SECRET no configurados en Vercel env vars' },
      { status: 500 },
    )
  }

  const res = NextResponse.redirect(url)
  const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 600, path: '/' }
  res.cookies.set('g_oauth_state', state, cookieOpts)
  res.cookies.set('g_oauth_return', retorno, cookieOpts)
  return res
}
