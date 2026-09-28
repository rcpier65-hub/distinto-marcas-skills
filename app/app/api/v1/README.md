# Distinto API v1 — para Routines externas

Esta API permite a una **Routine externa** (Anthropic Routine, Cowork, n8n, lo
que sea) procesar comentarios pendientes sin necesidad de acceso directo a la
base de datos. La app de Distinto es el "data layer", la Routine es el "cerebro".

---

## Auth

Todos los endpoints requieren header:

```
Authorization: Bearer <CRON_SECRET>
```

El valor de `CRON_SECRET` está en Vercel env vars del proyecto `distinto-app`.

---

## Endpoints

### `GET /api/v1/comentarios/pendientes`

Lista comentarios en status `pending` para procesar.

**Query params:**
- `marca=<slug>` — filtra por una marca (ej. `manrique`)
- `sin_sugerencia=true` — solo los que aún no tienen respuesta sugerida
- `limit=<N>` — max rows (default 50, max 200)

**Response:**
```json
{
  "ok": true,
  "count": 12,
  "rows": [
    {
      "id": "uuid-del-comentario-en-inbox",
      "marca": { "slug": "manrique", "nombre": "Centro Psicológico…", "emoji": "🧠" },
      "network": "instagram",
      "author": "mariafer.lopez",
      "text": "Hola, atienden niños de 4 años con sospecha de TEA?",
      "created_at": "2026-05-26T08:32:00Z",
      "post": {
        "link": "https://instagram.com/reel/…",
        "text_preview": "Evaluación neuropsicológica…",
        "media_url": "https://…"
      },
      "categoria_sugerida": "pregunta_info",
      "respuesta_sugerida": null,
      "status": "pending"
    }
  ]
}
```

