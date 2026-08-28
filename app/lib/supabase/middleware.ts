// app/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // PERF (Pedro 24-jul-2026): rutas que NO necesitan sesión de usuario salen
  // ANTES de llamar a Supabase. `getUser()` es una llamada de red que el
  // middleware hacía en CADA request (incluso assets y endpoints con su propia
  // auth Bearer), sumando latencia y carga innecesaria al Auth de Supabase.
  // Assets estáticos + endpoints stateless (cron/v1/render/version/debug) no
  // tienen sesión de usuario → los dejamos pasar directo.
  const p = request.nextUrl.pathname
  const sinAuthUsuario =
    p === '/api/version' ||
    p.startsWith('/api/cron') ||
    p.startsWith('/api/v1') ||
    p.startsWith('/api/render-grilla') ||
    p.startsWith('/api/render-grilla-html') ||
    p.startsWith('/api/debug') ||
    p === '/manifest.webmanifest' || p === '/manifest.json' ||
    p === '/sw.js' || p.startsWith('/icons/') ||
    p === '/apple-touch-icon.png' || p === '/favicon-32.png' || p === '/favicon.ico'
  if (sinAuthUsuario) return supabaseResponse

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
      /* ⚠️ TIMEOUT GLOBAL (Pedro 27-ago-2026, 504 MIDDLEWARE_INVOCATION_TIMEOUT):
         getUser() hace una llamada de red a Supabase Auth SIN timeout propio; un
         pico de lentitud colgaba el middleware (corre en CADA request) hasta que
         Vercel lo mataba con 504 → app caída para todos. Mismo mal (y mismo
         remedio) que esClienteDeMarca() en jul-2026. Todas las llamadas de este
         cliente llevan tope de 5s. */
      global: {
        fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) })) as typeof fetch,
      },
    }
  )

  // IMPORTANT: getUser() refresca el token automáticamente si está vencido.
  // NO usar getSession() en middleware (no valida con el servidor).
  // Si Auth no responde a tiempo → FAIL-OPEN: dejamos pasar sin bloquear (las
  // páginas protegidas igual validan sesión con requireUser() en el server).
  // Jamás redirigir a /login por un timeout: el equipo SÍ tiene sesión.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null
  let authRespondio = true
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    authRespondio = false
  }

  // Si NO hay user y la ruta NO es /login, /auth, /api/*, ni /, redirigir a /login.
  // /api/cron/* y /api/render-grilla hacen su propia auth con Bearer token (no requiere sesión user).
  // Assets PWA (manifest, sw, icons) deben ser públicos para que browsers
  // los descubran sin requerir sesión — sino el icono no aparece al instalar.
  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||      // OAuth Google callback (viene de Google sin sesión)
    request.nextUrl.pathname.startsWith('/api/cron') ||
    request.nextUrl.pathname.startsWith('/api/v1') ||
    request.nextUrl.pathname.startsWith('/api/render-grilla') ||
    request.nextUrl.pathname.startsWith('/api/render-grilla-html') ||
    request.nextUrl.pathname.startsWith('/api/debug') ||
    request.nextUrl.pathname === '/api/version' ||   // solo el id del deploy (auto-update); sin datos sensibles
    request.nextUrl.pathname === '/' ||
    /* PWA assets — deben servirse sin auth */
    request.nextUrl.pathname === '/manifest.webmanifest' ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname === '/sw.js' ||
    request.nextUrl.pathname.startsWith('/icons/') ||
    request.nextUrl.pathname === '/apple-touch-icon.png' ||
    request.nextUrl.pathname === '/favicon-32.png' ||
    request.nextUrl.pathname === '/favicon.ico'

  if (!user && authRespondio && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Barrera CLIENTE ↔ EQUIPO (seguridad) ───────────────────────────────
  // Un CLIENTE de marca (fila en marca_clientes) SOLO puede usar su portal y
  // las APIs que este necesita. Cualquier otra ruta interna de la agencia
  // (dashboard, publicaciones, inicio, settings, ruleta, admin, etc.) lo
  // redirige a su propio panel. Así un cliente nunca ve datos de la agencia.
  // Pedro 22-jul-2026 (reporte: un cliente entraba a /dashboard).
  if (user) {
    const path = request.nextUrl.pathname
    const permitidoParaCliente =
      path === '/cliente' || path.startsWith('/cliente/') ||
      path.startsWith('/api/video') ||   // reproductor del portal (auth propia)
      path.startsWith('/api/drive') ||   // drive del portal (auth propia, scoped a su marca)
      path.startsWith('/login') ||
      path.startsWith('/auth') ||
      path.startsWith('/api/auth') ||
      path === '/api/version' ||
      path === '/manifest.webmanifest' || path === '/manifest.json' ||
      path === '/sw.js' || path.startsWith('/icons/') ||
      path === '/apple-touch-icon.png' || path === '/favicon-32.png' || path === '/favicon.ico'

    if (!permitidoParaCliente) {
      /* Cache por cookie (30 min, por usuario) para NO consultar a Supabase en
         cada request — esa consulta por-request fue la que colgó el middleware
         y tumbó a todo el equipo. Solo cacheamos resultados DEFINITIVOS. */
      const CACHE = 'dq_cli'
      const cached = request.cookies.get(CACHE)?.value
      let esCliente: boolean | null = null
      if (cached) {
        const sep = cached.lastIndexOf(':')
        if (sep > 0 && cached.slice(0, sep) === user.id) esCliente = cached.slice(sep + 1) === 's'
      }

      if (esCliente === null) {
        const check = await esClienteDeMarca(user.id)
        if (check === 'si' || check === 'no') {
          esCliente = check === 'si'
          supabaseResponse.cookies.set(CACHE, `${user.id}:${esCliente ? 's' : 'n'}`, {
            httpOnly: true, sameSite: 'lax', secure: true, maxAge: 1800, path: '/',
          })
        } else {
          esCliente = false   // 'error' (timeout/red): fail-open, NO bloquear al equipo, NO cachear
        }
      }

      if (esCliente) {
        const url = request.nextUrl.clone()
        url.pathname = '/cliente'
        url.search = ''
        const redir = NextResponse.redirect(url)
        // Mantener la cookie de cache también en la respuesta de redirect.
        redir.cookies.set(CACHE, `${user.id}:s`, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 1800, path: '/' })
        return redir
      }
    }
  }

  return supabaseResponse
}

