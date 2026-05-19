# Plan 1 — Sistema Grillas · Setup Infra + Base de Datos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tener un proyecto Next.js 15 vivo en Vercel + Supabase con schema completo de la BD + 7 marcas seedadas, listo para que el siguiente plan construya el dashboard encima.

**Architecture:** Monorepo dentro de `distinto-marcas-skills` con la app Next.js en `/app/`. Supabase como BD + auth, Vercel para hosting con auto-deploy desde GitHub. Schema relacional con 4 tablas nuevas + RLS básico + storage bucket para PNGs.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth + Storage) · Vercel

**Spec referenciado:** [`docs/superpowers/specs/2026-05-18-sistema-grillas-aprobacion-design.md`](../specs/2026-05-18-sistema-grillas-aprobacion-design.md)

**⛔ Bloqueante crítico:** Pedro debe crear el proyecto Supabase en su cuenta distinta ANTES del Task 5. El agente DEBE detenerse y pedirle las credenciales antes de avanzar.

---

## File Structure

Archivos que crea/modifica este plan:

```
distinto-marcas-skills/
├── .gitignore                              # MODIFICAR: agregar app/.env.local
├── app/                                    # CREAR: subcarpeta nueva
│   ├── .env.local                          # CREAR (no commitear)
│   ├── .env.example                        # CREAR: template
│   ├── package.json                        # AUTO-GENERADO
│   ├── tsconfig.json                       # AUTO-GENERADO
│   ├── next.config.ts                      # AUTO-GENERADO
│   ├── tailwind.config.ts                  # AUTO-GENERADO
│   ├── components.json                     # AUTO-GENERADO (shadcn)
│   ├── README.md                           # CREAR
│   ├── app/
│   │   ├── layout.tsx                      # AUTO-GENERADO
│   │   ├── page.tsx                        # MODIFICAR: hello + check Supabase
│   │   └── globals.css                     # AUTO-GENERADO
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                   # CREAR: browser client
│   │   │   └── server.ts                   # CREAR: server client
│   │   └── types/
│   │       └── database.ts                 # GENERADO por Supabase CLI
│   └── supabase/
│       ├── config.toml                     # CREAR: config local
│       └── migrations/
│           ├── 20260518000001_create_enums.sql      # CREAR
│           ├── 20260518000002_create_marcas.sql     # CREAR
│           ├── 20260518000003_create_grillas.sql    # CREAR
│           ├── 20260518000004_create_aprobaciones.sql # CREAR
│           ├── 20260518000005_create_envios.sql     # CREAR
│           ├── 20260518000006_storage_bucket.sql    # CREAR
│           ├── 20260518000007_rls_policies.sql      # CREAR
│           └── 20260518000008_seed_marcas.sql       # CREAR
└── docs/superpowers/plans/
    └── 2026-05-18-sistema-grillas-plan-1-setup-bd.md  # ESTE archivo
```

---

## Task 1: Preparar gitignore del monorepo

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Leer .gitignore actual**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
cat .gitignore
```

- [ ] **Step 2: Agregar entradas para Next.js + Vercel + Supabase secrets**

Append al `.gitignore` existente:

```
# === Next.js app (monorepo) ===
app/.env*.local
app/.env
app/node_modules/
app/.next/
app/out/
app/build/
app/dist/

# Vercel
.vercel
app/.vercel

# Supabase
app/supabase/.branches
app/supabase/.temp
```

- [ ] **Step 3: Verificar que el gitignore es válido**

```bash
git check-ignore app/.env.local && echo "OK: app/.env.local ignorado"
```

Expected: `OK: app/.env.local ignorado`

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: extender .gitignore para monorepo Next.js + Supabase"
```

---

## Task 2: Crear estructura de Next.js 15 en /app/

**Files:**
- Create: `app/package.json`, `app/tsconfig.json`, etc. (auto-generados)

- [ ] **Step 1: Verificar Node version**

