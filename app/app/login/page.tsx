// app/app/login/page.tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sendMagicLink, signInWithGoogle, signInWithPassword } from '@/lib/auth/actions'
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

          {/* MÉTODO PRINCIPAL: email + password.
              Es el método que recibe el equipo cuando Pedro les manda
              las credenciales por WhatsApp desde /equipo. */}
          <form action={signInWithPassword} className="space-y-2">
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              required
              autoComplete="email"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" className="w-full" size="lg">
              Iniciar sesión
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Otros métodos</span>
            </div>
          </div>

          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full" size="lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-5 w-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </Button>
          </form>

          <form action={handleMagicLink} className="space-y-2">
            <input
              type="email"
              name="email"
              placeholder="O recibí link al email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" variant="outline" className="w-full" size="lg">
              Enviar link mágico
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
