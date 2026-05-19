# Plan 2 — Sistema Grillas · Dashboard funcional + Login

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el healthcheck de Plan 1 en un dashboard funcional con login (email magic link + Google), botón "🟢 Pedir grilla" por marca que inserta en `grillas_pendientes`, actualización en tiempo real, y vistas adicionales de detalle/historial/settings.

**Architecture:** Next.js 16 App Router + Supabase SSR. Auth con middleware que protege todas las rutas excepto `/login` y `/auth/callback`. Server Components para datos iniciales, Server Actions para mutaciones, Realtime channels para updates en vivo. shadcn/ui components.

**Tech Stack:** Next.js 16 · @supabase/ssr · @supabase/supabase-js · Server Actions · Tailwind v4 · shadcn/ui · TypeScript estricto

**Spec referenciado:** [`docs/superpowers/specs/2026-05-18-sistema-grillas-aprobacion-design.md`](../specs/2026-05-18-sistema-grillas-aprobacion-design.md)

**Punto de partida:** Plan 1 completado (tag `v0.1.0-plan1`). App live en https://distinto-app.vercel.app con 7 marcas seedadas.

**⛔ Bloqueos humanos esperados:**
- Task 8 (Google OAuth): Pedro debe crear cliente OAuth en Google Cloud Console y pegar credenciales
- Task 9 (Supabase Auth config): Pedro debe agregar redirect URLs en Supabase Dashboard
- Task 16 (Primer login real): Pedro debe testear el flow end-to-end

---

## File Structure

Archivos que crea/modifica este plan, agrupados por responsabilidad:

```
app/
├── middleware.ts                          # CREAR — protección de rutas
├── lib/
│   ├── supabase/
│   │   ├── middleware.ts                  # CREAR — session helper para middleware
│   │   └── service.ts                     # CREAR — client con service_role (Server-only)
│   └── auth/
│       ├── actions.ts                     # CREAR — Server Actions login/logout
│       └── get-user.ts                    # CREAR — helper getUser server-side
├── app/
│   ├── layout.tsx                         # MODIFICAR — agregar Toaster, Header
│   ├── page.tsx                           # MODIFICAR — redirect a /dashboard si auth
│   ├── login/
│   │   └── page.tsx                       # CREAR — pantalla login
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                   # CREAR — callback OAuth/magic link
│   ├── dashboard/
│   │   ├── page.tsx                       # CREAR — dashboard principal
│   │   └── _components/
│   │       ├── marca-card.tsx             # CREAR — card con botón pedir grilla
│   │       └── pedir-grilla-action.ts     # CREAR — Server Action INSERT
│   ├── marca/
│   │   └── [slug]/
│   │       └── page.tsx                   # CREAR — detalle marca + historial
│   ├── historial/
│   │   └── page.tsx                       # CREAR — tabla histórica
│   └── settings/
│       └── page.tsx                       # CREAR — admin only
├── components/
│   ├── header.tsx                         # CREAR — top nav + user menu
│   ├── sign-out-button.tsx                # CREAR — botón logout
│   └── grilla-status-badge.tsx            # CREAR — badge según estado
└── supabase/migrations/
    └── 20260519000001_grant_anon_storage.sql  # CREAR — fix RLS si hace falta
```

---

## Task 1: Crear helper de middleware para Supabase Auth

**Files:**
- Create: `app/lib/supabase/middleware.ts`

- [ ] **Step 1: Crear el helper de session refresh**

Este helper se llama en cada request del middleware para refrescar el access_token si está por expirar.

```typescript
// app/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  // Si NO hay user y la ruta NO es /login ni /auth, redirigir a /login
  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname === '/'

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Verificar imports/types**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/lib/supabase/middleware.ts
git commit -m "feat(auth): helper updateSession para Supabase Auth middleware"
```

---

## Task 2: Crear middleware.ts (Next.js root middleware)

**Files:**
- Create: `app/middleware.ts`

- [ ] **Step 1: Crear el middleware root**

