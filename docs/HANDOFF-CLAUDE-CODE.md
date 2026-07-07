# Traspaso · Cómo seguir trabajando este proyecto en otro chat de Claude Code

> ⚠️ **Seguridad:** este documento NO contiene ningún valor secreto (ni tokens,
> ni service-role keys, ni connection strings). Solo dice **qué** claves existen
> y **de dónde copiarlas**. Los valores reales los copias tú desde tus archivos
> locales (`.env.local` y `~/.claude.json`). No pegues los valores en ningún chat.

---

## 0. Lo más importante (léelo primero)

**Si vas a abrir el nuevo chat en la MISMA Mac**, casi todo se hereda solo:

- **Servidores MCP** → viven en `~/.claude.json` (config global de tu usuario) → se cargan automáticamente en cualquier chat nuevo.
- **Skills / plugins** (marcas Distinto, grilla-semanal, etc.) → son globales → se cargan solos.
- **Secretos de la app** (`.env.local`) → ya están en la carpeta del proyecto.
- **Memoria del proyecto** (todo el contexto de negocio) → se carga sola si abres el chat en la **misma carpeta**.

👉 En ese caso solo tienes que abrir `claude` en la carpeta correcta y ya. **No hay que copiar nada.**

**Si es una Mac/entorno distinto**, sigue las secciones 3, 4 y 5 para replicar secretos y MCP.

---

## 1. Qué es el proyecto y dónde vive

| Cosa | Ruta / valor |
|---|---|
| Código de la app (Next.js 16 · App Router) | `/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app` |
| Rutas del App Router | `distinto-marcas-skills/app/app/...` |
| Repo Git | `rcpier65-hub/distinto-marcas-skills` |
| Proyecto Vercel | `distinto-app` · URL **https://distinto-app.vercel.app** |
| Carpeta desde la que trabajas este chat (cwd) | `/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/APP MANRIQUE ABANZA` |

> Nota: el chat corre con cwd en **"APP MANRIQUE ABANZA"** pero el código se edita
> con rutas absolutas dentro de **"distinto-marcas-skills"**. La **memoria** del
> proyecto está atada a la ruta "APP MANRIQUE ABANZA" — si abres el nuevo chat en
> esa misma carpeta, la memoria (contexto de negocio) se carga sola.

---

## 2. El "prompt" / contexto del proyecto

No hay un prompt gigante en un solo archivo. El contexto se arma de 3 fuentes que Claude Code carga **solo**:

1. **`app/CLAUDE.md`** → apunta a `app/AGENTS.md` (reglas de Next.js).
2. **Memoria automática** (lo más valioso — reglas de negocio, gotchas, marcas):
   `~/.claude/projects/-Users-pedroreyescalderon-Downloads-1--DISTINTO-AGENCIA-APP-MANRIQUE-ABANZA/memory/`
   Archivos: `MEMORY.md` (índice), `project_manrique.md`, `user_pedro_distinto.md`,
   `deploy_distinto_app.md`, `app_distinto_gotchas.md`, `comentarios_inbox_metricool.md`,
   `manrique_web_gotchas.md`, `marca_vid_natur.md`, `marca_mil_ideas.md`.
3. **Skills / plugins** del marketplace `distinto-marcas` (una skill por marca + `grilla-semanal`).

> Regla dura de idioma (está en la memoria): **español peruano** siempre — tuteo, imperativos peruanos (elige, configura, pon), nunca argentino.

**Para replicar la memoria en otra Mac:** copia toda la carpeta `memory/` de arriba
a la misma ruta relativa bajo `~/.claude/projects/<hash-de-la-carpeta>/` en la Mac nueva.

---

## 3. Variables de entorno de la app (`.env.local`)

Están en `distinto-marcas-skills/app/.env.local` (gitignored). **Claves que usa** (copia el archivo entero; NO copies los valores a mano en un chat):