```bash
node --version
```

Expected: `v20.x` o superior. Si no, instalar: `brew install node@20`.

- [ ] **Step 2: Crear app con `create-next-app`**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
npx create-next-app@latest app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias='@/*' \
  --use-npm \
  --no-turbopack
```

Cuando pregunte, aceptar defaults. La carpeta `app/` queda con la base de Next.js 15.

- [ ] **Step 3: Verificar que arranca**

```bash
cd app
npm run dev
```

Expected: server en `http://localhost:3000` con la pantalla default de Next.js. **Detener con Ctrl+C después de verificar**.

- [ ] **Step 4: Commit estructura inicial**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/
git commit -m "feat(app): scaffolding inicial Next.js 15 + TypeScript + Tailwind"
```

---

## Task 3: Configurar shadcn/ui

**Files:**
- Create: `app/components.json`, `app/lib/utils.ts`, `app/components/ui/`

- [ ] **Step 1: Inicializar shadcn**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx shadcn@latest init
```

Configuración:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `Yes`

- [ ] **Step 2: Instalar componentes base necesarios para el dashboard**

```bash
npx shadcn@latest add button card badge avatar dropdown-menu sonner
```

- [ ] **Step 3: Verificar que la app sigue arrancando**

```bash
npm run dev
```

Expected: sigue en `http://localhost:3000` sin errores. **Detener con Ctrl+C**.

- [ ] **Step 4: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/
git commit -m "feat(app): config shadcn/ui + componentes base (button, card, badge, sonner)"
```

---

## Task 4: Instalar Supabase SDK y crear clientes

**Files:**
- Create: `app/lib/supabase/client.ts`, `app/lib/supabase/server.ts`

- [ ] **Step 1: Instalar dependencias**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase
```

- [ ] **Step 2: Crear `lib/supabase/client.ts` (browser)**

```typescript
// app/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Crear `lib/supabase/server.ts` (server components)**

```typescript
// app/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component: ignore (middleware handles refresh)
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Crear `.env.example` con vars vacías como referencia**

Crear `app/.env.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=your-project-id

# Cowork webhook destination (set en Plan 3)
COWORK_WEBHOOK_URL=
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/lib/ app/package.json app/package-lock.json app/.env.example
git commit -m "feat(app): clientes Supabase (browser + server) + .env.example"
```

---

## Task 5: ⛔ PAUSA — Pedro crea proyecto Supabase

**Files:** (ninguno — bloqueante humano)

- [ ] **Step 1: Agente se detiene y pide a Pedro:**

Mostrar a Pedro este mensaje y esperar respuesta:

> "Para continuar necesito que crees el proyecto Supabase nuevo en tu cuenta distinta:
>
> 1. Andá a https://supabase.com → inicia sesión con tu cuenta nueva
> 2. New project → nombre: `distinto-app` (o el que prefieras)
> 3. Region: `us-east-1` o `sa-east-1` (Brasil, más cerca de Perú)
> 4. Database password: generala fuerte y guardala en tu password manager
> 5. Plan: Free
>
> Una vez creado (~2 min), andá a Project Settings → API y pasame:
> - **Project URL**: `https://xxxxx.supabase.co`
> - **anon public key**: `eyJ...`
> - **service_role secret key**: `eyJ...` (este es secreto crítico)
> - **Project ID** (de la URL, son las 20 letras antes de `.supabase.co`)
>
> Pegámelos directo en el chat — los voy a guardar en `app/.env.local` (que ya está en .gitignore, no se commitea)."

- [ ] **Step 2: Cuando Pedro pasa las credenciales, crear `app/.env.local`**

```bash
# app/.env.local (NO commitear - ya en .gitignore)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
SUPABASE_PROJECT_ID=[PROJECT_ID]
```

- [ ] **Step 3: Verificar conexión**

```bash
cd app
npx supabase login
npx supabase link --project-ref [PROJECT_ID]
```

