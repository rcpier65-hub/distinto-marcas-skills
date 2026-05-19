import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()
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