| Clave | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key pública del cliente (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Key admin (server-side, ignora RLS) |
| `SUPABASE_PROJECT_ID` | Ref del proyecto Supabase |
| `NOTION_TOKEN` | 🔒 Token de integración Notion (grillas) |
| `NOTION_GRILLA_DB_ID` | ID de la DB "Grilla de contenido" |
| `CRON_SECRET` | 🔒 Secreto que protege los endpoints `/api/cron/*` |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

Las `VERCEL_*` las inyecta Vercel solo en el build — no las necesitas localmente.

**Copiar a un entorno nuevo (mismo Mac o carpeta nueva):**
```bash
cp "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/app/.env.local"  <carpeta-nueva>/app/.env.local
```

---

## 4. Servidores MCP (conexiones que dan las herramientas)

Configurados en `~/.claude.json`. En la **misma Mac se cargan solos**. Para replicarlos
en otra máquina, recrea cada uno (los valores 🔒 los copias de tu `~/.claude.json` actual):

| MCP | Cómo corre | Env que necesita |
|---|---|---|
| **distinto** | `npx tsx ".../distinto-mcp/src/server.ts"` | `SUPABASE_URL`, `WORKSPACE_ID`, `DEFAULT_USER_ID`, `SUPABASE_SERVICE_ROLE_KEY` 🔒 |
| **metricool** | `uvx --upgrade mcp-metricool` | `METRICOOL_USER_TOKEN` 🔒, `METRICOOL_USER_ID` |
| **metricool-pro** | `python ".../metricool-pro-mcp/server.py"` | `METRICOOL_USER_TOKEN` 🔒, `METRICOOL_USER_ID` |
| **rubi** (WhatsApp/WAHA) | HTTP → `https://distinto-mcp.fly.dev/mcp/<TOKEN>` 🔒 | El token va **en la URL** — cópiala completa de tu `~/.claude.json` |
| **magic** (21st.dev UI) | `npx -y @21st-dev/magic@latest` | `API_KEY` 🔒 |
| **codex** | `Codex.app .../codex mcp-server` | — |

> El servidor MCP **distinto** (código local) vive en la carpeta hermana
> `.../1. DISTINTO AGENCIA/distinto-mcp/` (ojo: es distinta de `distinto-marcas-skills/mcp-distinto/`).

**Conectores de claude.ai** (OAuth, NO son tokens en archivos — se autorizan desde
la configuración de conectores de claude.ai): Notion, Vercel, Metricool Pro Online,
Gmail, Google Calendar, Google Drive, Figma, Canva, higgsfield, Facebook.
En el chat nuevo, si piden autorización, se reconectan desde **claude.ai → Settings → Connectors** (o `/mcp` en una sesión interactiva).

**Ver tu config actual de MCP (con valores) para copiarla tú mismo:**
```bash
open ~/.claude.json    # o ábrelo con tu editor; NO lo pegues en un chat
```

---

## 5. Deploy a producción

Desde `distinto-marcas-skills/app/`:
```bash
npx vercel --prod --yes
```
Gotchas (de la memoria):
- El auto-deploy GitHub→Vercel **NO está conectado** → un `git push` no deploya; hay que correr el CLI.
- El build remoto corre `tsc` + ESLint. Pre-validar con:
  `./node_modules/.bin/tsc --noEmit -p .`
- El **MCP de Vercel da 403** para este team → monitorea el build por el output del CLI, no por MCP.
- Evitar `next build` local (disco casi lleno → riesgo ENOSPC); confiar en el build remoto.
- CLI autenticado como `rcpier65-7045`. En Mac nueva: `npx vercel login`.

---

## 6. Checklist para arrancar el chat nuevo

**Mismo Mac (caso típico):**
- [ ] Abrir `claude` en la carpeta de siempre → MCP, skills, memoria y `.env.local` se cargan solos.
- [ ] (Opcional) Activar remote control con `/rc` para seguir desde el celular.

**Mac / entorno nuevo:**
- [ ] Clonar/copiar el código `distinto-marcas-skills`.
- [ ] Copiar `app/.env.local` (sección 3).
- [ ] Recrear los MCP en `~/.claude.json` (sección 4) con los valores de tu config actual.
- [ ] Copiar la carpeta `memory/` (sección 2).
- [ ] Reconectar conectores claude.ai (Notion, Vercel, etc.).
- [ ] `npx vercel login` para poder deployar.
- [ ] Instalar deps: en `app/` correr `npm install`.