Expected: "Finished supabase link"

- [ ] **Step 4: NO commitear nada (el archivo .env.local debe estar gitignored)**

```bash
git status
```

Expected: `app/.env.local` NO debe aparecer en untracked.

---

## Task 6: Crear migración 001 — Enums

**Files:**
- Create: `app/supabase/migrations/20260518000001_create_enums.sql`

- [ ] **Step 1: Crear archivo de migración**

```sql
-- app/supabase/migrations/20260518000001_create_enums.sql

-- Estado del ciclo de vida de una grilla pendiente
CREATE TYPE estado_grilla AS ENUM (
  'pendiente',
  'procesando',
  'esperando_aprobacion',
  'aprobada',
  'enviada',
  'cancelada',
  'regenerar'
);

-- Acciones de aprobación (auditoría)
CREATE TYPE accion_aprobacion AS ENUM (
  'solicitar',
  'aprobar',
  'rechazar',
  'regenerar'
);

-- Canal por el que llegó la acción
CREATE TYPE via_aprobacion AS ENUM (
  'whatsapp',
  'dashboard',
  'api'
);

-- Tipo de envío
CREATE TYPE tipo_envio AS ENUM (
  'whatsapp_grupo',
  'whatsapp_dm',
  'email'
);

-- Rol de usuario interno
CREATE TYPE rol_usuario AS ENUM (
  'admin',
  'colaborador',
  'cliente'
);
```

- [ ] **Step 2: Aplicar migración**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx supabase db push
```

Expected: `Applying migration 20260518000001_create_enums.sql... done`

- [ ] **Step 3: Verificar que los enums existen**

```bash
npx supabase db execute --query "SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;"
```

Expected: lista que incluye `accion_aprobacion`, `estado_grilla`, `rol_usuario`, `tipo_envio`, `via_aprobacion`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git add app/supabase/migrations/20260518000001_create_enums.sql
git commit -m "feat(db): migración 001 — enums (estado_grilla, accion_aprobacion, vía, tipo_envio, rol_usuario)"
```

---

## Task 7: Crear migración 002 — Tabla `marcas`

**Files:**
- Create: `app/supabase/migrations/20260518000002_create_marcas.sql`

- [ ] **Step 1: Crear migración**

```sql
-- app/supabase/migrations/20260518000002_create_marcas.sql

CREATE TABLE marcas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  nombre          text NOT NULL,
  decisor_nombre  text,
  decisor_tratamiento text,
  decisor_whatsapp text,
  grupo_whatsapp_nombre text,
  grupo_whatsapp_alias text,
  tono_voz        jsonb,
  color_primario_hex text,
  emoji_marca     text,
  activa          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marcas_slug ON marcas(slug);
CREATE INDEX idx_marcas_activa ON marcas(activa);

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_marcas
BEFORE UPDATE ON marcas
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE marcas IS 'Marcas activas que gestiona Agencia Distinto';
COMMENT ON COLUMN marcas.slug IS 'Identificador URL-safe (ej: manrique, little-joe)';
COMMENT ON COLUMN marcas.tono_voz IS 'Resumen estructurado de voz de marca para AI';
```

- [ ] **Step 2: Aplicar y verificar**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx supabase db push
npx supabase db execute --query "\d marcas"
```

Expected: muestra estructura de tabla `marcas` con todas las columnas.

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/supabase/migrations/20260518000002_create_marcas.sql
git commit -m "feat(db): migración 002 — tabla marcas + trigger updated_at"
```

---

## Task 8: Crear migración 003 — Tabla `grillas_pendientes`

**Files:**
- Create: `app/supabase/migrations/20260518000003_create_grillas.sql`

- [ ] **Step 1: Crear migración**