```typescript
// app/middleware.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match todo excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico, robots.txt, sitemap.xml
     * - imágenes en /public
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Verificar que build aún pasa**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully` + no TS errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/middleware.ts
git commit -m "feat(auth): middleware root con protección de rutas privadas"
```

---

## Task 3: Server Action para enviar magic link

**Files:**
- Create: `app/lib/auth/actions.ts`

- [ ] **Step 1: Crear las Server Actions**

```typescript
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
```

- [ ] **Step 2: Agregar NEXT_PUBLIC_APP_URL a env vars**

Editar `app/.env.local`:

```bash
echo "" >> app/.env.local
echo "# App URL (para redirects auth)" >> app/.env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> app/.env.local
```

Y para producción agregar a Vercel:

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
printf "https://distinto-app.vercel.app\n" | npx vercel env add NEXT_PUBLIC_APP_URL production 2>&1 | tail -3
```

- [ ] **Step 3: Type check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/lib/auth/actions.ts
git commit -m "feat(auth): server actions sendMagicLink, signInWithGoogle, signOut"
```

---

## Task 4: Helper getUser server-side

**Files:**
- Create: `app/lib/auth/get-user.ts`

- [ ] **Step 1: Crear helper**

```typescript
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
```

- [ ] **Step 2: Type check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/lib/auth/get-user.ts
git commit -m "feat(auth): helper getUser/requireUser para Server Components"
```

---

## Task 5: Pantalla de login (UI)

**Files:**
- Create: `app/app/login/page.tsx`

- [ ] **Step 1: Crear pantalla login**

```tsx
// app/app/login/page.tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sendMagicLink, signInWithGoogle } from '@/lib/auth/actions'
import { getUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  // Si ya está logueado, redirigir al dashboard
  const user = await getUser()
  if (user) redirect('/dashboard')

  const params = await searchParams

  async function handleMagicLink(formData: FormData) {
    'use server'
    const result = await sendMagicLink(formData)
    const params = new URLSearchParams()
    if (result.ok) params.set('message', result.message)
    else params.set('error', result.error)
    redirect(`/login?${params.toString()}`)
  }

  return (
    <main className="container mx-auto p-8 flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Distinto App</CardTitle>
          <CardDescription>
            Sistema de aprobación de grillas. Iniciá sesión para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error && (
            <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {params.error}
            </div>
          )}
          {params.message && (
            <div className="rounded border border-green-500 bg-green-50 p-3 text-sm text-green-800">
              {params.message}
            </div>
          )}

          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full" size="lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="mr-2 h-5 w-5"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">O con email</span>
            </div>
          </div>

          <form action={handleMagicLink} className="space-y-2">
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              required
              autoComplete="email"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" className="w-full" size="lg">
              Enviar link de acceso
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Solo usuarios autorizados de Agencia Distinto.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -10
```

Expected: build OK, ruta `/login` aparece en routes.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/app/login/
git commit -m "feat(auth): pantalla /login con magic link email + Google OAuth"
```

---

## Task 6: Callback OAuth/magic link

**Files:**
- Create: `app/app/auth/callback/route.ts`

- [ ] **Step 1: Crear el route handler de callback**

```typescript
// app/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] exchange error:', error.message)
  }

  // Si no hay code o falló el exchange
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('No pudimos iniciar sesión. Probá de nuevo.')}`
  )
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -10
```

Expected: build OK, ruta `/auth/callback` aparece.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/app/auth/callback/route.ts
git commit -m "feat(auth): callback handler para magic link + OAuth"
```

---

## Task 7: Configurar Supabase Auth URLs (Site URL + Redirect URLs)

**Files:** (configuración en Supabase Dashboard, no archivos)

- [ ] **Step 1: ⛔ Pedro debe configurar en Supabase Dashboard**

Agente pide a Pedro:

> "Andá a https://supabase.com/dashboard/project/exhmimlehdisonjvedvx/auth/url-configuration y configurá:
>
> **Site URL**: `https://distinto-app.vercel.app`
>
> **Redirect URLs** (agregá AMBAS, una por línea):
> ```
> http://localhost:3000/auth/callback
> https://distinto-app.vercel.app/auth/callback
> ```
>
> Hacé click en **Save** abajo. Avísame cuando esté listo."

- [ ] **Step 2: Verificar magic link funciona en local**

