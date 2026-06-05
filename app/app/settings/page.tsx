// app/app/settings/page.tsx
import { requireUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogoUrlInput } from './_components/logo-url-input'
import { WhatsappConfigInput } from './_components/whatsapp-config-input'
import { MetricoolConfig } from './_components/metricool-config'
import { OpenaiConfig } from './_components/openai-config'
import { MarcaFactsCard } from './_components/marca-facts-card'
import { listWhatsAppGroups } from '@/lib/integrations/rubi'
import { getIntegracionesConfig } from './_actions'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireUser()
  const supabase = await createClient()

  // Cargamos marcas + grupos WhatsApp + config integraciones en paralelo
  // para minimizar latencia secuencial.
  const [marcasResult, gruposResult, integracionesResult] = await Promise.all([
    supabase.from('marcas').select('*').order('slug'),
    listWhatsAppGroups(),
    getIntegracionesConfig(),
  ])
  const marcas = marcasResult.data
  const gruposDisponibles = gruposResult.ok ? gruposResult.groups : []
  const gruposError = gruposResult.ok ? null : gruposResult.error
  const integraciones = integracionesResult.ok
    ? integracionesResult.config
    : { metricool_user_id: '', metricool_has_token: false, metricool_user_id_set: false, openai_has_key: false, updated_at: null }

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

      {/* Integraciones externas — Metricool API (Migration 020) */}
      <Card>
        <CardHeader>
          <CardTitle>🔌 Integraciones — Metricool API</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Credenciales para que la app de Distinto pueda leer comentarios y responder via Metricool.
            <br />
            Se usan en la pestaña <strong>💬 Comentarios</strong> para sincronizar inbox de IG/FB/TikTok.
          </p>
        </CardHeader>
        <CardContent>
          <MetricoolConfig initial={integraciones} />
        </CardContent>
      </Card>

      {/* Integraciones — IA (OpenAI) para borradores de comentarios */}
      <Card>
        <CardHeader>
          <CardTitle>✨ Integraciones — IA (OpenAI)</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Tu API key de OpenAI para que la app genere las <strong>respuestas sugeridas</strong> a los comentarios
            (según el post + el comentario + la voz de cada marca). Modelo <code>gpt-4o-mini</code> · ~S/ 1/mes.
            <br />
            La key se guarda encriptada en tu base y <strong>nunca se muestra</strong> de vuelta.
          </p>
        </CardHeader>
        <CardContent>
          <OpenaiConfig initial={integraciones} />
        </CardContent>
      </Card>

      {/* WhatsApp config — Migration 015 */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Configuración WhatsApp por marca</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Definí el grupo destino, el número a mencionar (@) y los datos del decisor para cada marca.
            <br />
            Mientras <strong>Envío real OFF</strong> esté activo, sólo el botón 🧪 <em>Probar</em> funcionará — el botón
            real al cliente queda deshabilitado. Cuando hayas validado todo, activá el toggle por marca.
          </p>
          {gruposError && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-xs">
              <strong className="text-destructive block mb-1">⚠ No se pudo cargar la lista de grupos de Rubi:</strong>
              <code className="text-[10px]">{gruposError}</code>
              <p className="text-muted-foreground mt-1">
                Podés pegar el chatId manualmente si lo conocés, o reintentá refrescando la página.
              </p>
            </div>
          )}
          {!gruposError && gruposDisponibles.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">
              ✓ {gruposDisponibles.length} grupos disponibles via Rubi: {gruposDisponibles.map((g) => g.nombre).join(', ')}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!marcas || marcas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin marcas.</p>
          ) : (
            <div className="space-y-0">
              {marcas.map((m) => (
                <WhatsappConfigInput
                  key={m.slug}
                  slug={m.slug}
                  marcaNombre={m.nombre}
                  emojiMarca={m.emoji_marca}
                  gruposDisponibles={gruposDisponibles}
                  initial={{
                    grupo_whatsapp_chatid: m.grupo_whatsapp_chatid ?? null,
                    grupo_whatsapp_nombre: m.grupo_whatsapp_nombre ?? null,
                    mention_number: m.mention_number ?? null,
                    decisor_tratamiento: m.decisor_tratamiento ?? null,
                    decisor_nombre: m.decisor_nombre ?? null,
                    envio_real_habilitado: Boolean(m.envio_real_habilitado),
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datos canon por marca — Migration 022 — alimenta la Routine de comentarios */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Datos canon por marca (Routine de comentarios)</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            La Routine que responde comentarios consulta esta tabla antes de redactar para no inventar precios, URLs o naming desactualizado.
            Si una marca está marcada <strong>⚠ sin datos</strong>, la Routine opera en modo conservador: deriva todo a DM sin afirmar nada.
          </p>
          <div className="mt-3 p-3 bg-muted/40 rounded-md text-xs">
            <strong className="block mb-1">💡 Qué cargar:</strong>
            <ul className="list-disc ml-4 space-y-0.5 text-muted-foreground">
              <li><strong>Nombre comercial</strong>: el que usás HOY (ej Typhouse, no Little Joe)</li>
              <li><strong>Web + WhatsApp</strong>: canales activos para derivar consultas</li>
              <li><strong>Puntos de venta</strong>: tiendas físicas donde se vende (Sodimac, Totus...)</li>
              <li><strong>Datos de producto</strong>: precios, calorías, dimensiones — todo dato numérico verificable</li>
              <li><strong>Frases canon vs prohibidas</strong>: guardrails de voz (qué SÍ y qué NO escribir)</li>
            </ul>
          </div>
        </CardHeader>
        <CardContent>
          {!marcas || marcas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin marcas.</p>
          ) : (
            <div className="space-y-2">
              {marcas.map((m) => (
                <MarcaFactsCard
                  key={m.slug}
                  slug={m.slug}
                  marcaNombre={m.nombre}
                  emojiMarca={m.emoji_marca}
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