```sql
-- app/supabase/migrations/20260518000003_create_grillas.sql

CREATE TABLE grillas_pendientes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id            uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  semana_inicio       date NOT NULL,
  semana_fin          date NOT NULL,
  estado              estado_grilla NOT NULL DEFAULT 'pendiente',
  pedida_por          uuid,  -- FK a auth.users, se enlaza después
  pedida_at           timestamptz NOT NULL DEFAULT now(),
  procesada_at        timestamptz,
  aprobada_at         timestamptz,
  enviada_at          timestamptz,
  cancelada_at        timestamptz,
  png_url             text,
  png_storage_path    text,
  caption             text,
  mensaje_id_pedro    text,
  mensaje_id_cliente  text,
  publicaciones_count integer,
  notion_grilla_ids   jsonb,  -- array de IDs de Notion de las pubs incluidas
  notas               text,
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- una sola grilla pendiente activa por marca por semana
  CONSTRAINT unique_grilla_marca_semana UNIQUE (marca_id, semana_inicio),
  CONSTRAINT check_fechas CHECK (semana_fin >= semana_inicio)
);

CREATE INDEX idx_grillas_marca ON grillas_pendientes(marca_id);
CREATE INDEX idx_grillas_estado ON grillas_pendientes(estado);
CREATE INDEX idx_grillas_semana ON grillas_pendientes(semana_inicio DESC);
CREATE INDEX idx_grillas_pedida_at ON grillas_pendientes(pedida_at DESC);

CREATE TRIGGER set_timestamp_grillas
BEFORE UPDATE ON grillas_pendientes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE grillas_pendientes IS 'Grillas semanales en el ciclo de aprobación';
COMMENT ON COLUMN grillas_pendientes.notion_grilla_ids IS 'Array JSON de IDs Notion de las publicaciones incluidas en esta grilla';
```

- [ ] **Step 2: Aplicar y verificar**

```bash
cd app
npx supabase db push
npx supabase db execute --query "\d grillas_pendientes"
```

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/supabase/migrations/20260518000003_create_grillas.sql
git commit -m "feat(db): migración 003 — tabla grillas_pendientes con FKs + constraints"
```

---

## Task 9: Crear migración 004 — Tabla `aprobaciones`

**Files:**
- Create: `app/supabase/migrations/20260518000004_create_aprobaciones.sql`

- [ ] **Step 1: Crear migración**

```sql
-- app/supabase/migrations/20260518000004_create_aprobaciones.sql

CREATE TABLE aprobaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grilla_id   uuid NOT NULL REFERENCES grillas_pendientes(id) ON DELETE CASCADE,
  usuario_id  uuid,  -- FK a auth.users
  accion      accion_aprobacion NOT NULL,
  via         via_aprobacion NOT NULL,
  comentario  text,
  metadata    jsonb,  -- ej: { whatsapp_message_id, raw_text, etc. }
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aprobaciones_grilla ON aprobaciones(grilla_id);
CREATE INDEX idx_aprobaciones_usuario ON aprobaciones(usuario_id);
CREATE INDEX idx_aprobaciones_created ON aprobaciones(created_at DESC);

COMMENT ON TABLE aprobaciones IS 'Log de auditoría: cada acción de aprobación/rechazo/regen';
```

- [ ] **Step 2: Aplicar y verificar**

```bash
cd app
npx supabase db push
npx supabase db execute --query "\d aprobaciones"
```

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/supabase/migrations/20260518000004_create_aprobaciones.sql
git commit -m "feat(db): migración 004 — tabla aprobaciones (auditoría)"
```

---

## Task 10: Crear migración 005 — Tabla `envios`

**Files:**
- Create: `app/supabase/migrations/20260518000005_create_envios.sql`

- [ ] **Step 1: Crear migración**