**Ejemplo curl:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://distinto-app.vercel.app/api/v1/comentarios/pendientes?sin_sugerencia=true&limit=100"
```

---

### `POST /api/v1/comentarios/sugerencia`

La Routine sube las respuestas generadas. Soporta single o batch.

**Body single:**
```json
{
  "comentario_id": "uuid-del-comentario-en-inbox",
  "respuesta_sugerida": "Buen día 😊 La evaluación se hace en 3-4 sesiones…",
  "categoria_sugerida": "pregunta_info",
  "fuente": "claude-routine",
  "metadata": { "modelo": "claude-sonnet-4-5", "tokens_input": 487, "tokens_output": 89 }
}
```

**Body batch (recomendado para Routines que procesan N a la vez):**
```json
{
  "items": [
    { "comentario_id": "uuid-1", "respuesta_sugerida": "…", "categoria_sugerida": "pregunta_info" },
    { "comentario_id": "uuid-2", "respuesta_sugerida": "…", "categoria_sugerida": "testimonial" }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "total": 2,
  "updated": 2,
  "errors": 0,
  "results": [
    { "id": "uuid-1", "ok": true },
    { "id": "uuid-2", "ok": true }
  ]
}
```

**Ejemplo curl:**
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"comentario_id":"abc-123","respuesta_sugerida":"Hola 💙","categoria_sugerida":"empatia"}' \
  https://distinto-app.vercel.app/api/v1/comentarios/sugerencia
```

---

### `POST /api/v1/whatsapp/notify`

Envía mensaje WhatsApp a un grupo. Usado por la Routine para avisar
cuando terminó de procesar.

**Body:**
```json
{
  "marca_slug": "manrique",       // opcional si chat_id directo
  "chat_id": "120363...",         // opcional si marca_slug
  "text": "✅ Listo, generé 5 sugerencias",
  "mentions": ["51983852191"],    // opcional
  "scope": "cliente"              // "cliente" (grupo cliente) | "interno" (grupo Pedro)
}
```

**Casos comunes:**

Avisar al cliente que hay sugerencias listas:
```json
{ "marca_slug": "manrique", "text": "Listo, generé 5 sugerencias para revisar en la app" }
```

Avisar a Pedro internamente:
```json
{ "scope": "interno", "text": "Procesé todas las marcas. Total: 27 sugerencias." }
```

**Response:**
```json
{ "ok": true, "scope": "cliente", "target": "120363...", "message_id": "ABCD123" }
```

---

## Workflow típico (Routine que corre 8:30am)

```
1. Cron Vercel ejecuta /api/cron/morning-fetch a las 8am Lima
   → fetch comentarios nuevos de Metricool → upsert en BD → manda
     WhatsApp a clientes con pendientes y a Pedro con digest

2. Tu Routine programada 8:30am:
   a. GET /api/v1/comentarios/pendientes?sin_sugerencia=true
   b. Para cada comentario: genera respuesta con Claude usando tu prompt
   c. POST /api/v1/comentarios/sugerencia con batch de respuestas
   d. (opcional) POST /api/v1/whatsapp/notify scope=interno con resumen
      "Procesé 27 sugerencias en 4 minutos"

3. Pedro abre https://distinto-app.vercel.app/comentarios
   → revisa sugerencias en la UI → aprueba/edita/rechaza
   → al aprobar, server action interno postea respuesta a Metricool
```

---

## Códigos HTTP

| Code | Significado |
|------|-------------|
| 200  | OK |
| 400  | Bad request (validation) — ver `error` en body |
| 401  | Auth fallida — bearer token wrong/missing |
| 404  | Recurso no existe (ej. marca slug inválido) |
| 500  | Error interno — ver `error` en body |
| 502  | Falla upstream (Metricool, WhatsApp) |

---

## Nay / Kairos (sesión, JWT o clave `dst_live_`)

Estas rutas envuelven la web de Production. No usan `CRON_SECRET`.

Auth, en este orden:

1. Sin header `Authorization`: cookie de sesión de Distinto.
2. `Authorization: Bearer dst_live_…`: clave de dispositivo. El plaintext se muestra una sola vez; en `api_device_keys` queda el SHA-256.
3. `Authorization: Bearer <access_token de Supabase>`.

| Método | Ruta | Quién | Qué envuelve |
|--------|------|-------|----------------|
| GET | `/api/v1/grabaciones/calendario` | módulo publicaciones; la clave `dst_live_` necesita alcance `owner` | `cargarAgendaCalendario` — los mismos eventos que pinta `/grabaciones/calendario` |
| POST | `/api/v1/grabaciones/calendario` | director, admin, o usuario sin `team_member`; clave con `owner` | `ejecutarAgendarReunion` o `ejecutarAgendarGrabacion` (asistente «Agendar reunión o grabación») |
| GET | `/api/v1/tareas?due=hoy` | el miembro; clave con `tareas:read` u `owner` | `cargarTrabajoDeHoy` + `cargarPendientesInicio` (`/inicio`) y `cargarTareasParaHoy` (alcance de `/tareas`) |
| GET, POST | `/api/v1/device-keys` | cookie o JWT. No acepta `dst_live_` | alta y listado de claves |
| PATCH, DELETE | `/api/v1/device-keys/:id` | el dueño de la clave | ampliar alcance (`["owner"]` o `["tareas:read"]`) o revocar |

Directores, admin, o un usuario sin fila en `team_members` crean claves con `scopes: ["owner"]`. El resto queda en `["tareas:read"]`. `owner` cubre `tareas:read`.

POST calendario:

```json
{ "tipo": "reunion", "marca_slug": "kintu", "fecha": "2026-10-10", "hora": "11:00", "titulo": "Reunión con Kintu", "duration_min": 45 }
```

`tipo` es `reunion` (Meet + invitación, falla si Google Calendar no está conectado) o `grabacion` (queda en Grabaciones aunque Google falle). `hora` acepta `11:00` o `11am`. Si omites `correos` en una reunión, se usan los `correos_clientes` de la marca.

GET calendario sin `desde`/`hasta` devuelve la semana en curso (lunes a domingo, Lima), igual que la vista por defecto de la página.

### Dónde va la tarjeta de claves en Perfil

Perfil todavía no tiene la tarjeta. El lugar es `app/app/perfil/page.tsx`, debajo de `<PerfilForm />` (y en la pantalla de admin sin `team_member`, debajo del aviso violeta). Misma caja que ese aviso: padding 16, fondo `#f5f3ff`, borde `1px solid #ddd6fe`, radio 12. La tarjeta lista con `GET /api/v1/device-keys` y crea con `POST { "name": "Nay" }`; el token `dst_live_…` se muestra una sola vez. Hasta que exista la tarjeta, un director la crea con la cookie de sesión o un JWT:

```bash
curl -X POST -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nay"}' \
  https://distinto-app.vercel.app/api/v1/device-keys
```

Hay que aplicar `app/supabase/migrations/20260928140001_api_device_keys.sql` si la tabla no está en Supabase.

---

## Versionado

Es `v1`. Si Anthropic / nosotros queremos breaking changes en el futuro,
creamos `v2` paralelo. La idea es que tu Routine consuma `v1` durante
meses sin que se rompa.
