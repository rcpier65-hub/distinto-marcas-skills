// app/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarcaCard, type MarcaCardData } from './_components/marca-card'
import { RealtimeWatcher } from './_components/realtime-watcher'

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
    const grillas = Array.isArray(m.grillas_pendientes) ? m.grillas_pendientes : (m.grillas_pendientes ? [m.grillas_pendientes] : [])
    const grillaSemana = grillas.find(
      (g) => g.semana_inicio === semana_inicio
    )
    return {
      slug: m.slug,
      nombre: m.nombre,
      emoji_marca: m.emoji_marca,
      color_primario_hex: m.color_primario_hex,
      estado_grilla: (grillaSemana?.estado as MarcaCardData['estado_grilla']) ?? null,
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
      <RealtimeWatcher />
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
