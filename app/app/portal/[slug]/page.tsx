// app/app/portal/[slug]/page.tsx
// Portal cliente: ve SU marca + aprueba grilla pendiente
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GrillaStatusBadge } from '@/components/grilla-status-badge'
import { notFound, redirect } from 'next/navigation'
import { aprobarDesdePortal, rechazarDesdePortal } from './_actions'

export const dynamic = 'force-dynamic'

export default async function PortalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const user = await requireUser()
  const { slug } = await params
  const supabase = await createClient()

  // 1. Verificar marca
  const { data: marca, error: marcaError } = await supabase
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex')
    .eq('slug', slug)
    .eq('activa', true)
    .maybeSingle()

  if (marcaError || !marca) {
    notFound()
  }

  // 2. Verificar que el user tiene acceso (vía marca_usuarios)
  const { data: acceso } = await supabase
    .from('marca_usuarios' as never)
    .select('id, rol')
    .eq('marca_id', marca.id)
    .eq('usuario_id', user.id)
    .maybeSingle()

  // Si no tiene acceso, dirigir a /dashboard (admins ven todo desde ahí)
  if (!acceso) {
    return (
      <main className="container mx-auto p-8 max-w-2xl">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Sin acceso a esta marca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Tu usuario ({user.email}) no tiene permisos para ver el portal de {marca.nombre}.</p>
            <p className="text-muted-foreground">Pedí al administrador que te invite.</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // 3. Buscar última grilla en estado relevante para el cliente
  const { data: grilla } = await supabase
    .from('grillas_pendientes')
    .select('id, semana_inicio, semana_fin, estado, png_url, pedida_at, enviada_at')
    .eq('marca_id', marca.id)
    .in('estado', ['esperando_aprobacion', 'enviada', 'aprobada'])
    .order('pedida_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main className="container mx-auto p-8 max-w-2xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <span className="text-5xl">{marca.emoji_marca}</span>
          {marca.nombre}
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido al portal · {user.email}
        </p>
      </header>

      {!grilla ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay grilla pendiente de aprobación. Cuando esté lista verás un preview aquí.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Grilla — Semana {grilla.semana_inicio} → {grilla.semana_fin}</span>
              <GrillaStatusBadge estado={grilla.estado} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grilla.png_url && (
              // Usamos <img> en lugar de <Image> porque la URL es de Supabase Storage
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={grilla.png_url}
                alt={`Grilla de ${marca.nombre}`}
                className="w-full rounded-md border border-border"
              />
            )}

            <div className="text-xs text-muted-foreground">
              Pedida {new Date(grilla.pedida_at).toLocaleString('es-PE')}
              {grilla.enviada_at && ` · Enviada ${new Date(grilla.enviada_at).toLocaleString('es-PE')}`}
            </div>

            {grilla.estado === 'esperando_aprobacion' && (
              <div className="flex gap-2">
                <form action={aprobarDesdePortal.bind(null, grilla.id)} className="flex-1">
                  <Button type="submit" variant="default" className="w-full">
                    ✅ Aprobar y publicar
                  </Button>
                </form>
                <form action={rechazarDesdePortal.bind(null, grilla.id)} className="flex-1">
                  <Button type="submit" variant="outline" className="w-full">
                    💬 Pedir cambios
                  </Button>
                </form>
              </div>
            )}

            {grilla.estado === 'enviada' && (
              <Badge variant="default">✅ Esta grilla ya fue publicada</Badge>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
