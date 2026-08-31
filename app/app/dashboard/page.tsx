// app/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type MarcaCardData, type TareaMarca } from './_components/marca-card'
import { MarcasGrid } from './_components/marcas-grid'
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

  /* sync_pubs_gcal puede no existir aún (columna self-healing) → retry sin ella. */
  let mres = await supabase
    .from('marcas')
    .select('slug, nombre, emoji_marca, color_primario_hex, activa, sync_pubs_gcal')
    .order('activa', { ascending: false })
    .order('slug')
  if (mres.error && /sync_pubs_gcal/i.test(mres.error.message ?? '')) {
    mres = await supabase
      .from('marcas')
      .select('slug, nombre, emoji_marca, color_primario_hex, activa')
      .order('activa', { ascending: false })
      .order('slug')
  }
  const { data: marcas, error } = mres

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards: MarcaCardData[] = ((marcas ?? []) as any[]).map((m) => ({
    slug: m.slug,
    nombre: m.nombre,
    emoji_marca: m.emoji_marca,
    color_primario_hex: m.color_primario_hex,
    activa: m.activa ?? true,
    sync_pubs_gcal: m.sync_pubs_gcal ?? null,
  }))
  const activasCount = cards.filter((c) => c.activa).length

  /* Tareas RÁPIDAS pendientes por marca (NO publicaciones) — alimentan el toggle
     "Tareas por marca". Una tarea es de la marca si tiene marca_slug (las que se
     crean con el botón "+ Tarea" de la card) o si su categoría es el nombre de la
     marca (las que la IA categorizó sola). El CEO ve las de todos; cada miembro
     solo las suyas. Pedro 13-jul. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: tmRow } = await service
    .from('team_members').select('id, rol_base').eq('auth_user_id', user.id).maybeSingle()
  const esCEO = tmRow?.rol_base === 'director'

  let qTareas = service
    .from('tareas')
    .select('id, texto, categoria, marca_slug, team_member_id, created_by, miembro:team_members!tareas_team_member_id_fkey(nombre)')
    .eq('completada', false)
    .order('created_at', { ascending: false })
  if (!esCEO && tmRow?.id) qTareas = qTareas.eq('team_member_id', tmRow.id)
  const { data: tareasRows } = await qTareas

  /* Nombres del equipo para resolver quién creó cada tarea. */
  const { data: miembros } = await service.from('team_members').select('id, nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nombrePorId = new Map<string, string>(((miembros ?? []) as any[]).map((m) => [m.id, m.nombre]))

  const tareasPorMarca: Record<string, TareaMarca[]> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of ((tareasRows ?? []) as any[])) {
    const cat = (t.categoria ?? '').toLowerCase().trim()
    const match = cards.find(
      (c) => (t.marca_slug && t.marca_slug === c.slug) || cat === c.nombre.toLowerCase().trim(),
    )
    if (!match) continue
    const m = Array.isArray(t.miembro) ? t.miembro[0] : t.miembro
    ;(tareasPorMarca[match.slug] ??= []).push({
      id: t.id,
      texto: t.texto,
      persona: m?.nombre ?? null,
      creador: t.created_by ? (nombrePorId.get(t.created_by) ?? null) : null,
    })
  }

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

      <MarcasGrid cards={cards} tareasPorMarca={tareasPorMarca} />
    </main>
  )
}
