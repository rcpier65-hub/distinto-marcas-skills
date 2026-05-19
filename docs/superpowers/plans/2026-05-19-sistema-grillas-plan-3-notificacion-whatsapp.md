# Plan 3 — Sistema Grillas · Notificación WhatsApp (MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando Pedro toca "Pedir grilla" en el dashboard, recibe en su WhatsApp DM una notificación dentro de los próximos 3 minutos. Cierra el loop básico Dashboard → WhatsApp.

**Architecture:** Vercel cron (cada 3 min lun-vie 7am-8pm) que:
1. Conecta a Supabase con service_role
2. Busca grillas en estado `pendiente`
3. Para cada una: manda mensaje WhatsApp a Pedro via Rubi HTTP MCP (JSON-RPC)
4. Actualiza estado a `esperando_aprobacion`

**Tech Stack:** Next.js 16 Route Handler · Supabase service_role · Rubi HTTP MCP (JSON-RPC 2.0 over HTTP) · Vercel Cron

**Spec referenciado:** [`docs/superpowers/specs/2026-05-18-sistema-grillas-aprobacion-design.md`](../specs/2026-05-18-sistema-grillas-aprobacion-design.md)

**Scope explícito de este plan:**
- ✅ INCLUYE: notificación WhatsApp básica a Pedro cuando se pide grilla
- ❌ NO INCLUYE: generación de PNG visual (Plan 4)
- ❌ NO INCLUYE: listener de aprobaciones automático (Plan 4)
- ❌ NO INCLUYE: envío al grupo del cliente (Plan 4)

**⛔ Bloqueos humanos esperados:**
- Task 5: Pedro debe agregar `CRON_SECRET` en Vercel
- Task 8: Pedro debe verificar que el primer cron run funcionó (revisar logs Vercel + WhatsApp DM)

---

## File Structure

```
app/
├── lib/
│   ├── supabase/
│   │   └── service.ts                     # CREAR — client con service_role
│   └── integrations/
│       └── rubi.ts                        # CREAR — cliente HTTP a Rubi MCP
├── app/
│   └── api/
│       └── cron/
│           └── procesar-pendientes/
│               └── route.ts               # CREAR — endpoint cron
└── vercel.json                            # CREAR — config cron
```

---

## Task 1: Cliente Supabase con service_role

**Files:**
- Create: `app/lib/supabase/service.ts`

- [ ] **Step 1: Crear el cliente service**

```typescript
// app/lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Cliente Supabase con service_role key.
 * SOLO usar desde Server-side code (API routes, Server Actions internas).
 * NUNCA exponer al cliente — bypassa RLS.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or SERVICE_ROLE_KEY in env')
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

- [ ] **Step 2: Type check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/lib/supabase/service.ts
git commit -m "feat(supabase): service_role client para server-side ops"
```

---

## Task 2: Cliente HTTP de Rubi MCP

**Files:**
- Create: `app/lib/integrations/rubi.ts`

- [ ] **Step 1: Crear el cliente Rubi**

