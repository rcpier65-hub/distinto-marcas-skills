// app/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarcaCard, type MarcaCardData } from './_components/marca-card'
import { NuevaMarcaForm } from './_components/nueva-marca-form'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>
}) {
  const sp = await searchParams
  const abrirForm = sp?.nueva === '1'   // viene del enlace "+ Agregar marca" del menú
  const user = await requireUser()
  const supabase = await createClient()

  const { data: marcas, error } = await supabase
    .from('marcas')
    .select('slug, nombre, emoji_marca, color_primario_hex, activa')
    .order('activa', { ascending: false })
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
    activa: m.activa ?? true,
  }))
  const activasCount = cards.filter((c) => c.activa).length

  return (
    <main className="container mx-auto p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Hola {user.email}. {activasCount} marcas activas{cards.length > activasCount ? ` · ${cards.length - activasCount} inactivas` : ''}.
        </p>
      </header>

      {/* Encabezado de sección + botón crear marca */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <h2 className="text-xl font-semibold">
          Tus marcas{' '}
          <span className="text-muted-foreground font-normal text-base">· {activasCount} activas</span>
        </h2>
      </div>

      {/* Botón "+ Nueva marca" (se expande a formulario al abrir) */}
      <div className="mb-6">
        <NuevaMarcaForm defaultOpen={abrirForm} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((m) => (
          <MarcaCard key={m.slug} marca={m} />
        ))}
      </div>
    </main>
  )
}
