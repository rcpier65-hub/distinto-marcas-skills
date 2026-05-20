// app/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarcaCard, type MarcaCardData } from './_components/marca-card'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: marcas, error } = await supabase
    .from('marcas')
    .select('slug, nombre, emoji_marca, color_primario_hex')
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

  const cards: MarcaCardData[] = (marcas ?? []).map((m) => ({
    slug: m.slug,
    nombre: m.nombre,
    emoji_marca: m.emoji_marca,
    color_primario_hex: m.color_primario_hex,
  }))

  return (
    <main className="container mx-auto p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Hola {user.email}. {cards.length} marcas activas.
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
