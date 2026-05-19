# Plan 4 — PNG + Listener Aprobación WhatsApp

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cerrar el flow operativo: generar PNG con plantilla por marca + Pedro responde "ok marca" por WhatsApp → manda automáticamente al grupo del cliente.

**Architecture:** @vercel/og para generar PNG en serverless. Storage Supabase para hosting. Segundo cron de GitHub Actions polea Rubi events buscando "ok|no|redo [marca]" desde Pedro.

**Tech Stack:** @vercel/og · Supabase Storage · Rubi MCP `whatsapp_get_recent_events` · GitHub Actions

---

## Task 1: Helper generador PNG con @vercel/og

**Files:**
- Create: `app/lib/grilla/generate-png.tsx`

- [ ] **Step 1: Instalar @vercel/og**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm install @vercel/og
```

- [ ] **Step 2: Crear generador**

```tsx
// app/lib/grilla/generate-png.tsx
import { ImageResponse } from '@vercel/og'

export type GrillaData = {
  marca: { nombre: string; emoji: string; color: string }
  semanaInicio: string
  semanaFin: string
  publicaciones: number
}

export async function generateGrillaPNG(data: GrillaData): Promise<Buffer> {
  const img = new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1620px',
          background: data.marca.color,
          padding: '80px',
          display: 'flex',
          flexDirection: 'column',
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ fontSize: 200, marginBottom: 40 }}>{data.marca.emoji}</div>
        <div style={{ fontSize: 96, fontWeight: 800 }}>{data.marca.nombre}</div>
        <div style={{ fontSize: 72, marginTop: 60, opacity: 0.9 }}>¿Qué se viene?</div>
        <div style={{ fontSize: 56, marginTop: 30, opacity: 0.8 }}>
          Semana {data.semanaInicio} → {data.semanaFin}
        </div>
        <div style={{ fontSize: 48, marginTop: 80, opacity: 0.7 }}>
          {data.publicaciones} publicaciones programadas
        </div>
        <div style={{ marginTop: 'auto', fontSize: 32, opacity: 0.6 }}>
          Generado por Distinto App
        </div>
      </div>
    ),
    { width: 1080, height: 1620 }
  )

  const arrayBuffer = await img.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
```

- [ ] **Step 3: Build check + commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit
cd ..
git add app/lib/grilla/ app/package.json app/package-lock.json
git commit -m "feat(grilla): generador PNG básico con @vercel/og"
```

---

## Task 2: Helper subir PNG a Supabase Storage

**Files:**
- Create: `app/lib/grilla/upload-png.ts`

- [ ] **Step 1: Crear helper**

```typescript
// app/lib/grilla/upload-png.ts
import { createServiceClient } from '@/lib/supabase/service'

export async function uploadGrillaPNG(
  pngBuffer: Buffer,
  marcaSlug: string,
  semanaInicio: string
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  const supabase = createServiceClient()
  const path = `${marcaSlug}/${semanaInicio}.png`

  const { error: uploadError } = await supabase.storage
    .from('grillas-png')
    .upload(path, pngBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    return { ok: false, error: uploadError.message }
  }

  // Crear signed URL válida por 7 días
  const { data: signedData, error: signedError } = await supabase.storage
    .from('grillas-png')
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (signedError || !signedData) {
    return { ok: false, error: signedError?.message ?? 'No signed URL' }
  }

  return { ok: true, url: signedData.signedUrl, path }
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit
cd ..
git add app/lib/grilla/upload-png.ts
git commit -m "feat(grilla): helper para subir PNG a Supabase Storage con signed URL"
```

---

## Task 3: Actualizar cron procesar-pendientes para usar PNG

**Files:**
- Modify: `app/app/api/cron/procesar-pendientes/route.ts`

- [ ] **Step 1: Reemplazar la lógica de envío para incluir PNG**

Editar `app/app/api/cron/procesar-pendientes/route.ts` — buscar el bloque "2c. Enviar a Pedro" y reemplazar:

