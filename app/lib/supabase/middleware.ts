// app/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Defensive: si env vars Supabase no están configuradas (ej. dev local sin
  // .env.local poblado), salteamos auth completamente. La app se renderiza
  // sin sesión — útil para iterar UI sin necesitar credenciales reales.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refresca el token automáticamente si está vencido.
  // NO usar getSession() en middleware (no valida con el servidor).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si NO hay user y la ruta NO es /login, /auth, /api/*, ni /, redirigir a /login.
  // /api/cron/* y /api/render-grilla hacen su propia auth con Bearer token (no requiere sesión user).
  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||      // OAuth Google callback (viene de Google sin sesión)
    request.nextUrl.pathname.startsWith('/api/cron') ||
    request.nextUrl.pathname.startsWith('/api/v1') ||
    request.nextUrl.pathname.startsWith('/api/render-grilla') ||
    request.nextUrl.pathname.startsWith('/api/render-grilla-html') ||
    request.nextUrl.pathname.startsWith('/api/debug') ||
    request.nextUrl.pathname === '/'

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