```sql
-- app/supabase/migrations/20260518000005_create_envios.sql

CREATE TABLE envios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grilla_id     uuid NOT NULL REFERENCES grillas_pendientes(id) ON DELETE CASCADE,
  marca_id      uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  tipo          tipo_envio NOT NULL,
  destino       text NOT NULL,  -- número o alias del grupo
  caption       text,
  mensaje_id    text,           -- ID retornado por Rubi
  success       boolean NOT NULL DEFAULT false,
  error         text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_envios_grilla ON envios(grilla_id);
CREATE INDEX idx_envios_marca ON envios(marca_id);
CREATE INDEX idx_envios_success ON envios(success);
CREATE INDEX idx_envios_created ON envios(created_at DESC);

COMMENT ON TABLE envios IS 'Log de cada envío realizado (WhatsApp grupo, DM, email)';
```

- [ ] **Step 2: Aplicar y verificar**

```bash
cd app
npx supabase db push
npx supabase db execute --query "\d envios"
```

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/supabase/migrations/20260518000005_create_envios.sql
git commit -m "feat(db): migración 005 — tabla envios (log de mensajes enviados)"
```

---

## Task 11: Crear storage bucket para PNGs

**Files:**
- Create: `app/supabase/migrations/20260518000006_storage_bucket.sql`

- [ ] **Step 1: Crear migración del bucket**

```sql
-- app/supabase/migrations/20260518000006_storage_bucket.sql

-- Bucket público (URLs temporales válidas por 30 días)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'grillas-png',
  'grillas-png',
  false,  -- privado, accedemos con signed URLs
  10485760,  -- 10 MB max por archivo
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users pueden leer
CREATE POLICY "Authenticated users can read grillas"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'grillas-png');

-- Policy: service_role puede insertar (lo hace la routine)
CREATE POLICY "Service role can insert grillas"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'grillas-png');
```

- [ ] **Step 2: Aplicar y verificar**

```bash
cd app
npx supabase db push
npx supabase db execute --query "SELECT id, name, public FROM storage.buckets WHERE id = 'grillas-png';"
```

Expected: 1 fila con `id=grillas-png, public=false`.

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/supabase/migrations/20260518000006_storage_bucket.sql
git commit -m "feat(storage): bucket privado grillas-png + RLS"
```

---

## Task 12: Crear migración 007 — RLS policies básicas

**Files:**
- Create: `app/supabase/migrations/20260518000007_rls_policies.sql`

- [ ] **Step 1: Crear migración con RLS**

```sql
-- app/supabase/migrations/20260518000007_rls_policies.sql

-- Habilitar RLS en todas las tablas
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE grillas_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios ENABLE ROW LEVEL SECURITY;

-- MARCAS: cualquier autenticado puede leer todas. Solo service_role escribe.
CREATE POLICY "Authenticated can read all marcas"
ON marcas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role full access marcas"
ON marcas FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- GRILLAS: igual (en Plan 5 agregaremos permisos por marca)
CREATE POLICY "Authenticated can read all grillas"
ON grillas_pendientes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert grillas"
ON grillas_pendientes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role full access grillas"
ON grillas_pendientes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- APROBACIONES: solo lectura para autenticados
CREATE POLICY "Authenticated can read aprobaciones"
ON aprobaciones FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role full access aprobaciones"
ON aprobaciones FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ENVIOS: solo lectura para autenticados
CREATE POLICY "Authenticated can read envios"
ON envios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role full access envios"
ON envios FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

- [ ] **Step 2: Aplicar y verificar RLS activo**

```bash
cd app
npx supabase db push
npx supabase db execute --query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('marcas','grillas_pendientes','aprobaciones','envios');"
```

Expected: 4 filas con `rowsecurity=true`.

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/supabase/migrations/20260518000007_rls_policies.sql
git commit -m "feat(db): RLS policies básicas — authenticated read + service_role full"
```

---

## Task 13: Seed inicial — 7 marcas activas

**Files:**
- Create: `app/supabase/migrations/20260518000008_seed_marcas.sql`

- [ ] **Step 1: Crear migración con seed data**