```typescript
import { generateGrillaPNG } from '@/lib/grilla/generate-png'
import { uploadGrillaPNG } from '@/lib/grilla/upload-png'
import { sendWhatsAppToPhone } from '@/lib/integrations/rubi'

// ... dentro del for loop:
    // 2c. Generar PNG
    const pngBuffer = await generateGrillaPNG({
      marca: {
        nombre: marca.nombre,
        emoji: marca.emoji_marca ?? '📊',
        color: '#283B6F',
      },
      semanaInicio: g.semana_inicio,
      semanaFin: g.semana_fin,
      publicaciones: 0,
    })

    // 2d. Subir PNG
    const upload = await uploadGrillaPNG(pngBuffer, marca.slug, g.semana_inicio)
    if (!upload.ok) {
      results.errores.push(`${marca.slug}: PNG upload failed - ${upload.error}`)
      await supabase
        .from('grillas_pendientes')
        .update({ estado: 'pendiente', error: upload.error })
        .eq('id', g.id)
      continue
    }

    // 2e. Construir mensaje con link al PNG
    const text = [
      `${marca.emoji_marca ?? '📊'} *Grilla pendiente — ${marca.nombre}*`,
      `Semana ${g.semana_inicio} → ${g.semana_fin}`,
      ``,
      `🖼️ Preview: ${upload.url}`,
      ``,
      `Responde:`,
      `  ✅ "ok ${marca.slug}" → enviar al cliente`,
      `  ❌ "no ${marca.slug}" → cancelar`,
      `  🔄 "redo ${marca.slug}" → regenerar`,
      ``,
      `Dashboard: https://distinto-app.vercel.app/marca/${marca.slug}`,
    ].join('\n')

    // 2f. Enviar a Pedro
    const sendResult = await sendWhatsAppToPhone(PEDRO_WHATSAPP, text)
```

También guardar el `png_url` y `png_storage_path` en el UPDATE de Supabase tras enviar OK:

```typescript
      await supabase
        .from('grillas_pendientes')
        .update({
          estado: 'esperando_aprobacion',
          png_url: upload.url,
          png_storage_path: upload.path,
          caption: text,
        })
        .eq('id', g.id)
```

(El subagent debe leer el archivo actual y mergear estos cambios manteniendo la estructura existente.)

- [ ] **Step 2: Build + commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -8
cd ..
git add app/app/api/cron/procesar-pendientes/route.ts
git commit -m "feat(cron): integrar PNG generation + storage en flow procesar"
```

---

## Task 4: Endpoint listener-aprobacion + parser

**Files:**
- Create: `app/lib/integrations/rubi-events.ts`
- Create: `app/app/api/cron/listener-aprobacion/route.ts`

- [ ] **Step 1: Helper para listar eventos de Rubi**

```typescript
// app/lib/integrations/rubi-events.ts
import { sendWhatsAppToPhone } from './rubi'

// Reutilizar el cliente JSON-RPC del archivo rubi.ts
// (extraer la lógica común — pero por simplicidad, repetir aquí)

const RUBI_URL = 'https://distinto-mcp.fly.dev/mcp/57b2a74126a923b30d88d6832a1a25effa7b576a2b217df6a2c1af76b55e2aef'

type RubiEvent = {
  id?: string
  from?: string
  body?: string
  timestamp?: number
  type?: string
}

export async function getRecentEvents(limit = 20): Promise<RubiEvent[]> {
  // Init session
  const initRes = await fetch(RUBI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'distinto-app', version: '1.0.0' },
      },
    }),
  })
  if (!initRes.ok) throw new Error(`Init failed: ${initRes.status}`)
  const sessionId =
    initRes.response?.headers?.get?.('mcp-session-id') ??
    initRes.headers.get('mcp-session-id') ??
    initRes.headers.get('Mcp-Session-Id')
  if (!sessionId) throw new Error('No session ID')

  // Notify initialized
  await fetch(RUBI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
      'Mcp-Session-Id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }),
  })

  // Call tool
  const toolRes = await fetch(RUBI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
      'Mcp-Session-Id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'whatsapp_get_recent_events',
        arguments: { event_type: 'message', limit },
      },
    }),
  })

  if (!toolRes.ok) throw new Error(`Tool call failed: ${toolRes.status}`)
  const text = await toolRes.text()
  const dataLine = text.split('\n').find((l) => l.startsWith('data: '))
  if (!dataLine) return []

  const parsed = JSON.parse(dataLine.slice(6))
  const content = parsed?.result?.content?.[0]?.text ?? '[]'
  try {
    return JSON.parse(content)
  } catch {
    return []
  }
}

const COMMAND_RE = /^(ok|si|sí|✅|aprobado|no|❌|cancelar|redo|rehacer|regenerar)\s+([a-z0-9-]+)/i

export type ParsedCommand =
  | { action: 'aprobar' | 'cancelar' | 'regenerar'; marca_slug: string }
  | null

export function parseCommand(body: string): ParsedCommand {
  const cleaned = body.trim().toLowerCase()
  const match = cleaned.match(COMMAND_RE)
  if (!match) return null
  const [, verb, slug] = match
  let action: 'aprobar' | 'cancelar' | 'regenerar'
  if (['ok', 'si', 'sí', '✅', 'aprobado'].includes(verb)) action = 'aprobar'
  else if (['no', '❌', 'cancelar'].includes(verb)) action = 'cancelar'
  else action = 'regenerar'
  return { action, marca_slug: slug }
}
```

