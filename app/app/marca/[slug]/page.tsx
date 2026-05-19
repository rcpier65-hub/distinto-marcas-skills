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
