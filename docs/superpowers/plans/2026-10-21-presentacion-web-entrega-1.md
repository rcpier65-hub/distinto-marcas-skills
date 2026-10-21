# Presentación de Desarrollo Web — Entrega 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Presentación comercial de Desarrollo web a pantalla completa, con notas visibles, preguntas guiadas, checklist con nivel en vivo, preguntas y respuestas y generación de la propuesta borrador.

**Architecture:** Lógica pura en `lib/presentacion/` (niveles, checklist, mapeo a propuesta) con pruebas `tsx`. Sesiones en tabla `presentacion_sesiones` vía API `/api/presentaciones` (solo Pedro, igual que Propuestas). UI cliente en `/presentaciones` y `/presentaciones/[id]` con `motion/react` y Fullscreen API. La propuesta se crea en `propuestas_comerciales` con el mismo esquema `proposalSchema`.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (service role), zod 4, `motion` 12, tsx para pruebas.

**Spec:** `docs/superpowers/specs/2026-10-21-presentacion-web-design.md`

## Global Constraints

- Identidad Distinto: `#ba41f7`, `#7b2cbf`, `#f2cc2c`, `#0f0b16`, `#f6f1ea`; Fredoka (títulos) y Montserrat (texto) vía `next/font` como `components/sitio/site-frame.tsx`.
- Niveles: Básico S/ 1,800 · Intermedio S/ 3,000–3,500 · Avanzado S/ 5,000–8,000.
- Plazos aproximados: Básico 10–15 · Intermedio 20–30 · Avanzado 30–45 días hábiles; siempre «aproximado».
- La propuesta se crea en estado `borrador`; nunca `lista`.
- Solo `esPedroEmail(user.email)` crea/edita sesiones y propuestas (mismo criterio que `lib/propuestas/server.ts`).
- Nada de credenciales de clientes; no inventar métricas ni testimonios.
- Producción: `app/deploy/vps/publicar.sh` desde commit limpio; revisar `/api/version` antes.

## Review Focus

- Sesión sin respuestas: el nivel debe salir Básico y la propuesta igual generarse (con alcance mínimo) → test en Task 1 y Task 2.
- Doble clic en «Generar propuesta»: no crear dos propuestas (reutilizar `propuesta_id` de la sesión) → test en Task 3.
- Recargar la página a mitad de la reunión: notas y checklist se conservan (autosave) → verificación en Task 4.
- Pantalla pequeña / salir de pantalla completa con Esc: la navegación sigue usable → verificación en Task 4.
- Textos largos en notas (pegar un párrafo): no rompe el layout ni el guardado (límite 4000 por nota) → test de esquema en Task 2.

---

### Task 1: Niveles en el catálogo y estimador

**Files:**
- Modify: `app/lib/planes/catalogo.ts` (agregar 3 ítems `categoria: 'web'`)
- Create: `app/lib/presentacion/niveles.ts`
- Test: `app/scripts/test-presentacion.ts`

**Interfaces:**
- Produces: `type Nivel = 'basico' | 'intermedio' | 'avanzado'`; `NIVELES: Record<Nivel, { nombre: string; catalogoId: string; rango: string; desde: number; hasta: number; plazo: string }>`; `estimarNivel(r: RespuestasWeb): { nivel: Nivel; motivos: string[] }`; `type RespuestasWeb` (definido en Task 2, importado aquí como tipo).
- Catálogo ids: `web-nivel-basico` (S/ 1,800), `web-nivel-intermedio` (S/ 3,000–3,500), `web-nivel-avanzado` (S/ 5,000–8,000).

- [ ] Step 1: tests: sin respuestas → `basico`; `tipo:'tienda'` → `intermedio` con motivo que mencione «carrito»; `productos:'mas-100'` → `avanzado`; `integraciones:true` → `avanzado`; `idiomas:true` con `tipo:'presentacion'` → `intermedio`; los motivos nunca vacíos cuando el nivel sube.
- [ ] Step 2: correr `npx tsx scripts/test-presentacion.ts` → falla (módulo inexistente).
- [ ] Step 3: implementar reglas del spec (Básico: presentación/landing ≤5 páginas sin carrito; Intermedio: carrito+pagos o ≤100 productos o blog/reservas o idiomas; Avanzado: >100 productos, muchas variantes/imágenes, integraciones o desarrollo a medida). Nivel = máximo de reglas.
- [ ] Step 4: correr test → pasa.
- [ ] Step 5: commit.

### Task 2: Preguntas, checklist y propuesta (modelo puro)