```typescript
// app/lib/integrations/rubi.ts
/**
 * Cliente HTTP para Rubi MCP (JSON-RPC 2.0).
 * Endpoint: https://distinto-mcp.fly.dev/mcp/<token>
 *
 * El MCP de Rubi es un servidor JSON-RPC accesible via HTTP/SSE.
 * Para llamar una tool: POST con body { jsonrpc, method: 'tools/call', params: { name, arguments } }
 */

const RUBI_URL = 'https://distinto-mcp.fly.dev/mcp/57b2a74126a923b30d88d6832a1a25effa7b576a2b217df6a2c1af76b55e2aef'

type RubiToolCallResult = {
  ok: true
  data: unknown
} | {
  ok: false
  error: string
}

let requestId = 0

async function callRubiTool(toolName: string, args: Record<string, unknown>): Promise<RubiToolCallResult> {
  requestId++
  const body = {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  }

  try {
    const response = await fetch(RUBI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2024-11-05',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${await response.text()}` }
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/event-stream')) {
      // SSE response: parsear el primer chunk "data: {...}"
      const text = await response.text()
      const dataLine = text.split('\n').find(l => l.startsWith('data: '))
      if (!dataLine) {
        return { ok: false, error: 'No data line in SSE response' }
      }
      const parsed = JSON.parse(dataLine.slice(6))
      if (parsed.error) {
        return { ok: false, error: parsed.error.message ?? 'Unknown JSON-RPC error' }
      }
      return { ok: true, data: parsed.result }
    } else {
      // JSON response normal
      const parsed = await response.json()
      if (parsed.error) {
        return { ok: false, error: parsed.error.message ?? 'Unknown JSON-RPC error' }
      }
      return { ok: true, data: parsed.result }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Envía un mensaje de texto a un número WhatsApp individual.
 */
export async function sendWhatsAppToPhone(phone: string, text: string): Promise<RubiToolCallResult> {
  return callRubiTool('whatsapp_send_to_phone', { phone, text })
}

/**
 * Envía un mensaje a un grupo WhatsApp por alias o nombre.
 */
export async function sendWhatsAppToGroup(
  groupName: string,
  text: string,
  byAlias = false
): Promise<RubiToolCallResult> {
  const args = byAlias ? { alias: groupName, text } : { group_name: groupName, text }
  return callRubiTool('whatsapp_send_message', args)
}
```

- [ ] **Step 2: Type check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/lib/integrations/rubi.ts
git commit -m "feat(integrations): cliente HTTP de Rubi MCP (JSON-RPC sobre SSE)"
```

---

## Task 3: Probar Rubi HTTP localmente con script

**Files:**
- Create: `app/scripts/test-rubi.mjs`

- [ ] **Step 1: Crear script de test**

```javascript
// app/scripts/test-rubi.mjs
// Test rápido: enviar un WhatsApp a Pedro via Rubi HTTP MCP

const RUBI_URL = 'https://distinto-mcp.fly.dev/mcp/57b2a74126a923b30d88d6832a1a25effa7b576a2b217df6a2c1af76b55e2aef'

async function callRubi(toolName, args) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  }

  const response = await fetch(RUBI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2024-11-05',
    },
    body: JSON.stringify(body),
  })

  console.log('Status:', response.status)
  console.log('Content-Type:', response.headers.get('content-type'))
  const text = await response.text()
  console.log('Body:', text.slice(0, 500))
  return text
}

console.log('=== Test 1: list tools ===')
await callRubi('tools/list', {})

console.log('\n=== Test 2: send WhatsApp ===')
await callRubi('whatsapp_send_to_phone', {
  phone: '51983852191',
  text: '🧪 Test Plan 3 — Rubi HTTP MCP funciona desde Node directo. Si recibís esto, el cliente HTTP está OK.',
})
```

- [ ] **Step 2: Ejecutar**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
node scripts/test-rubi.mjs 2>&1 | head -30
```

Expected: Status 200, response con resultado. Pedro debería recibir el mensaje en WhatsApp DM.

- [ ] **Step 3: Commit (sin push todavía)**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/scripts/test-rubi.mjs
git commit -m "chore: script para test rápido de Rubi HTTP MCP"
```

---

## Task 4: API route cron `/api/cron/procesar-pendientes`

**Files:**
- Create: `app/app/api/cron/procesar-pendientes/route.ts`

- [ ] **Step 1: Crear directorios y el route handler**

```typescript
// app/app/api/cron/procesar-pendientes/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsAppToPhone } from '@/lib/integrations/rubi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60  // segundos (Vercel free permite hasta 60s en route handlers)

const PEDRO_WHATSAPP = '51983852191'

export async function GET(request: Request) {
  // Auth: Vercel cron manda este header automáticamente con el bearer token configurado
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  const supabase = createServiceClient()
  const results = {
    procesadas: [] as string[],
    errores: [] as string[],
  }

  // 1. Buscar grillas en estado pendiente
  const { data: grillas, error } = await supabase
    .from('grillas_pendientes')
    .select(`
      id, semana_inicio, semana_fin, pedida_at,
      marca:marcas(slug, nombre, emoji_marca)
    `)
    .eq('estado', 'pendiente')
    .order('pedida_at', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[cron] Supabase query error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!grillas || grillas.length === 0) {
    return NextResponse.json({
      ok: true,
      procesadas: 0,
      duration_ms: Date.now() - startTime,
    })
  }

  // 2. Procesar cada grilla
  for (const g of grillas) {
    const marca = Array.isArray(g.marca) ? g.marca[0] : g.marca
    if (!marca) {
      results.errores.push(`${g.id}: sin marca relacionada`)
      continue
    }

    // 2a. Marcar como procesando
    await supabase
      .from('grillas_pendientes')
      .update({ estado: 'procesando', procesada_at: new Date().toISOString() })
      .eq('id', g.id)

    // 2b. Construir mensaje
    const text = [
      `${marca.emoji_marca ?? '📊'} *Grilla pendiente — ${marca.nombre}*`,
      `Semana ${g.semana_inicio} → ${g.semana_fin}`,
      ``,
      `Pedida hace ${minutosAtras(g.pedida_at)} minutos.`,
      ``,
      `_Por ahora solo notificación. PNG + envío automático al cliente en Plan 4._`,
      ``,
      `Dashboard: https://distinto-app.vercel.app/marca/${marca.slug}`,
    ].join('\n')

    // 2c. Enviar a Pedro
    const sendResult = await sendWhatsAppToPhone(PEDRO_WHATSAPP, text)

    if (sendResult.ok) {
      // 2d. Marcar como esperando_aprobacion
      await supabase
        .from('grillas_pendientes')
        .update({ estado: 'esperando_aprobacion' })
        .eq('id', g.id)

      // 2e. Log en aprobaciones
      await supabase.from('aprobaciones').insert({
        grilla_id: g.id,
        accion: 'solicitar',
        via: 'api',
        comentario: 'Notificación enviada a Pedro DM',
      })

      results.procesadas.push(`${marca.slug}`)
    } else {
      // Revert al estado pendiente si falla envío
      await supabase
        .from('grillas_pendientes')
        .update({
          estado: 'pendiente',
          error: sendResult.error,
        })
        .eq('id', g.id)

      results.errores.push(`${marca.slug}: ${sendResult.error}`)
    }
  }

  return NextResponse.json({
    ok: true,
    procesadas: results.procesadas.length,
    marcas: results.procesadas,
    errores: results.errores,
    duration_ms: Date.now() - startTime,
  })
}

