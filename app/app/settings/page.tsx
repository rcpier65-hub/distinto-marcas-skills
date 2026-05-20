// app/app/settings/page.tsx
import { requireUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogoUrlInput } from './_components/logo-url-input'

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
          Configuración del sistema y branding de cada marca.
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

      {/* LOGOS de marca — Pedro pega aquí URLs de Drive */}
      <Card>
        <CardHeader>
          <CardTitle>🎨 Logos de marca</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Pega aquí la URL del logo de cada marca. Soporta <strong>Drive</strong> (con permiso "Cualquier persona con el enlace"),
            Imgur, Cloudinary o cualquier CDN público. Si dejás vacío, se usa el placeholder local generado.
          </p>
          <div className="mt-3 p-3 bg-muted/40 rounded-md text-xs">
            <strong className="block mb-1">💡 Cómo obtener URL de Drive:</strong>
            <ol className="list-decimal ml-4 space-y-0.5 text-muted-foreground">
              <li>Subí el logo a tu carpeta de Drive</li>
              <li>Click derecho → <em>Compartir</em> → cambiar a <em>"Cualquier persona con el enlace"</em></li>
              <li>Copiá el link (formato: <code className="text-[10px]">https://drive.google.com/file/d/FILE_ID/view</code>)</li>
              <li>Pegá acá — el sistema lo convierte automáticamente</li>
            </ol>
          </div>
        </CardHeader>
        <CardContent>
          {!marcas || marcas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin marcas.</p>
          ) : (
            <div className="space-y-0">
              {marcas.map((m) => (
                <LogoUrlInput
                  key={m.slug}
                  slug={m.slug}
                  marcaNombre={m.nombre}
                  emojiMarca={m.emoji_marca}
                  initialUrl={m.logo_url}
                />
              ))}
            </div>
          )}
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
