// app/app/marca/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GrillaStatusBadge } from '@/components/grilla-status-badge'
import { notFound } from 'next/navigation'
import { PreviewYAprobar } from './_components/preview-aprobar'

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

  // Última grilla en cualquier estado (priorizamos esperando_aprobacion)
  const { data: grillaActiva } = await supabase
    .from('grillas_pendientes')
    .select('id, semana_inicio, semana_fin, estado, png_url, caption, pedida_at, enviada_at')
    .eq('marca_id', marca.id)
    .in('estado', ['esperando_aprobacion', 'aprobada', 'enviada'])
    .order('pedida_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Últimas 10 grillas (histórico)
  const { data: historial } = await supabase
    .from('grillas_pendientes')
    .select('id, semana_inicio, semana_fin, estado, pedida_at, enviada_at')
    .eq('marca_id', marca.id)
    .order('pedida_at', { ascending: false })
    .limit(10)

  const grupoConfigurado =
    !!marca.grupo_whatsapp_nombre || !!marca.grupo_whatsapp_alias

  return (
    <main className="container mx-auto p-8 max-w-4xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <span className="text-5xl">{marca.emoji_marca}</span>
          {marca.nombre}
        </h1>
        <Badge variant="outline" className="font-mono mt-2">{marca.slug}</Badge>
      </header>

      {!grupoConfigurado && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardHeader>
            <CardTitle className="text-yellow-900 dark:text-yellow-200">
              ⚠️ Grupo WhatsApp no configurado
            </CardTitle>
            <CardDescription className="text-yellow-800 dark:text-yellow-300">
              Esta marca no tiene <code>grupo_whatsapp_nombre</code> ni <code>grupo_whatsapp_alias</code> en BD. Podés generar y aprobar grilla pero al apretar &quot;Enviar al grupo&quot; va a fallar.
              Configurá el grupo en Settings antes de aprobar.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {grillaActiva && (
        <PreviewYAprobar
          grilla={{
            id: grillaActiva.id,
            estado: grillaActiva.estado,
            semana_inicio: grillaActiva.semana_inicio,
            semana_fin: grillaActiva.semana_fin,
            png_url: grillaActiva.png_url,
            caption: grillaActiva.caption ?? '',
            enviada_at: grillaActiva.enviada_at,
          }}
          marcaSlug={marca.slug}
          grupoConfigurado={grupoConfigurado}
        />
      )}

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
              <span className="text-muted-foreground">WhatsApp decisor: </span>
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
          {!historial || historial.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no se pidió ninguna grilla para esta marca.
            </p>
          ) : (
            <ul className="space-y-2 divide-y divide-border">
              {historial.map((g) => (
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