- [ ] **Step 2: Crear el endpoint listener**

```typescript
// app/app/api/cron/listener-aprobacion/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRecentEvents, parseCommand } from '@/lib/integrations/rubi-events'
import { sendWhatsAppToPhone, sendWhatsAppToGroup } from '@/lib/integrations/rubi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PEDRO_NUMBER = '51983852191'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  const supabase = createServiceClient()
  const results = { procesados: [] as string[], errores: [] as string[] }

  // 1. Leer últimos eventos de Rubi
  let events
  try {
    events = await getRecentEvents(20)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    )
  }

  // 2. Filtrar mensajes de Pedro con comando válido
  const recentCutoff = Date.now() / 1000 - 30 * 60  // últimos 30 min
  const commands = events
    .filter((e) => {
      const fromNum = (e.from ?? '').replace(/\D/g, '')
      return fromNum.endsWith(PEDRO_NUMBER) && (e.timestamp ?? 0) > recentCutoff
    })
    .map((e) => ({ event: e, command: parseCommand(e.body ?? '') }))
    .filter((c): c is { event: typeof events[0]; command: NonNullable<ReturnType<typeof parseCommand>> } => c.command !== null)

  if (commands.length === 0) {
    return NextResponse.json({
      ok: true,
      procesados: 0,
      duration_ms: Date.now() - startTime,
    })
  }

  // 3. Procesar cada comando
  for (const { event, command } of commands) {
    const eventId = event.id ?? `${event.timestamp}-${event.from}`

    // Idempotencia: revisar si ya procesamos este event
    const { data: yaProcesado } = await supabase
      .from('aprobaciones')
      .select('id')
      .eq('metadata->>event_id', eventId)
      .limit(1)
      .maybeSingle()

    if (yaProcesado) {
      continue  // skip
    }

    // Buscar grilla esperando aprobación para esa marca
    const { data: grilla } = await supabase
      .from('grillas_pendientes')
      .select(`id, png_url, caption, marca:marcas(slug, nombre, emoji_marca, grupo_whatsapp_nombre, grupo_whatsapp_alias, decisor_whatsapp)`)
      .eq('estado', 'esperando_aprobacion')
      .eq('marca.slug', command.marca_slug)
      .order('pedida_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!grilla) {
      await sendWhatsAppToPhone(
        PEDRO_NUMBER,
        `⚠️ No hay grilla esperando aprobación para "${command.marca_slug}". Ignorado.`
      )
      results.errores.push(`${command.marca_slug}: no esperando_aprobacion`)
      continue
    }

    const marca = Array.isArray(grilla.marca) ? grilla.marca[0] : grilla.marca

    if (command.action === 'aprobar') {
      // Mandar al grupo del cliente
      const grupo = marca?.grupo_whatsapp_alias ?? marca?.grupo_whatsapp_nombre
      if (!grupo) {
        await sendWhatsAppToPhone(
          PEDRO_NUMBER,
          `⚠️ ${marca?.nombre} no tiene grupo WhatsApp configurado. No envío.`
        )
        results.errores.push(`${command.marca_slug}: sin grupo`)
        continue
      }

      const captionCliente = [
        `${marca?.emoji_marca ?? '📊'} Grilla de contenido — ${marca?.nombre}`,
        ``,
        `Compartimos la grilla de esta semana.`,
        ``,
        grilla.png_url ? `Preview: ${grilla.png_url}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const sendRes = await sendWhatsAppToGroup(grupo, captionCliente, !!marca?.grupo_whatsapp_alias)

      if (sendRes.ok) {
        await supabase
          .from('grillas_pendientes')
          .update({ estado: 'enviada', enviada_at: new Date().toISOString() })
          .eq('id', grilla.id)

        await supabase.from('envios').insert({
          grilla_id: grilla.id,
          marca_id: undefined,  // FK se rellena por el insert si está
          tipo: 'whatsapp_grupo',
          destino: grupo,
          caption: captionCliente,
          success: true,
        } as never)

        await supabase.from('aprobaciones').insert({
          grilla_id: grilla.id,
          accion: 'aprobar',
          via: 'whatsapp',
          comentario: event.body,
          metadata: { event_id: eventId, raw: event.body },
        })

        await sendWhatsAppToPhone(
          PEDRO_NUMBER,
          `✅ Enviado ${marca?.nombre} al grupo "${grupo}" a las ${new Date().toLocaleTimeString('es-PE')}.`
        )

        results.procesados.push(`aprobar:${command.marca_slug}`)
      } else {
        results.errores.push(`${command.marca_slug}: send fail - ${sendRes.error}`)
      }
    } else if (command.action === 'cancelar') {
      await supabase
        .from('grillas_pendientes')
        .update({ estado: 'cancelada', cancelada_at: new Date().toISOString() })
        .eq('id', grilla.id)

      await supabase.from('aprobaciones').insert({
        grilla_id: grilla.id,
        accion: 'rechazar',
        via: 'whatsapp',
        comentario: event.body,
        metadata: { event_id: eventId },
      })

      await sendWhatsAppToPhone(PEDRO_NUMBER, `❌ Cancelada grilla de ${marca?.nombre}.`)
      results.procesados.push(`cancelar:${command.marca_slug}`)
    } else if (command.action === 'regenerar') {
      await supabase
        .from('grillas_pendientes')
        .update({ estado: 'pendiente' })
        .eq('id', grilla.id)

      await supabase.from('aprobaciones').insert({
        grilla_id: grilla.id,
        accion: 'regenerar',
        via: 'whatsapp',
        comentario: event.body,
        metadata: { event_id: eventId },
      })

      await sendWhatsAppToPhone(PEDRO_NUMBER, `🔄 Regenerando grilla de ${marca?.nombre}.`)
      results.procesados.push(`regenerar:${command.marca_slug}`)
    }
  }

  return NextResponse.json({
    ok: true,
    procesados: results.procesados.length,
    acciones: results.procesados,
    errores: results.errores,
    duration_ms: Date.now() - startTime,
  })
}
```

- [ ] **Step 3: Build + commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -10
cd ..
git add app/lib/integrations/rubi-events.ts app/app/api/cron/listener-aprobacion/
git commit -m "feat(cron): listener-aprobacion endpoint con parser ok/no/redo"
```