```sql
-- app/supabase/migrations/20260518000008_seed_marcas.sql

INSERT INTO marcas (slug, nombre, decisor_tratamiento, decisor_nombre, decisor_whatsapp,
                    grupo_whatsapp_nombre, color_primario_hex, emoji_marca, activa, tono_voz)
VALUES
  ('manrique', 'Centro Psicológico Manrique ABA',
   'Dr.', 'Daniel Manrique', NULL,
   'Marketing Manrique ABA', '#283B6F', '💙', true,
   '{"arquetipo": "Sage + Caregiver", "emojis_on_brand": ["🌿","🌱","💙","✨"], "emojis_vetados": ["😂","🔥","🤣"], "tono": "Cálida, profesional, rigurosa"}'::jsonb),

  ('lozano', 'Muebles Lozano',
   'Sr.', 'Lozano', '969630299',
   NULL, '#DCC32C', '🪑', true,
   '{"tono": "Profesional comercial", "emoji": "🪑"}'::jsonb),

  ('distribuidora-fitness', 'Distribuidora Fitness Marketing',
   NULL, NULL, '973991208',
   NULL, NULL, '💪', true,
   '{"tono": "Motivacional, energético"}'::jsonb),

  ('little-joe', 'Little Joe',
   NULL, NULL, NULL,
   'New team', '#61B3D1', '💙', true,
   '{"tono": "Cálido juguetón premium italiano", "arquetipo": "Lover + Innocent + Caregiver"}'::jsonb),

  ('kintu', 'Kintu',
   NULL, NULL, '017369840',
   NULL, NULL, '🌿', true,
   '{"tono": "Natural wellness"}'::jsonb),

  ('novalamps', 'NovaLamps',
   NULL, NULL, '949462622',
   NULL, NULL, '💡', true,
   '{"tono": "Diseño iluminación"}'::jsonb),

  ('la-victoria', 'La Victoria',
   NULL, NULL, '973991208',
   NULL, NULL, '🏗️', true,
   '{"tono": "Profesional construcción"}'::jsonb);
```

- [ ] **Step 2: Aplicar y verificar**

```bash
cd app
npx supabase db push
npx supabase db execute --query "SELECT slug, nombre, activa, emoji_marca FROM marcas ORDER BY slug;"
```

Expected: 7 filas con las 7 marcas activas.

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/supabase/migrations/20260518000008_seed_marcas.sql
git commit -m "feat(db): seed inicial — 7 marcas activas con voz/contacto/color"
```

---

## Task 14: Generar tipos TypeScript desde el schema

**Files:**
- Create: `app/lib/types/database.ts` (auto-generado)

- [ ] **Step 1: Generar tipos**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app"
npx supabase gen types typescript --linked > lib/types/database.ts
```

- [ ] **Step 2: Verificar que el archivo se generó con contenido válido**

```bash
head -50 lib/types/database.ts
```