Cuando Pedro confirma:

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run dev
```

Pedro abre http://localhost:3000/login, escribe su email, hace clic en "Enviar link". Verifica que recibe email.

- [ ] **Step 3: Validar inbox**

Pedro confirma que el email llegó con un link que apunta a `localhost:3000/auth/callback?code=...`. NO hacer clic todavía (queremos que el redirect-after-login en Task 10 funcione primero).

---

## Task 8: Configurar Google OAuth (Google Cloud Console)

**Files:** (configuración externa)

- [ ] **Step 1: ⛔ Pedro debe crear OAuth Client ID en Google Cloud**

Agente pide a Pedro:

> "Para habilitar 'Continuar con Google':
>
> 1. Andá a https://console.cloud.google.com/apis/credentials
> 2. Si no tenés proyecto, creá uno: 'distinto-app'
> 3. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
> 4. Application type: **Web application**
> 5. Name: `Distinto App Web`
> 6. **Authorized JavaScript origins**: agregá ambos
>    - `http://localhost:3000`
>    - `https://distinto-app.vercel.app`
> 7. **Authorized redirect URIs**: agregá:
>    - `https://exhmimlehdisonjvedvx.supabase.co/auth/v1/callback`
> 8. Create
> 9. Copy de la pantalla resultante: **Client ID** y **Client Secret**, pegámelos en el chat."

- [ ] **Step 2: ⛔ Pedro configura Google provider en Supabase**

Una vez tiene los credenciales:

> "Andá a https://supabase.com/dashboard/project/exhmimlehdisonjvedvx/auth/providers
> 1. Buscá 'Google' en la lista
> 2. Click 'Configure'
> 3. Toggle ON
> 4. Pegá el Client ID y Client Secret
> 5. Save"

- [ ] **Step 3: Validar Google OAuth en local**

Pedro abre http://localhost:3000/login → click "Continuar con Google" → debería redirigir a Google → autorizar → volver a `/dashboard` (que aún no existe, va a tirar 404 — eso es esperado, lo arreglamos en Task 10).

---

## Task 9: Componente Header con user menu

**Files:**
- Create: `app/components/header.tsx`
- Create: `app/components/sign-out-button.tsx`

- [ ] **Step 1: Crear SignOutButton (Client Component)**

```tsx
// app/components/sign-out-button.tsx
'use client'

import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth/actions'

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Cerrar sesión
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Crear Header (Server Component con user)**

```tsx
// app/components/header.tsx
import Link from 'next/link'
import { getUser } from '@/lib/auth/get-user'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutButton } from './sign-out-button'