---

## Task 5: Workflow GitHub Actions del listener

**Files:**
- Create: `.github/workflows/cron-listener-aprobacion.yml`

- [ ] **Step 1: Crear workflow**

```yaml
name: Cron — Listener aprobación WhatsApp

on:
  schedule:
    - cron: '*/5 12-23 * * 1-5'
  workflow_dispatch:

jobs:
  listener:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Call listener endpoint
        env:
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
          ENDPOINT_URL: https://distinto-app.vercel.app/api/cron/listener-aprobacion
        run: |
          set -e
          response=$(curl -sS -w "\n%{http_code}" \
            -H "Authorization: Bearer $CRON_SECRET" \
            "$ENDPOINT_URL")
          body=$(echo "$response" | head -n -1)
          status=$(echo "$response" | tail -n 1)
          echo "Status: $status"
          echo "Body: $body"
          if [ "$status" != "200" ]; then
            echo "::error::Listener returned non-200 status"
            exit 1
          fi
```

- [ ] **Step 2: Commit (Pedro debe pushear)**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add .github/workflows/cron-listener-aprobacion.yml
git commit -m "feat(cron): workflow listener aprobación cada 5 min lun-vie"
```

---

## Task 6: Deploy + tag v0.4.0

- [ ] **Step 1: Deploy**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx vercel --prod --yes 2>&1 | tail -5
```

- [ ] **Step 2: Tag**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git tag -a v0.4.0-plan4 -m "Plan 4: PNG + listener aprobación end-to-end

PNG generation con @vercel/og + Supabase Storage.
Listener cron cada 5 min: polea Rubi events, parsea ok/no/redo, ejecuta.

Flow completo: dashboard → cron → WhatsApp Pedro (PNG) → Pedro responde 'ok marca' → cron lo detecta → envía al grupo del cliente"
git push origin v0.4.0-plan4
```
