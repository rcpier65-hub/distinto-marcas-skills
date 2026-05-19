// app/app/settings/page.tsx
import { requireUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: marcas } = await supabase
    .from('marcas')
    .select('*')
    .order('slug')

  return (
    <main className="container mx-auto p-8 max-w-4xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configuración del sistema. Edición de marcas se habilita en Plan 5 (multi-usuario).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tu cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Email: </span>
            <code className="font-mono">{user.email}</code>
          </div>
          <div>
            <span className="text-muted-foreground">User ID: </span>
            <code className="font-mono text-xs">{user.id}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Provider: </span>
            <Badge variant="outline">{user.app_metadata.provider ?? 'email'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marcas configuradas ({marcas?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!marcas || marcas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin marcas.</p>
          ) : (
            <ul className="space-y-1 text-sm divide-y divide-border">
              {marcas.map((m) => (
                <li key={m.slug} className="flex items-center justify-between py-2 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{m.emoji_marca}</span>
                    <span>{m.nombre}</span>
                    <code className="font-mono text-xs text-muted-foreground">{m.slug}</code>
                  </div>
                  <Badge variant={m.activa ? 'default' : 'secondary'}>
                    {m.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