Expected: ver `export interface Database { ... }` con las tablas `marcas`, `grillas_pendientes`, etc.

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/lib/types/database.ts
git commit -m "feat(types): tipos TypeScript auto-generados desde Supabase schema"
```

---

## Task 15: Crear página `/` con healthcheck de Supabase

**Files:**
- Modify: `app/app/page.tsx`

- [ ] **Step 1: Reemplazar el contenido default de `page.tsx`**

```tsx
// app/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function Home() {
  const supabase = await createClient()
  const { data: marcas, error } = await supabase
    .from('marcas')
    .select('slug, nombre, emoji_marca, activa, color_primario_hex')
    .eq('activa', true)
    .order('slug')

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-2">Distinto App</h1>
      <p className="text-muted-foreground mb-8">
        Sistema de aprobación de grillas — healthcheck inicial
      </p>

      {error && (
        <Card className="border-destructive mb-4">
          <CardHeader>
            <CardTitle>❌ Error conectando a Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error.message}</pre>
          </CardContent>
        </Card>
      )}

      {marcas && (
        <>
          <h2 className="text-2xl font-semibold mb-4">
            ✅ {marcas.length} marcas activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marcas.map((m) => (
              <Card key={m.slug}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-3xl">{m.emoji_marca}</span>
                    {m.nombre}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{m.slug}</Badge>
                  {m.color_primario_hex && (
                    <div className="flex items-center gap-2 mt-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: m.color_primario_hex }}
                      />
                      <code className="text-sm">{m.color_primario_hex}</code>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Levantar el server y verificar localmente**

```bash
cd app
npm run dev
```

Abrir en navegador: http://localhost:3000

Expected: ver "✅ 7 marcas activas" + grid con cards de Manrique, Lozano, etc.

**Detener con Ctrl+C después de verificar.**

- [ ] **Step 3: Commit**

```bash
cd ..
git add app/app/page.tsx
git commit -m "feat(app): página home con healthcheck Supabase + grid de marcas"
```

---

## Task 16: Deploy a Vercel

**Files:** (ninguno - config en Vercel UI)

- [ ] **Step 1: Push todo a GitHub**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
git push origin main
```

- [ ] **Step 2: Conectar Vercel al repo**

Pedro debe hacer esto manualmente:

1. Ir a https://vercel.com/new
2. Import Git Repository: seleccionar `rcpier65-hub/distinto-marcas-skills`
3. **Configurar**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `app` ← CRÍTICO (sin esto Vercel busca en raíz y falla)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables** (pegarlos del `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_ID`

5. Click Deploy

- [ ] **Step 3: Verificar deploy exitoso**

Vercel asignará un URL tipo `https://distinto-marcas-skills.vercel.app`.

Abrir esa URL → debería ver el mismo healthcheck con las 7 marcas que viste local.

- [ ] **Step 4: Renombrar dominio (opcional)**

En Vercel project settings → Domains → Add: `distinto-app.vercel.app`

(El subdomain debe estar disponible — si no, elegí otro como `distinto-grilla.vercel.app`)

---

## Task 17: Validación end-to-end Plan 1

**Files:** (ninguno - testing manual)

- [ ] **Step 1: Verificar todos los checklists del plan**

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
grep -c "^- \[x\]" docs/superpowers/plans/2026-05-18-sistema-grillas-plan-1-setup-bd.md || true
```

Expected: contar tareas completadas vs total (~60-70).

- [ ] **Step 2: Verificar BD en Supabase Dashboard**

Ir a Supabase Dashboard → Database → Tables → debería ver:
- marcas (7 filas)
- grillas_pendientes (0 filas)
- aprobaciones (0 filas)
- envios (0 filas)

- [ ] **Step 3: Verificar Storage bucket**

Dashboard → Storage → debería ver bucket `grillas-png` (vacío).

- [ ] **Step 4: Verificar deploy Vercel**

Abrir URL pública → ver 7 marcas en el grid.

- [ ] **Step 5: Crear tag de versión**

```bash
git tag -a v0.1.0-plan1 -m "Plan 1 completado: setup infra + BD + 7 marcas seedadas"
git push origin v0.1.0-plan1
```

---

## ✅ Estado al terminar Plan 1

- ✅ Repo monorepo: plugin (público) + app Next.js (privada por env vars)
- ✅ Supabase nuevo con 4 tablas + RLS + storage bucket
- ✅ 7 marcas seedadas con voz/contacto/color
- ✅ Tipos TypeScript generados
- ✅ Página healthcheck en local y producción
- ✅ Vercel deploy automático conectado a GitHub
- ✅ Todo commiteado y versionado

## ➡️ Siguiente: Plan 2

Construir el **dashboard funcional con login**: pantallas `/login`, `/`, `/marca/[slug]`, `/historial`, `/settings`. Server Actions para botón "Pedir grilla". Realtime subscription para estados.

Crear el siguiente plan invocando `superpowers:writing-plans` con la fase 2 del spec.
