import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MarcaRow } from '@/lib/types/database'

export default async function Home() {
  const supabase = await createClient()
  const { data: marcas, error } = await supabase
    .from('marcas')
    .select('slug, nombre, emoji_marca, activa, color_primario_hex')
    .eq('activa', true)
    .order('slug')
    .returns<Pick<MarcaRow, 'slug' | 'nombre' | 'emoji_marca' | 'activa' | 'color_primario_hex'>[]>()

  return (
    <main className="container mx-auto p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Distinto App</h1>
        <p className="text-muted-foreground">
          Sistema de aprobación de grillas · healthcheck inicial
        </p>
      </header>

      {error && (
        <Card className="border-destructive mb-4">
          <CardHeader>
            <CardTitle>❌ Error conectando a Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap break-all">
              {error.message}
              {'\n\nDetails: '}
              {JSON.stringify(error, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {marcas && (
        <>
          <h2 className="text-2xl font-semibold mb-4">
            ✅ {marcas.length} marcas activas conectadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marcas.map((m) => (
              <Card key={m.slug} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden>
                      {m.emoji_marca}
                    </span>
                    <span className="text-base">{m.nombre}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="font-mono text-xs">
                    {m.slug}
                  </Badge>
                  {m.color_primario_hex && (
                    <div className="flex items-center gap-2 mt-3">
                      <div
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: m.color_primario_hex }}
                        aria-label={`Color primario ${m.color_primario_hex}`}
                      />
                      <code className="text-sm text-muted-foreground">
                        {m.color_primario_hex}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <footer className="mt-12 pt-4 border-t border-border text-xs text-muted-foreground">
        Plan 1 · Task 15 healthcheck · Schema v2026-05-18 ·{' '}
        <a
          href="https://github.com/rcpier65-hub/distinto-marcas-skills"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
    </main>
  )
}