function minutosAtras(timestamp: string): number {
  const diff = Date.now() - new Date(timestamp).getTime()
  return Math.round(diff / 60000)
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm run build 2>&1 | tail -15
```

Expected: build OK con ruta `/api/cron/procesar-pendientes`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/app/api/cron/
git commit -m "feat(cron): API route procesar-pendientes con auth bearer"
```

---

## Task 5: Configurar Vercel cron + CRON_SECRET

**Files:**
- Create: `app/vercel.json`

- [ ] **Step 1: Crear `vercel.json` con cron config**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/procesar-pendientes",
      "schedule": "*/5 * * * 1-5"
    }
  ]
}
```

NOTA: Vercel Free tier permite cron en horario UTC. `*/5 * * * 1-5` = cada 5 min, lunes-viernes (Lima -5h vs UTC, así que abarca todo el día laboral peruano).

NOTA 2: En Vercel Free, los crons solo se ejecutan **una vez por día como prueba**. Para uso continuo se necesita Vercel Pro ($20/mes). Si Pedro está en Free, este plan funciona pero los crons solo corren 1 vez al día. En Plan 4 podemos pivotar a Cowork scheduled tasks como alternativa.

- [ ] **Step 2: Generar CRON_SECRET y agregar a Vercel**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
# Generar un secret aleatorio de 32 caracteres
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
echo "Generated CRON_SECRET (guardar para test manual): $CRON_SECRET"
# Agregar a Vercel production
printf "$CRON_SECRET\n" | npx vercel env add CRON_SECRET production 2>&1 | tail -3
```

- [ ] **Step 3: Guardar secret en `.env.local` también para tests locales**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
# Append the same value to .env.local
echo "" >> .env.local
echo "# Cron auth (Plan 3)" >> .env.local
echo "CRON_SECRET=$CRON_SECRET" >> .env.local
```

- [ ] **Step 4: Commit vercel.json**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/vercel.json
git commit -m "feat(cron): vercel.json con cron */5 lun-vie para procesar pendientes"
```

---

## Task 6: Deploy a producción

**Files:** (deploy, no archivos)

- [ ] **Step 1: Push a GitHub**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git push origin main 2>&1 | tail -3
```

- [ ] **Step 2: Deploy production manual**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx vercel --prod --yes 2>&1 | tail -10
```

Expected: deployment Ready, URL aliased a distinto-app.vercel.app.

- [ ] **Step 3: Verificar cron registrado en Vercel**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx vercel inspect https://distinto-app.vercel.app 2>&1 | head -30
```

Expected: ver `Crons:` con el path `/api/cron/procesar-pendientes`.

---

## Task 7: Test manual del endpoint

**Files:** (testing, no archivos)

- [ ] **Step 1: Crear una grilla pendiente desde el dashboard**

Pedro abre https://distinto-app.vercel.app/dashboard, hace login, y click en "🟢 Pedir grilla" en Manrique. Verifica que aparece "🟡 Pendiente".

- [ ] **Step 2: Llamar el endpoint manualmente con curl**

```bash
# Obtener el CRON_SECRET desde .env.local
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d= -f2)
curl -sv \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://distinto-app.vercel.app/api/cron/procesar-pendientes 2>&1 | tail -20
```

Expected:
- HTTP 200
- Body JSON con `procesadas: 1, marcas: ["manrique"]`
- Pedro recibe mensaje WhatsApp en su DM dentro de ~5 segundos
- Estado en BD cambia a `esperando_aprobacion`

- [ ] **Step 3: Verificar en BD**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
cat > /tmp/check-estado.mjs << 'EOF'
import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`
  SELECT m.slug, gp.estado, gp.procesada_at, gp.error
  FROM grillas_pendientes gp
  JOIN marcas m ON m.id = gp.marca_id
  ORDER BY gp.pedida_at DESC LIMIT 5