/* ¿El usuario logueado es un CLIENTE de marca? (tiene fila en marca_clientes).
   Consulta directa a PostgREST con la service key — funciona en el runtime edge
   del middleware (fetch nativo) y no depende de RLS.

   CRÍTICO (Pedro 24-jul-2026, Lorena veía 504 MIDDLEWARE_INVOCATION_TIMEOUT):
   el fetch SIEMPRE lleva timeout. Sin él, un pico de lentitud de Supabase colgaba
   el middleware (que corre en CADA request) hasta que Vercel lo mataba con 504,
   bloqueando a TODO el equipo. Devuelve tri-estado: 'si' | 'no' | 'error'. Ante
   'error' (timeout/red) hacemos fail-open (no redirigir) y NO cacheamos. */
type ClienteCheck = 'si' | 'no' | 'error'
async function esClienteDeMarca(userId: string): Promise<ClienteCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return 'no'
  try {
    const res = await fetch(
      `${url}/rest/v1/marca_clientes?auth_user_id=eq.${encodeURIComponent(userId)}&select=marca_id&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),   // ← nunca colgar el middleware
      },
    )
    if (!res.ok) return 'error'
    const rows = (await res.json()) as unknown[]
    return Array.isArray(rows) && rows.length > 0 ? 'si' : 'no'
  } catch {
    return 'error'   // timeout, red caída, etc. → fail-open arriba
  }
}
