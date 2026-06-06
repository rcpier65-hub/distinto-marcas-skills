// app/app/login/page.tsx
//
// Login solo con email + contraseña. Pedro pidió quitar Google y magic
// link porque el sistema de equipo controla los accesos directamente
// (él asigna las contraseñas desde /equipo). Esto evita confusión y
// fuerza a todos los miembros a entrar con sus credenciales asignadas.

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signInWithPassword } from '@/lib/auth/actions'
import { getUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  /* Si ya está logueado, redirigir al cockpit. La página del cockpit
     decide qué mostrar según los permisos del usuario. */
  const user = await getUser()
  if (user) redirect('/cockpit')

  const params = await searchParams

  return (
    <main className="container mx-auto p-8 flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Distinto App</CardTitle>
          <CardDescription>
            Inicia sesión con tu email y contraseña.
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

          <form action={signInWithPassword} className="space-y-3">
            <input
              type="email"
              name="email"
              placeholder="tu@agenciadistinto.com"
              required
              autoComplete="email"
              autoFocus
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

          <p className="text-center text-xs text-muted-foreground">
            ¿No tienes acceso? Pídeselo a Pedro.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