export async function Header() {
  const user = await getUser()

  if (!user) return null  // En login no se renderiza

  const initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            Distinto
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/historial"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Historial
          </Link>
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Settings
          </Link>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-xs font-normal text-muted-foreground">
                  Conectado como
                </span>
                <span className="text-sm">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <div className="p-0">
                <SignOutButton />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Type check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/components/
git commit -m "feat(ui): Header con user menu + SignOutButton"
```

---

## Task 10: Refactor de `/` y crear `/dashboard`

**Files:**
- Modify: `app/app/page.tsx` (queda como landing público o redirige)
- Modify: `app/app/layout.tsx` (agregar Header)
- Create: `app/app/dashboard/page.tsx`

- [ ] **Step 1: Modificar layout.tsx para incluir Header**

```tsx
// app/app/layout.tsx
import type { Metadata } from 'next'
import { Header } from '@/components/header'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Distinto App',
  description: 'Sistema de aprobación de grillas — Agencia Distinto',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background">
        <Header />
        <div className="flex-1">{children}</div>
        <Toaster />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Convertir `/` en landing que redirige según auth**

```tsx
// app/app/page.tsx
import { getUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const user = await getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
```

- [ ] **Step 3: Crear `/dashboard` (con el grid de marcas, queda igual al healthcheck de Plan 1 por ahora)**

```tsx
// app/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()  // Throw si no autenticado (middleware ya filtra)
  const supabase = await createClient()

  const { data: marcas, error } = await supabase
    .from('marcas')
    .select('slug, nombre, emoji_marca, activa, color_primario_hex')
    .eq('activa', true)
    .order('slug')

  return (
    <main className="container mx-auto p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Hola {user.email}. Estas son las marcas activas.
        </p>
      </header>

      {error && (
        <Card className="border-destructive mb-4">
          <CardHeader>
            <CardTitle>❌ Error de Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error.message}</pre>
          </CardContent>
        </Card>
      )}

      {marcas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marcas.map((m) => (
            <Card key={m.slug} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-3xl">{m.emoji_marca}</span>
                  <span className="text-base">{m.nombre}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="font-mono text-xs">
                  {m.slug}
                </Badge>
                {m.color_primario_hex && (
                  <div
                    className="w-6 h-6 rounded border mt-3"
                    style={{ backgroundColor: m.color_primario_hex }}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Build + Type check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -15
```

Expected: build OK con rutas `/`, `/login`, `/dashboard`, `/auth/callback`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/app/ app/components/
git commit -m "feat(dashboard): refactor / con auth redirect + /dashboard protegido + layout con Header"
```

---

## Task 11: Server Action `pedirGrilla` + lógica de semanas

**Files:**
- Create: `app/app/dashboard/_components/pedir-grilla-action.ts`

- [ ] **Step 1: Crear la Server Action**

```typescript
// app/app/dashboard/_components/pedir-grilla-action.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

type PedirGrillaResult =
  | { ok: true; grilla_id: string }
  | { ok: false; error: string }

/**
 * Inserta una grilla pendiente para la semana en curso.
 * Si ya existe una grilla para esa marca + semana, devuelve error de duplicado.
 */
export async function pedirGrilla(marcaSlug: string): Promise<PedirGrillaResult> {
  const user = await requireUser()
  const supabase = await createClient()

  // 1. Buscar marca por slug
  const { data: marca, error: marcaError } = await supabase
    .from('marcas')
    .select('id, nombre')
    .eq('slug', marcaSlug)
    .eq('activa', true)
    .single()

  if (marcaError || !marca) {
    return { ok: false, error: `Marca '${marcaSlug}' no encontrada o inactiva` }
  }

  // 2. Calcular semana en curso (lunes-domingo)
  const { semana_inicio, semana_fin } = calcularSemanaActual()

  // 3. INSERT en grillas_pendientes
  const { data: grilla, error: insertError } = await supabase
    .from('grillas_pendientes')
    .insert({
      marca_id: marca.id,
      semana_inicio,
      semana_fin,
      estado: 'pendiente',
      pedida_por: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    // Constraint unique_grilla_marca_semana → duplicado
    if (insertError.code === '23505') {
      return {
        ok: false,
        error: `Ya hay una grilla pedida para ${marca.nombre} esta semana`,
      }
    }
    console.error('[pedirGrilla] insert error:', insertError)
    return { ok: false, error: 'No pudimos crear la grilla. Probá de nuevo.' }
  }

  // 4. Log en aprobaciones (auditoría)
  await supabase.from('aprobaciones').insert({
    grilla_id: grilla.id,
    usuario_id: user.id,
    accion: 'solicitar',
    via: 'dashboard',
  })

  revalidatePath('/dashboard')
  return { ok: true, grilla_id: grilla.id }
}

/**
 * Calcula el lunes y domingo de la semana en curso.
 * Si hoy es lunes, semana_inicio = hoy.
 */
function calcularSemanaActual(): { semana_inicio: string; semana_fin: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()  // 0=domingo, 1=lunes, ..., 6=sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    semana_inicio: monday.toISOString().slice(0, 10),
    semana_fin: sunday.toISOString().slice(0, 10),
  }
}
```

- [ ] **Step 2: Type check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/app/dashboard/_components/
git commit -m "feat(dashboard): Server Action pedirGrilla con cálculo de semana actual"
```

---

## Task 12: Componente MarcaCard con botón "Pedir grilla"

**Files:**
- Create: `app/components/grilla-status-badge.tsx`
- Create: `app/app/dashboard/_components/marca-card.tsx`
- Modify: `app/app/dashboard/page.tsx`

- [ ] **Step 1: Crear badge según estado**

```tsx
// app/components/grilla-status-badge.tsx
import { Badge } from '@/components/ui/badge'
import type { EstadoGrilla } from '@/lib/types/database'

const STATUS_CONFIG: Record<EstadoGrilla | 'sin_pedido', {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  emoji: string
}> = {
  sin_pedido: { label: 'Sin pedido', variant: 'outline', emoji: '⚪' },
  pendiente: { label: 'Pendiente', variant: 'secondary', emoji: '🟡' },
  procesando: { label: 'Procesando', variant: 'secondary', emoji: '⏳' },
  esperando_aprobacion: { label: 'Esperando aprobación', variant: 'default', emoji: '🔵' },
  aprobada: { label: 'Aprobada', variant: 'default', emoji: '🟢' },
  enviada: { label: 'Enviada', variant: 'default', emoji: '✅' },
  cancelada: { label: 'Cancelada', variant: 'destructive', emoji: '❌' },
  regenerar: { label: 'Regenerando', variant: 'secondary', emoji: '🔄' },
}

export function GrillaStatusBadge({
  estado,
}: {
  estado: EstadoGrilla | null | undefined
}) {
  const key = estado ?? 'sin_pedido'
  const config = STATUS_CONFIG[key]
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.emoji} {config.label}
    </Badge>
  )
}
```

- [ ] **Step 2: Crear MarcaCard (Client Component con botón)**

```tsx
// app/app/dashboard/_components/marca-card.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GrillaStatusBadge } from '@/components/grilla-status-badge'
import { pedirGrilla } from './pedir-grilla-action'
import { toast } from 'sonner'
import type { EstadoGrilla } from '@/lib/types/database'

export type MarcaCardData = {
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
  estado_grilla: EstadoGrilla | null
  semana_inicio: string | null
}

export function MarcaCard({ marca }: { marca: MarcaCardData }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticState, setOptimisticState] = useState<EstadoGrilla | null>(marca.estado_grilla)

  const yaTieneGrilla = optimisticState !== null && optimisticState !== 'cancelada'

  function handlePedir() {
    startTransition(async () => {
      setOptimisticState('pendiente')
      const result = await pedirGrilla(marca.slug)
      if (!result.ok) {
        setOptimisticState(marca.estado_grilla)
        toast.error(result.error)
      } else {
        toast.success(`Grilla pedida para ${marca.nombre}`)
      }
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-3xl">{marca.emoji_marca}</span>
          <span className="text-base">{marca.nombre}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {marca.slug}
          </Badge>
          <GrillaStatusBadge estado={optimisticState} />
        </div>

        {marca.color_primario_hex && (
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-border"
              style={{ backgroundColor: marca.color_primario_hex }}
            />
            <code className="text-xs text-muted-foreground">
              {marca.color_primario_hex}
            </code>
          </div>
        )}

        <Button
          onClick={handlePedir}
          disabled={isPending || yaTieneGrilla}
          className="w-full"
          variant={yaTieneGrilla ? 'secondary' : 'default'}
        >
          {isPending
            ? 'Pidiendo...'
            : yaTieneGrilla
              ? 'Ya pedida esta semana'
              : '🟢 Pedir grilla'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Modificar `dashboard/page.tsx` para usar MarcaCard con datos joinados**

```tsx
// app/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarcaCard, type MarcaCardData } from './_components/marca-card'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  // Calcular semana actual para filtrar grillas
  const { semana_inicio } = calcularSemanaActual()

  // Query: marcas activas + grilla de esta semana (si existe)
  const { data: marcas, error } = await supabase
    .from('marcas')
    .select(`
      slug,
      nombre,
      emoji_marca,
      color_primario_hex,
      activa,
      grillas_pendientes(estado, semana_inicio)
    `)
    .eq('activa', true)
    .order('slug')

  if (error) {
    return (
      <main className="container mx-auto p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>❌ Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error.message}</pre>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Transformar a MarcaCardData (solo la grilla de la semana actual)
  const cards: MarcaCardData[] = (marcas ?? []).map((m) => {
    const grillaSemana = m.grillas_pendientes?.find(
      (g) => g.semana_inicio === semana_inicio
    )
    return {
      slug: m.slug,
      nombre: m.nombre,
      emoji_marca: m.emoji_marca,
      color_primario_hex: m.color_primario_hex,
      estado_grilla: grillaSemana?.estado ?? null,
      semana_inicio: grillaSemana?.semana_inicio ?? null,
    }
  })

  return (
    <main className="container mx-auto p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Hola {user.email}. {cards.length} marcas activas · Semana del {semana_inicio}.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((m) => (
          <MarcaCard key={m.slug} marca={m} />
        ))}
      </div>
    </main>
  )
}