**Files:**
- Create: `app/lib/presentacion/web.ts`
- Test: `app/scripts/test-presentacion.ts` (ampliar)

**Interfaces:**
- Produces: `PREGUNTAS: { id: string; grupo: string; texto: string; tipo: 'texto' | 'opcion' | 'sino'; opciones?: { id: string; etiqueta: string }[] }[]`; `CHECKLIST: { id: string; grupo: string; etiqueta: string }[]`; `FAQ: { p: string; r: string }[]`; `sesionSchema` (zod) con `{ cliente: { nombre, empresa, rubro, contacto }, respuestas: RespuestasWeb, notas: string (≤4000), checklist: Record<string, 'incluido'|'opcional'|'no'> }`; `checklistInicial(r: RespuestasWeb)`; `aPropuesta(s: Sesion, hoy: string, uid: () => string): ProposalData`.
- Consumes: `estimarNivel`, `NIVELES` (Task 1); `emptyProposal`, `serviceFromTemplate`, `proposalSchema` de `lib/propuestas/model.ts`.

- [ ] Step 1: tests: `aPropuesta` con nivel intermedio crea 1 servicio `sourceId:'web-nivel-intermedio'` con `price:null`, `frequency:'unico'`; ítems «opcional» salen como servicios `optional:true` `price:null`; `status === 'borrador'`; resultado pasa `proposalSchema.parse`; notas van a `objective`; `sesionSchema` rechaza notas > 4000.
- [ ] Step 2: correr → falla.
- [ ] Step 3: implementar. El servicio del nivel lleva en `scope` los ítems «incluido» (una línea cada uno) y en `summary` el rango y plazo aproximado.
- [ ] Step 4: correr → pasa.
- [ ] Step 5: commit.

### Task 3: Almacenamiento y API

**Files:**
- Create: `app/supabase/migrations/20261021180000_presentaciones.sql` (tabla `presentacion_sesiones`: id uuid pk, servicio text default 'web', data jsonb, propuesta_id uuid null, created_by uuid, created_at, updated_at; RLS on; revoke anon/authenticated)
- Create: `app/app/api/presentaciones/route.ts` (GET lista, POST crear, PUT guardar `{id, data}`)
- Create: `app/app/api/presentaciones/propuesta/route.ts` (POST `{id}` → crea o devuelve propuesta)

**Interfaces:**
- Consumes: `proposalActor`, `proposalBody`, `proposalError` (`lib/propuestas/server.ts`); `sesionSchema`, `aPropuesta` (Task 2).
- Produces: `POST /api/presentaciones/propuesta` → `{ propuestaId: string, numero: number }`; idempotente: si `propuesta_id` existe, lo devuelve sin crear otra.

- [ ] Step 1: aplicar migración (contenedor VPS, como migraciones previas).
- [ ] Step 2: implementar rutas; filtrar siempre por `created_by = user.id`.
- [ ] Step 3: prueba de integración con BD (script temporal): crear sesión, generar propuesta dos veces → mismo `propuestaId`; limpiar datos de prueba.
- [ ] Step 4: commit.

### Task 4: Interfaz de la presentación

**Files:**
- Create: `app/app/presentaciones/page.tsx` (lista + «Nueva presentación»)
- Create: `app/app/presentaciones/[id]/page.tsx` (carga sesión, renderiza deck)
- Create: `app/components/presentacion/deck.tsx` (etapas, navegación ←/→, pantalla completa, autosave con debounce 800 ms)
- Create: `app/components/presentacion/etapas.tsx` (Portada, Escuchar, Cómo trabajamos — 6 fases con texto; visuales en Entrega 2 —, Preguntas y respuestas, Tu página + checklist + nivel en vivo, Propuesta)
- Create: `app/components/presentacion/presentacion.css`
- Modify: navegación lateral (agregar «Presentaciones», solo dirección)
- Modify: `app/app/planes/...` para abrir `?propuesta=<id>` si el workspace lo permite; si no, enlace a `/planes`.

- [ ] Step 1: construir; verificar en navegador local con datos de prueba: navegación, pantalla completa y Esc, panel de notas visible, nivel cambia al marcar «tienda», generar propuesta.
- [ ] Step 2: `tsc`, `eslint` de archivos nuevos, `next build`.
- [ ] Step 3: commit, revisar `/api/version`, publicar, verificar 307 sin sesión.

## Entrega 2 (plan aparte)

Brief y mapa mental de Retoz, y los 14 proyectos en baja/media/alta con capturas reales.
