// app/app/historial/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
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