function calcularSemanaActual(): { semana_inicio: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return { semana_inicio: monday.toISOString().slice(0, 10) }
}
```

- [ ] **Step 4: Build**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -15
```

Expected: build OK.

- [ ] **Step 5: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/components/ app/app/
git commit -m "feat(dashboard): MarcaCard con botón pedirGrilla + estado en tiempo real"
```

---

## Task 13: Realtime subscription para updates en vivo

**Files:**
- Create: `app/app/dashboard/_components/realtime-watcher.tsx`
- Modify: `app/app/dashboard/page.tsx` (agregar el watcher)

- [ ] **Step 1: Crear Client Component que subscribe a realtime**

```tsx
// app/app/dashboard/_components/realtime-watcher.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Componente invisible que escucha cambios en grillas_pendientes
 * y hace router.refresh() cuando hay updates.
 */
export function RealtimeWatcher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('grillas_pendientes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT | UPDATE | DELETE
          schema: 'public',
          table: 'grillas_pendientes',
        },
        () => {
          // Refresca el server component → re-fetch data
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
```

- [ ] **Step 2: Agregar el watcher al dashboard**

```tsx
// app/app/dashboard/page.tsx — agregar en el JSX:
// (al final del main, antes del cierre)

import { RealtimeWatcher } from './_components/realtime-watcher'

// ... dentro del return:
<main className="container mx-auto p-8 max-w-6xl">
  {/* ... contenido existente ... */}
  <RealtimeWatcher />
</main>
```

(Insertar `<RealtimeWatcher />` justo antes del `</main>` de cierre.)

- [ ] **Step 3: Habilitar Realtime en Supabase para la tabla**

Ejecutar SQL para habilitar publication:

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
cat > supabase/migrations/20260519000001_enable_realtime_grillas.sql << 'EOF'
-- Habilitar realtime para grillas_pendientes
ALTER PUBLICATION supabase_realtime ADD TABLE grillas_pendientes;
EOF
node scripts/run-migration.mjs supabase/migrations/20260519000001_enable_realtime_grillas.sql
```

Expected: `✅ aplicada`.

- [ ] **Step 4: Build**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -10
```

Expected: build OK.

- [ ] **Step 5: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/app/dashboard/_components/realtime-watcher.tsx app/app/dashboard/page.tsx app/supabase/migrations/
git commit -m "feat(realtime): subscription a grillas_pendientes con router.refresh()"
```

---

## Task 14: Pantalla `/marca/[slug]` con detalle e historial

**Files:**
- Create: `app/app/marca/[slug]/page.tsx`

- [ ] **Step 1: Crear pantalla de detalle**

```tsx
// app/app/marca/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GrillaStatusBadge } from '@/components/grilla-status-badge'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MarcaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await requireUser()
  const { slug } = await params
  const supabase = await createClient()

  // Marca
  const { data: marca, error: marcaError } = await supabase
    .from('marcas')
    .select('*')
    .eq('slug', slug)
    .single()

  if (marcaError || !marca) {
    notFound()
  }

  // Últimas 10 grillas
  const { data: grillas } = await supabase
    .from('grillas_pendientes')
    .select('id, semana_inicio, semana_fin, estado, pedida_at, enviada_at')
    .eq('marca_id', marca.id)
    .order('pedida_at', { ascending: false })
    .limit(10)

  return (
    <main className="container mx-auto p-8 max-w-4xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <span className="text-5xl">{marca.emoji_marca}</span>
          {marca.nombre}
        </h1>
        <Badge variant="outline" className="font-mono mt-2">{marca.slug}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la marca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {marca.decisor_nombre && (
            <div>
              <span className="text-muted-foreground">Decisor: </span>
              {marca.decisor_tratamiento} {marca.decisor_nombre}
            </div>
          )}
          {marca.decisor_whatsapp && (
            <div>
              <span className="text-muted-foreground">WhatsApp: </span>
              <code className="font-mono">{marca.decisor_whatsapp}</code>
            </div>
          )}
          {marca.grupo_whatsapp_nombre && (
            <div>
              <span className="text-muted-foreground">Grupo WhatsApp: </span>
              {marca.grupo_whatsapp_nombre}
            </div>
          )}
          {marca.color_primario_hex && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Color primario: </span>
              <div
                className="w-5 h-5 rounded border"
                style={{ backgroundColor: marca.color_primario_hex }}
              />
              <code className="font-mono">{marca.color_primario_hex}</code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de grillas (últimas 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {!grillas || grillas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no se pidió ninguna grilla para esta marca.
            </p>
          ) : (
            <ul className="space-y-2 divide-y divide-border">
              {grillas.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-2 first:pt-0">
                  <div>
                    <div className="font-medium">
                      Semana {g.semana_inicio} → {g.semana_fin}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pedida {new Date(g.pedida_at).toLocaleString('es-PE')}
                      {g.enviada_at && ` · Enviada ${new Date(g.enviada_at).toLocaleString('es-PE')}`}
                    </div>
                  </div>
                  <GrillaStatusBadge estado={g.estado} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: Build**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -10
```

Expected: build OK con ruta `/marca/[slug]`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/app/marca/
git commit -m "feat(dashboard): pantalla /marca/[slug] con detalle + historial 10 grillas"
```

---

## Task 15: Pantalla `/historial` con tabla global

**Files:**
- Create: `app/app/historial/page.tsx`

- [ ] **Step 1: Crear pantalla de historial**

```tsx
// app/app/historial/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GrillaStatusBadge } from '@/components/grilla-status-badge'

export const dynamic = 'force-dynamic'

export default async function HistorialPage() {
  await requireUser()
  const supabase = await createClient()

  const { data: grillas } = await supabase
    .from('grillas_pendientes')
    .select(`
      id, semana_inicio, semana_fin, estado, pedida_at, enviada_at,
      marca:marcas(slug, nombre, emoji_marca)
    `)
    .order('pedida_at', { ascending: false })
    .limit(100)

  return (
    <main className="container mx-auto p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Historial</h1>
        <p className="text-muted-foreground">
          Últimas 100 grillas pedidas, ordenadas por fecha de pedido.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {!grillas || grillas.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No hay grillas todavía. Pedí la primera desde el Dashboard.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Marca</th>
                    <th className="p-3 font-medium">Semana</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium">Pedida</th>
                    <th className="p-3 font-medium">Enviada</th>
                  </tr>
                </thead>
                <tbody>
                  {grillas.map((g) => {
                    const marca = Array.isArray(g.marca) ? g.marca[0] : g.marca
                    return (
                      <tr key={g.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{marca?.emoji_marca}</span>
                            <span>{marca?.nombre}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {g.semana_inicio} → {g.semana_fin}
                        </td>
                        <td className="p-3">
                          <GrillaStatusBadge estado={g.estado} />
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(g.pedida_at).toLocaleString('es-PE')}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {g.enviada_at
                            ? new Date(g.enviada_at).toLocaleString('es-PE')
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -10
cd ..
git add app/app/historial/
git commit -m "feat(dashboard): pantalla /historial con tabla de últimas 100 grillas"
```

---

## Task 16: Pantalla `/settings` (solo lectura por ahora)

**Files:**
- Create: `app/app/settings/page.tsx`

- [ ] **Step 1: Crear pantalla settings**

```tsx
// app/app/settings/page.tsx
import { requireUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: marcas } = await supabase
    .from('marcas')
    .select('*')
    .order('slug')

  return (
    <main className="container mx-auto p-8 max-w-4xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configuración del sistema. Edición de marcas se habilita en Plan 5 (multi-usuario).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tu cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Email: </span>
            <code className="font-mono">{user.email}</code>
          </div>
          <div>
            <span className="text-muted-foreground">User ID: </span>
            <code className="font-mono text-xs">{user.id}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Provider: </span>
            <Badge variant="outline">{user.app_metadata.provider ?? 'email'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marcas configuradas ({marcas?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!marcas || marcas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin marcas.</p>
          ) : (
            <ul className="space-y-1 text-sm divide-y divide-border">
              {marcas.map((m) => (
                <li key={m.slug} className="flex items-center justify-between py-2 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{m.emoji_marca}</span>
                    <span>{m.nombre}</span>
                    <code className="font-mono text-xs text-muted-foreground">{m.slug}</code>
                  </div>
                  <Badge variant={m.activa ? 'default' : 'secondary'}>
                    {m.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -10
cd ..
git add app/app/settings/
git commit -m "feat(dashboard): pantalla /settings con info de cuenta + marcas (read-only)"
```

---

## Task 17: Deploy + validación E2E end-to-end

**Files:** (deploy + testing manual)

- [ ] **Step 1: Push todo a GitHub**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git push origin main 2>&1 | tail -3
```

- [ ] **Step 2: Vercel auto-deploys**

Pedro espera ~90s. Verificar que el deploy nuevo aparece en https://vercel.com/rcpier65-7045s-projects/distinto-app/deployments con status "Ready".

- [ ] **Step 3: Test E2E manual — Pedro hace estos 6 chequeos**

Pedro abre https://distinto-app.vercel.app/ y verifica:

1. **Redirect a /login** si no hay sesión → ✅
2. **Login con email**: escribe su email, recibe magic link, clica → redirige a /dashboard → ✅
3. **Dashboard muestra 7 marcas** con botones "🟢 Pedir grilla" disponibles → ✅
4. **Click "Pedir grilla" en una marca** → cambia a "🟡 Pendiente" (optimistic update) → toast verde → ✅
5. **Realtime**: en otra pestaña ver que el estado cambia sin refresh → ✅
6. **Sign out**: click avatar → "Cerrar sesión" → redirige a /login → ✅

- [ ] **Step 4: Verificar BD tiene grillas pedidas**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
node -e "
import('./scripts/verify-db.mjs').then(async () => {});
" || cat > /tmp/check-grillas.mjs << 'EOF'
import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query('SELECT m.slug, gp.estado, gp.semana_inicio, gp.pedida_at FROM grillas_pendientes gp JOIN marcas m ON m.id = gp.marca_id ORDER BY gp.pedida_at DESC LIMIT 10')
console.log(`Grillas en BD: ${r.rowCount}`)
r.rows.forEach(row => console.log(' ', row.slug, '|', row.estado, '|', row.semana_inicio))
await c.end()
EOF
node /tmp/check-grillas.mjs
```

Expected: al menos 1 fila (la que Pedro creó en Step 3.4).

- [ ] **Step 5: Crear tag v0.2.0-plan2**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git tag -a v0.2.0-plan2 -m "Plan 2 completado: login + dashboard funcional + realtime

Live: https://distinto-app.vercel.app

Pantallas:
- /login (magic link + Google OAuth)
- /dashboard (grid con botón pedir grilla + estado realtime)
- /marca/[slug] (detalle + historial 10 grillas)
- /historial (tabla últimas 100)
- /settings (info cuenta + marcas)

Server Actions: sendMagicLink, signInWithGoogle, signOut, pedirGrilla
Middleware: protección de rutas
Realtime: subscription a grillas_pendientes con router.refresh()"

git push origin v0.2.0-plan2 2>&1 | tail -3
```

---

## ✅ Estado al terminar Plan 2

- ✅ Login funcional (email magic link + Google OAuth)
- ✅ Middleware protege todas las rutas excepto /, /login, /auth
- ✅ Dashboard con grid de 7 marcas + botón "Pedir grilla" funcional
- ✅ Server Action `pedirGrilla` con cálculo de semana actual + log auditoría
- ✅ Realtime: cambios en `grillas_pendientes` actualizan UI sin reload
- ✅ Pantalla `/marca/[slug]` con detalle + historial de últimas 10
- ✅ Pantalla `/historial` con tabla de últimas 100
- ✅ Pantalla `/settings` con info de cuenta + marcas (read-only)
- ✅ Header con user menu + logout

## ➡️ Siguiente: Plan 3

**Routines + integraciones** (3-5h):
- Webhook trigger Supabase: cambios `grillas_pendientes` → POST a Vercel API route
- Vercel API route `/api/routines/procesar-grilla` que delega a routine Cowork
- Routine Cowork "Procesar grilla": genera PNG con skill `grilla-semanal`, manda a WhatsApp Pedro
- Routine Cowork "Listener aprobación": polea Rubi, detecta "ok [marca]", manda al cliente

Crear el siguiente plan invocando `superpowers:writing-plans` con la fase 3 del spec.