`)
r.rows.forEach(row => console.log(row.slug, '|', row.estado, '|', row.procesada_at, '|', row.error || ''))
await c.end()
EOF
node /tmp/check-estado.mjs
```

Expected: la marca procesada aparece con `estado=esperando_aprobacion`, `procesada_at` con timestamp reciente, `error` vacío.

- [ ] **Step 4: Verificar log de aprobaciones**

```bash
cat > /tmp/check-aprob.mjs << 'EOF'
import pg from 'pg'
const { Client } = pg
const c = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.exhmimlehdisonjvedvx', password: 'Z-S,JHFbB46mUuC',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`
  SELECT accion, via, comentario, created_at
  FROM aprobaciones ORDER BY created_at DESC LIMIT 5
`)
r.rows.forEach(row => console.log(row.accion, '|', row.via, '|', row.comentario, '|', row.created_at))
await c.end()
EOF
node /tmp/check-aprob.mjs
```

Expected: fila con `accion='solicitar', via='api', comentario='Notificación enviada a Pedro DM'`.

---

## Task 8: ⛔ Pedro confirma que llegó el WhatsApp

**Files:** (validación humana)

- [ ] **Step 1: Pedro abre su WhatsApp y verifica DM de Rubi**

Pedro debe ver mensaje formateado así:
```
💙 *Grilla pendiente — Centro Psicológico Manrique ABA*
Semana 2026-05-18 → 2026-05-24

Pedida hace 1 minutos.

_Por ahora solo notificación. PNG + envío automático al cliente en Plan 4._

Dashboard: https://distinto-app.vercel.app/marca/manrique
```

Si Pedro lo recibe → ✅. Si no, diagnosticar:
- ¿Rubi MCP está respondiendo? (correr `node app/scripts/test-rubi.mjs`)
- ¿El endpoint devolvió 200 OK?
- ¿Las env vars CRON_SECRET y SUPABASE_SERVICE_ROLE_KEY están en Vercel production?

---

## Task 9: Tag v0.3.0-plan3

**Files:** (versionado)

- [ ] **Step 1: Crear tag**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git tag -a v0.3.0-plan3 -m "Plan 3 completado: notificación WhatsApp básica MVP

Live: https://distinto-app.vercel.app

Lo que funciona ahora:
- Botón 'Pedir grilla' en dashboard → INSERT en grillas_pendientes
- Cron Vercel cada 5 min (lun-vie) → procesa pendientes
- Cliente Rubi HTTP MCP (JSON-RPC sobre SSE) → manda mensaje a Pedro DM
- Estado en BD: pendiente → procesando → esperando_aprobacion
- Log de auditoría en tabla aprobaciones

NO incluido (planes futuros):
- Generación de PNG visual (Plan 4)
- Listener automático de respuestas 'ok marca' (Plan 4)
- Envío automático al grupo del cliente (Plan 4)

Limitaciones conocidas:
- Vercel Free: cron solo corre 1×/día. Producción real necesita Vercel Pro
  o pivotar a Cowork scheduled-tasks
- Latencia: hasta 5 min entre botón y WhatsApp (cron interval)"

git push origin v0.3.0-plan3 2>&1 | tail -3
```

---

## ✅ Estado al terminar Plan 3

- ✅ Cliente Supabase service_role para ops server-side
- ✅ Cliente HTTP de Rubi MCP (JSON-RPC sobre SSE)
- ✅ Endpoint cron `/api/cron/procesar-pendientes` con auth bearer
- ✅ Vercel cron configurado (cada 5 min lun-vie)
- ✅ Flow end-to-end: click → BD → cron → WhatsApp Pedro
- ✅ Auditoría en tabla `aprobaciones`
- ✅ Estados de grilla transicionan correctamente

## ➡️ Siguiente: Plan 4

Plan 4 agrega lo que falta para el flow completo:
- Generación de PNG visual con plantilla por marca
- Listener de Rubi: detecta "ok [marca]" en WhatsApp DM de Pedro
- Envío automático al grupo del cliente con PNG + caption
- Estados: aprobada → enviada

Crear con `superpowers:writing-plans` cuando Plan 3 esté validado.
