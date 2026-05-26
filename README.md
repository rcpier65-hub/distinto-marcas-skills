# Distinto Agencia — Sistema operativo interno

> Plataforma full-stack para automatizar tareas repetitivas de Agencia Distinto:
> gestión de grillas semanales, respuesta de comentarios en redes, tracking de
> grabaciones, hábitos diarios, y comunicación con clientes via WhatsApp.

**Status actual**: producción · 9 marcas clientes activas · 6 features deployadas
**URL app principal**: https://distinto-app.vercel.app
**Owner**: [@rcpier65-hub](https://github.com/rcpier65-hub) (Pedro Reyes Calderón)
**Última actualización**: mayo 2026

---

## 🎯 Qué resuelve este sistema

Distinto es una agencia de marketing digital con 9 marcas clientes activas. Cada
semana, mes y día tenemos tareas repetitivas que consumen tiempo:

| Tarea repetitiva | Frecuencia | Antes | Ahora |
|---|---|---|---|
| Armar grilla semanal de contenido y mandar al cliente | Semanal × 9 marcas | Diseñar PNG manual, mandar por WhatsApp | Endpoint genera PNG con plantilla de marca + envío automático |
| Responder comentarios IG/FB/TikTok | Diario × 9 marcas | Entrar a cada Metricool, leer, responder | Sistema clasifica + sugiere respuesta + batch approve |
| Tracking de sesiones de grabación | Mensual × 9 marcas | Excel desperdigado | Calendario + KPI dashboard por marca |
| Hábitos diarios del equipo (responder DMs, publicar historias) | Diario | Recordatorios mentales | Habit tracker estilo Streaks con heatmap |
| Configuración de cada marca (logos, WhatsApp, Metricool) | One-time + ajustes | Hardcoded en código | Settings UI editable |

**Filosofía**: cada feature elimina ≥30 min/día de trabajo manual. Lo que el equipo
hace mejor (creatividad, relación con cliente) queda. Lo repetitivo se automatiza.

---

## ✨ Features deployadas

### 📊 Grillas semanales (`/grilla/[slug]`)
- Vista preview en HTML iframe + caption editable
- 7 themes de diseño (uno por marca) con tipografías, paletas y mood únicos
- Render PNG 1080×1620 via Chromium server-side (Vercel)
- Botón **🧪 Probar** envía al grupo interno + botón **📤 Enviar** al cliente real
- Safety lock por marca (`envio_real_habilitado`)
- Mention clickeable al decisor (`@<número>` en caption)

### 💬 Comentarios (`/comentarios`)
- Inbox unificado IG/FB/TikTok via Metricool
- Auto-clasificador heurístico (6 categorías: pregunta_info, testimonial, empatia, derivar, reaccion, otro)
- Templates de respuesta por categoría × marca, configurables
- Batch approve con confirm dialog
- Informe WhatsApp al grupo configurado después de responder

### 🎬 Grabaciones (`/grabaciones`)
- Vista **Lista**: tabla con KPIs por marca (cumplidas/canceladas/objetivo)
- Vista **Calendario**: grid mensual con eventos color-coded por marca
- Cadencia configurable (semanal/mensual + cantidad)
- Cumplimiento % con barra de progreso

### 🔥 Hábitos diarios (`/habitos`)
- 4 hábitos seeded (responder comentarios, revisar tendencias, publicar historias, informar al grupo)
- Botón ¡Hecho! con estado dinámico
- Heatmap 7×7 últimos 49 días con color del hábito
- ProgressRing SVG con % cumplimiento
- Filtros: lun-vie o todos los días por hábito

### ⚙️ Settings (`/settings`)
- Logos por marca (URL Drive, conversión automática)
- Configuración WhatsApp por marca (grupo, mention, decisor, safety lock)
- Credentials Metricool API (con botón Probar conexión)
- Próximamente: editor templates comentarios, Google Calendar OAuth

### 📦 Plugin skills (Claude Code)
- 9 skills de marca instalables via `/plugin marketplace add`
- Cada skill: voz, audiencia, oferta, KPIs, sensibilidades, competencia, objetivos del mes
- Skill `grilla-semanal` con workflow operativo

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Vercel   │  │  Fly.io (×3) │  │   Supabase       │    │
│  │            │  │              │  │                  │    │
│  │ app Next.js│  │ - WhatsApp   │  │ Postgres + RLS   │    │
│  │ (Edge)     │  │   bot        │  │ - 22 migrations  │    │
│  │            │  │ - MCP Metric │  │ - Service Role   │    │
│  │            │  │ - Rubi (old) │  │                  │    │
│  └─────┬──────┘  └──────┬───────┘  └─────────┬────────┘    │
│        │                │                     │             │
│        └────────────────┼─────────────────────┘             │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────┐       │
│  │     Servicios externos                            │       │
│  │  • Metricool API (comentarios IG/FB/TikTok)       │       │
│  │  • Meta Graph APIs (futuro)                       │       │
│  │  • Google Drive (logos, assets de marca)          │       │
│  │  • Notion (publicaciones, calendario)             │       │
│  └───────────────────────────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Server Actions, Next.js Route Handlers (API routes) |
| **Database** | Supabase Postgres con RLS por row |
| **Auth** | Supabase Auth (Google OAuth + Email magic link) |
| **Render PNG** | Chromium serverless (`@sparticuz/chromium-min` + `puppeteer-core`) |
| **WhatsApp** | Baileys (TypeScript) — bot propio en Fly.io |
| **Storage** | Supabase Storage (PNGs de grillas, logos) |
| **Hosting bots** | Fly.io (3 apps: whatsapp, metricool-pro, rubi viejo) |
| **MCPs** | Python (Metricool) + TypeScript (WhatsApp) servidos via SSE |

---

## 📁 Estructura del monorepo

```
distinto-marcas-skills/
│
├── app/                              ← Next.js app (deploy a Vercel)
│   ├── app/                          ← App Router routes
│   │   ├── dashboard/                ← Resumen de la agencia
│   │   ├── grilla/[slug]/            ← Workspace de grillas
│   │   ├── grabaciones/              ← Lista + Calendario
│   │   ├── habitos/                  ← Habit tracker
│   │   ├── comentarios/              ← Inbox Metricool
│   │   ├── settings/                 ← Config global + por marca
│   │   ├── publicaciones/            ← CRUD de posts
│   │   ├── editor/                   ← Editor de contenido
│   │   ├── marca/[slug]/             ← Vista detalle marca
│   │   └── api/                      ← Endpoints (render-grilla, debug, cron)
│   │
│   ├── lib/
│   │   ├── integrations/             ← Clientes para Rubi, Metricool, WhatsApp, Notion
│   │   ├── grilla/                   ← Theme system + template builder
│   │   ├── comentarios/              ← Clasificador heurístico
│   │   ├── supabase/                 ← Server + service clients
│   │   └── types/database.ts         ← Schema typings (sync con Supabase)
│   │
│   ├── components/                   ← UI compartida (Header, sign-out, shadcn)
│   ├── supabase/migrations/          ← 22 SQL migrations idempotentes
│   └── vercel.json                   ← Config Vercel (cron, headers, etc.)
│
├── services/                         ← Servicios complementarios (Fly.io)
│   ├── whatsapp/                     ← Bot WhatsApp Baileys (TypeScript)
│   │   ├── src/                      ← Express + Baileys client + routes
│   │   ├── Dockerfile + fly.toml     ← Deploy → distinto-whatsapp.fly.dev
│   │   └── README.md                 ← Setup paso a paso
│   │
│   └── metricool-pro-mcp/            ← MCP Metricool remoto (Python)
│       ├── server.py                 ← FastMCP con 26 tools
│       ├── Dockerfile + fly.toml     ← Deploy → distinto-metricool-pro.fly.dev
│       └── README.md
│
├── plugins/distinto-marcas/          ← Plugin Claude Code (9 skills + workflows)
│   ├── skills/
│   │   ├── marca-1-muebles-lozano/
│   │   ├── marca-2-manrique/
│   │   ├── ...marca-9-oral-beauty/
│   │   ├── grilla-semanal/           ← Skill operativo de workflow
│   │   ├── responder-tiktok/
│   │   └── marca-template/
│   └── plugin.json                   ← Manifest
│
├── docs/                             ← Documentación general
└── tmp-demo/                         ← Assets temporales (PNGs de prueba)
```

### Despliegues activos

| Deployment | Plataforma | URL | Source |
|---|---|---|---|
| App principal | Vercel | `distinto-app.vercel.app` | `app/` |
| Bot WhatsApp | Fly.io | `distinto-whatsapp.fly.dev` | `services/whatsapp/` |
| MCP Metricool | Fly.io | `distinto-metricool-pro.fly.dev/sse` | `services/metricool-pro-mcp/` |
| Rubi (WhatsApp viejo) | Fly.io | `distinto-mcp.fly.dev` | (no en este repo) |
| Supabase project | Supabase | `exhmimlehdisonjvedvx.supabase.co` | (gestionado en Studio) |

---

## 🎨 Roadmap de UI redesign (Claude Design)

El sistema funciona pero **el diseño es funcional, no bonito todavía**. La próxima
gran fase: rediseñar cada pantalla con Claude Design para que la experiencia visual
esté a la altura de la calidad de las marcas que servimos.

### Pantallas a rediseñar (en orden de prioridad)

| Pantalla | Estado actual | Objetivo Claude Design |
|---|---|---|
| **Dashboard** (`/dashboard`) | Lista básica | Hero con KPIs visuales, navegación cards, identidad agencia |
| **Grilla workspace** (`/grilla/[slug]`) | Funcional, sin estilo | Preview iframe destacado, caption editor moderno, botones claros |
| **Comentarios** (`/comentarios`) | Tabla densa | Inbox profesional estilo Intercom/Front |
| **Grabaciones** (`/grabaciones`) | Lista + calendario básico | Calendario tipo Cron/Calendly, KPI cards con motion |
| **Hábitos** (`/habitos`) | Inspirado en Streaks pero feo | Cards 3D, animaciones, dark mode pulido |
| **Settings** (`/settings`) | Cards apiladas | Layout split (nav lateral + content), formularios elegantes |

### Sistema de diseño deseado

- **Paleta**: oscuro premium (no plano) + acentos por marca (cada marca tiene su color)
- **Tipografía**: display (headings) + body legible (Quicksand, Inter o algo distintivo)
- **Componentes base**: cards con hover sutil, botones con micro-interactions, inputs estilizados
- **Motion**: transiciones suaves en navegación, loading states, success feedback
- **Accesibilidad**: WCAG AA mínimo, dark mode nativo

### Cómo conectar Claude Design

> Una vez que vinculés este repo a Claude Design, esa herramienta puede
> generar rediseños propuestos pantalla por pantalla. El README + estructura
> del repo le dan contexto suficiente para entender qué es cada vista.

Pasos típicos del flow Claude Design:
1. Apuntar Claude Design a `https://github.com/rcpier65-hub/distinto-marcas-skills`
2. Seleccionar pantalla (`app/app/dashboard/page.tsx` por ejemplo)
3. Claude Design genera variantes de redesign + preview en vivo
4. Aplicar la variante elegida → PR automático al repo

---

## 🚀 Cómo levantar el proyecto local

### Pre-requisitos

```bash
node --version    # 22+ requerido
pnpm --version    # o npm/yarn
python --version  # 3.10+ (solo para services/metricool-pro-mcp)
flyctl version    # solo si vas a deployar services/*
```

### Setup app principal (Vercel)

```bash
git clone https://github.com/rcpier65-hub/distinto-marcas-skills.git
cd distinto-marcas-skills/app

# Instalar deps
pnpm install   # o npm install

# Configurar env vars (ver .env.example)
cp .env.example .env.local
# Editar .env.local con tus credenciales Supabase

# Levantar dev server
pnpm dev   # http://localhost:3000
```

### Env vars críticas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://exhmimlehdisonjvedvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# WhatsApp service (Fly.io)
WHATSAPP_SERVICE_URL=https://distinto-whatsapp.fly.dev
WHATSAPP_SHARED_SECRET=...
WHATSAPP_USE_INTERNAL=true

# Render Chromium (PNG generation)
CRON_SECRET=...

# Notion (publicaciones)
NOTION_TOKEN=...
NOTION_DATABASE_ID=...
```

### Setup bot WhatsApp local

Ver [`services/whatsapp/README.md`](./services/whatsapp/README.md) para el flujo
completo de QR scan + deploy a Fly.

### Setup MCP Metricool local (Claude Desktop)

```bash
cd services/metricool-pro-mcp
uv venv && uv sync   # crea .venv con deps Python

# Agregar a ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "metricool-pro": {
      "command": "/abs/path/to/services/metricool-pro-mcp/.venv/bin/python",
      "args": ["/abs/path/to/services/metricool-pro-mcp/server.py"],
      "env": {
        "METRICOOL_USER_TOKEN": "tu_token",
        "METRICOOL_USER_ID": "4466493"
      }
    }
  }
}
```

---

## 📦 Plugin de skills (Claude Code)

Para los miembros del equipo Distinto que solo necesitan las skills de marca
(no la app completa):

```bash
/plugin marketplace add https://github.com/rcpier65-hub/distinto-marcas-skills
/plugin install distinto-marcas
```

Las 9 skills quedan disponibles automáticamente. Actualizaciones de objetivos
mensuales se propagan con `/plugin update distinto-marcas`.

### 9 marcas clientes activas

| Skill | Cliente | Sector |
|---|---|---|
| `marca-1-muebles-lozano` | Muebles Lozano SAC | Mobiliario |
| `marca-2-manrique` | Centro Psicológico Manrique ABA | Salud mental |
| `marca-3-distribuidora-fitness` | Distri Fitness Mayorista | Suplementos |
| `marca-4-little-joe` | Typhouse (ex Little Joe) | Diseño/branding |
| `marca-5-mil-ideas` | Mil Ideas Perú | Decoración |
| `marca-6-kintu` | Kintu Essential Oils | Wellness |
| `marca-7-novalamps` | Novalamps Eléctrika | Iluminación |
| `marca-8-la-victoria` | La Victoria | Maderera |
| `marca-9-oral-beauty` | Oral Beauty | Salud dental |

---

## 🛠️ Workflow de desarrollo

### Branches

- `main` — producción (auto-deploy a Vercel + Fly)
- Feature branches: `feat/nombre-feature`
- Hotfixes: `fix/descripcion-corta`

### Commits

Convención simple: `tipo(scope): descripción`

Ejemplos:
- `feat(grabaciones): vista calendario`
- `fix(comentarios): SELECT defensivo pre-migration`
- `docs(readme): actualizar arquitectura`

### Migrations Supabase

1. Crear SQL en `app/supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`
2. Probar local si es posible (`pg` directo o Supabase CLI)
3. Aplicar en Supabase Studio (SQL Editor → Run)
4. Documentar la migration en commit

**Patrón "defensive code"**: si el código nuevo depende de schema nuevo, hacelo
tolerante a "tabla no existe" con try/catch. Permite deploy de código antes de
aplicar migration sin romper la app.

---

## 🔐 Seguridad

- **Secrets**: nunca en commits. Usar Vercel env vars + Fly secrets + Supabase RLS
- **Service role key**: solo en servidor (`createServiceClient`), nunca expuesto al cliente
- **Tokens API externos** (Metricool, Notion): rotables desde `/settings` → integraciones
- **RLS Supabase**: todas las tablas tienen policy `to authenticated`. Sin acceso anónimo
- **Safety locks**: feature flags por marca (ej. `envio_real_habilitado`) para evitar acciones destructivas durante desarrollo

---

## 📞 Contacto

**Agencia Distinto S.A.C.**
- Web: [agenciadistinto.com](https://www.agenciadistinto.com)
- Email: team@agenciadistinto.com
- WhatsApp: +51 983 852 191
- Owner del repo: [@rcpier65-hub](https://github.com/rcpier65-hub) (Pedro Reyes Calderón)

---

## 📊 Status técnico

| Componente | Versión | Status |
|---|---|---|
| App Next.js | Production | ✅ Estable |
| Bot WhatsApp interno | v1.0.0 | ✅ Estable |
| MCP Metricool Pro | v1.0.0 | ✅ Estable (local + remoto) |
| Plugin Distinto Marcas | v1.0.0 | ✅ 9 skills operativas |
| Schema Supabase | Migration 020 | ✅ Aplicada |

**Total features deployados**: 6 (grillas, grabaciones, hábitos, comentarios, settings, plugin)
**Total migrations SQL**: 22
**Total servicios Fly.io**: 3
**Total marcas en producción**: 9
