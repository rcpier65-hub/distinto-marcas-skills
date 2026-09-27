# Distinto API v1 — para Routines externas

Esta API permite a una **Routine externa** (Anthropic Routine, Cowork, n8n, lo
que sea) procesar comentarios pendientes sin necesidad de acceso directo a la
base de datos. La app de Distinto es el "data layer", la Routine es el "cerebro".

---

## Auth

La mayoría de endpoints de **rutinas** requieren header:

```
Authorization: Bearer <CRON_SECRET>
```

El valor de `CRON_SECRET` está en Vercel env vars del proyecto `distinto-app`.
**Nunca va en el Mac ni en Nay.** Solo lo usan rutinas del servidor.

### Matriz para Nay (Kairos)

Nay usa una clave de dispositivo `dst_live_…` (Perfil → Kairos) o el JWT de
Supabase de la sesión (`Authorization: Bearer <supabase access_token>`).
La clave con alcance `owner` actúa como el usuario que la creó: mismos
módulos y `marcas_acceso` que esa sesión (director/owner, por ejemplo
pedro@agenciadistinto.com).

| Quién emite la clave | `scopes` al crearla |
|---|---|
| Sin fila en `team_members`, o rol `director` / `admin` | `["owner"]` |
| Cualquier otro miembro | `["tareas:read"]` |

`owner` cubre `tareas:read` y el resto de la API de usuario. Al validar también
valen los alias `full` y `*`. Una clave vieja que solo tiene `tareas:read` se
amplía **sin rotar el token**:

```bash
curl -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scopes":["owner"]}' \
  https://distinto-app.vercel.app/api/v1/device-keys/<uuid>
```

Eso lo puede hacer el dueño de la clave si es director, admin u owner. En la
web: Perfil → Kairos → «Acceso completo». Bajar de nuevo: `{"scopes":["tareas:read"]}`.

| Endpoint | `dst_live_` `owner` | JWT de sesión | `dst_live_` solo `tareas:read` | `CRON_SECRET` |
|---|---|---|---|---|
| `GET /api/v1/tareas` | sí | sí | sí | sí (solo servidor) |
| `POST /api/v1/tareas`, `PATCH /api/v1/tareas/:id` | sí | sí | no | no |
| `GET /api/v1/publicaciones` (`?marca=`) | sí | sí | no | no |
| `GET` y `PATCH /api/v1/publicaciones/:id` | sí | sí | no | no |
| `GET /api/v1/marcas/:slug` | sí | sí | no | no |
| `GET /api/v1/marcas/:slug/facts` | sí | sí | no | sí (rutina) |
| `PATCH` y `PUT /api/v1/marcas/:slug/facts` | sí (director/owner) | sí (director/owner) | no | no |
| GET Mac: perfil, soporte, reportes, calendario, notas, oficina, ideas | sí | sí | no | no |
| `GET /api/v1/marcas` (lista) y el resto de rutinas de comentarios | no | no | no | sí |

Los GET que antes pedían solo JWT (perfil, soporte, publicaciones, reportes,
calendario, notas, oficina, ideas) aceptan la misma clave `owner`. El permiso
de módulo y `marcas_acceso` siguen siendo los del dueño. `CRON_SECRET` no abre
esas listas.

---

## Endpoints

### `GET /api/v1/tareas`

Lista unificada de «qué tengo para hoy» (America/Lima). Pensada para Kairos.

**URL:** `https://distinto-app.vercel.app/api/v1/tareas`

**Auth (Kairos usa la primera):**

```
Authorization: Bearer dst_live_…
Authorization: Bearer <supabase access_token>
```

La clave de dispositivo se crea en Distinto → Perfil → «Kairos (macOS)».
Formato `dst_live_` + secreto. En la base solo se guarda el SHA-256. El
plaintext se muestra una vez. Una clave `tareas:read` o `owner` ve las mismas
filas que si ese usuario mandara su JWT (miembro → sus tareas; sin fila en
`team_members` → alcance CEO `team_member_id IS NULL`). `owner` también crea
y completa tareas. Una clave revocada responde 401. Gestionar claves
(`/api/v1/device-keys`) exige la sesión o el JWT, no la clave de dispositivo.

El access token es el JWT de sesión de Supabase Auth (`session.access_token`).
Se valida con la anon key y `auth.getUser(jwt)`. No hace falta cookie.

`CRON_SECRET` sigue aceptado en este endpoint solo como fallback de rutinas
de servidor. No lo uses en Kairos.

**Alcance:**

| Quién | Sin `team_member_id` | Con `team_member_id=<uuid>` |
|---|---|---|
| Usuario con fila en `team_members` | Solo sus filas (`team_member_id` = su id) | Solo si el uuid es el suyo. Otro uuid → 403, salvo el dueño cuyo `nombre` es `Pedro` |
| Usuario sin fila (Pedro/admin/owner) | `team_member_id IS NULL` (sus tareas y pendientes) | Las de ese miembro |
| `CRON_SECRET` | Igual que el admin: `IS NULL` | Las de ese miembro |

Un miembro con `activo = false` recibe 403. No se le trata como admin.

**Query params:**

- `due=hoy` — único valor de v1. Si se omite, equivale a `hoy`. Otro valor → 400.
- `include_overdue=1` — en `tareas` que SÍ tienen fecha, `fecha_entrega <= hoy` en lugar de `= hoy`. No cambia las tareas sin fecha ni los pendientes rápidos.
- `team_member_id=<uuid>` — ver tabla de alcance.

**Fuentes (v1):**

1. `public.tareas` con `completada = false`. Con `due=hoy` la unión es
   las que tienen fecha y caen hoy (`fecha_entrega = hoy`, o `<= hoy` si
   `include_overdue=1`) más las abiertas con `fecha_entrega IS NULL`.
   Esas sin fecha entran como inbox con `due: null` (misma idea que los
   pendientes rápidos); `fuente` sigue siendo `"tareas"`. Hasta 200 con fecha
   y 200 sin fecha.
   `texto` → `titulo`, `estado` → `status` (`sin_empezar` o null → `pendiente`;
   `en_proceso` y el resto se devuelven tal cual), `marca_slug` → `marca`
   (nombre de la marca si existe, si no el slug) y, si no hay categoría, también
   `proyecto`. `categoria` del tablero → `proyecto`. `prioridad` es `null`
   (esa columna no existe en `tareas`). `link` → `/tareas`.
2. `public.pendientes_rapidos` con `completado = false`. No tienen fecha: entran
   como inbox con `due: null` y `fuente: "pendientes_rapidos"`. `status` es
   `"pendiente"`. `prioridad` es el número guardado. La UI está en `/inicio`.

No incluye diseño ni hábitos.

**Response:**

```json
{
  "ok": true,
  "fecha": "2026-09-27",
  "total": 3,
  "tareas": [
    {
      "id": "uuid",
      "titulo": "Cerrar pauta de la semana",
      "due": "2026-09-27",
      "status": "pendiente",
      "prioridad": null,
      "proyecto": "Typhouse",
      "marca": "Typhouse",
      "link": "https://distinto-app.vercel.app/tareas",
      "fuente": "tareas"
    },
    {
      "id": "uuid",
      "titulo": "Revisar contrato del local",
      "due": null,
      "status": "pendiente",
      "prioridad": null,
      "proyecto": "Administrativo",
      "marca": null,
      "link": "https://distinto-app.vercel.app/tareas",
      "fuente": "tareas"
    },
    {
      "id": "uuid",
      "titulo": "Mandar portadas a Lorena",
      "due": null,
      "status": "pendiente",
      "prioridad": 1,
      "proyecto": "Diseño",
      "marca": null,
      "link": "https://distinto-app.vercel.app/inicio",
      "fuente": "pendientes_rapidos"
    }
  ]
}
```

**Ejemplo curl — clave de dispositivo (Kairos):**

```bash
curl -H "Authorization: Bearer dst_live_…" \
  "https://distinto-app.vercel.app/api/v1/tareas?due=hoy&include_overdue=1"
```

**Ejemplo curl — JWT de usuario (también válido):**

```bash
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://distinto-app.vercel.app/api/v1/tareas?due=hoy&include_overdue=1"
```

**Ejemplo curl — CRON_SECRET (solo rutina de servidor; alcance CEO si no pasas miembro):**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://distinto-app.vercel.app/api/v1/tareas?due=hoy"

curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://distinto-app.vercel.app/api/v1/tareas?due=hoy&team_member_id=<uuid>"
```

---

### Claves de dispositivo

Sesión de Distinto (cookie) o `Authorization: Bearer <supabase access_token>`.
No aceptan `dst_live_…`.

#### `GET /api/v1/device-keys`

Lista las claves del usuario logueado. No incluye el secreto ni el hash.

```json
{
  "ok": true,
  "keys": [
    {
      "id": "uuid",
      "name": "Kairos — MacBook",
      "prefix": "dst_live_a1b2c3d4",
      "created_at": "2026-09-27T18:00:00.000Z",
      "last_used_at": null,
      "revoked": false,
      "scopes": ["owner"]
    }
  ]
}
```

#### `POST /api/v1/device-keys`

Body: `{ "name": "Kairos — MacBook" }`.

La respuesta incluye `key.token` (`dst_live_…`) **una sola vez**.

```bash
curl -X POST -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kairos — MacBook"}' \
  https://distinto-app.vercel.app/api/v1/device-keys
```

Director, admin u owner reciben `scopes: ["owner"]`. El resto recibe
`["tareas:read"]`. `GET /api/v1/device-keys` incluye `can_issue_owner`.

#### `PATCH /api/v1/device-keys/:id`

Amplía o reduce el alcance **sin cambiar** el `dst_live_…`. Body:
`{"scopes":["owner"]}` o `{"scopes":["tareas:read"]}`. Una clave revocada
responde 409. Quien no es director/admin/owner no puede pedir `owner` (403).

```bash
curl -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scopes":["owner"]}' \
  https://distinto-app.vercel.app/api/v1/device-keys/<uuid>
```

#### `DELETE /api/v1/device-keys/:id`

Revoca la clave (no la borra). Repetir el DELETE sobre una clave ya revocada
responde 200.

```bash
curl -X DELETE -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://distinto-app.vercel.app/api/v1/device-keys/<uuid>
```

---

### `POST /api/v1/tareas`

Crea una tarea o un pendiente rápido. Auth: JWT o `dst_live_` con `owner`.
No acepta `CRON_SECRET`.

```bash
curl -X POST -H "Authorization: Bearer dst_live_…" \
  -H "Content-Type: application/json" \
  -d '{"texto":"Cerrar pauta de Kintu","marca_slug":"kintu","fecha_entrega":"2026-09-28"}' \
  https://distinto-app.vercel.app/api/v1/tareas
```

`fuente` opcional: `tareas` (default) o `pendientes_rapidos`. En pendientes,
`prioridad` es 1, 2 o 3 y `categoria` es Diseño, Edición, Comunicación,
Investigación, Personal, Urgente, Administrativo u Otro. `team_member_id`
asigna a otra persona solo si el dueño es director, admin, owner o el miembro
llamado Pedro.

### `PATCH /api/v1/tareas/:id`

Completa o edita. Misma auth que el POST. Quien puede tocarla: owner sin
`team_members`, director, admin, Pedro, el asignado o el creador.

```bash
curl -X PATCH -H "Authorization: Bearer dst_live_…" \
  -H "Content-Type: application/json" \
  -d '{"completada":true}' \
  https://distinto-app.vercel.app/api/v1/tareas/<uuid>
```

Pendiente rápido: `{"fuente":"pendientes_rapidos","completado":true}`.

### `GET /api/v1/publicaciones`

Además de `desde` y `hasta`, acepta `?marca=<slug>`.

- Slug que no existe → 404.
- Slug fuera de `marcas_acceso` → 403.
- Sin el módulo publicaciones → 403.

Auth: JWT o `dst_live_` `owner`. No usa `CRON_SECRET` (semana y mes siguen
siendo de rutina).

```bash
curl -H "Authorization: Bearer dst_live_…" \
  "https://distinto-app.vercel.app/api/v1/publicaciones?marca=kintu"
```

La respuesta incluye `marca` (el slug pedido, o `null`).

### `GET /api/v1/publicaciones/:id`

Ficha para Nay: nombre, copy, guion, estado (valor real del pipeline),
estado_tarea, fechas, plataformas, tipo, marca, `drive_material_url`,
`drive_resultado_url`, links de TikTok e Instagram, portadas y videos.
404 si no existe. 403 si la marca está fuera de `marcas_acceso`.

### `PATCH /api/v1/publicaciones/:id`

Actualiza los campos que mandes (estado, copy, guion, fechas, URLs de Drive,
links, checklist). Exige `puede_editar` del módulo publicaciones, igual que
la web. No dispara el push ni el flujo de «mandar a diseño» del formulario.
No acepta `CRON_SECRET`.

```bash
curl -X PATCH -H "Authorization: Bearer dst_live_…" \
  -H "Content-Type: application/json" \
  -d '{"estado":"aprobar","copy":"Nuevo copy","drive_resultado_url":"https://drive.google.com/drive/folders/abc"}' \
  https://distinto-app.vercel.app/api/v1/publicaciones/<uuid>
```

`estado` es el enum de la grilla (`tareas`, `idear`, `editar`, `disenar`,
`aprobar`, `programar`, `publicado`, …). Las URLs tienen que ser `http` o
`https`.

### `GET /api/v1/marcas/:slug`

Branding, facts y Drive para Nay. JWT o `dst_live_` `owner`. 404 slug inválido
o inexistente. 403 fuera de `marcas_acceso`. No incluye tokens de Metricool.
No usa `CRON_SECRET`.

```bash
curl -H "Authorization: Bearer dst_live_…" \
  https://distinto-app.vercel.app/api/v1/marcas/kintu
```

```json
{
  "ok": true,
  "has_facts": true,
  "marca": {
    "slug": "kintu",
    "nombre": "Kintu",
    "emoji": "🌿",
    "color": "#234347",
    "logo_url": null,
    "activa": true,
    "drive": {
      "drive_url": "https://drive.google.com/drive/folders/FOLDER_ID",
      "folder_id": "FOLDER_ID"
    }
  },
  "facts": {
    "nombre_comercial": "Kintu",
    "web_principal": null,
    "whatsapp_principal": null,
    "puntos_venta": [],
    "proximamente": [],
    "productos_datos": {},
    "frases_prohibidas": [],
    "frases_canon": [],
    "notas": null,
    "updated_at": null
  }
}
```

`folder_id` sale de `drive_url`: `/folders/ID` o `open?id=ID`. Si no hay URL,
`folder_id` es `null`.

### `GET /api/v1/marcas/:slug/facts`

Sigue aceptando `CRON_SECRET` para la Routine (respuesta anterior, con
`metricool_blog_id`, que es un id y no un token). También acepta JWT o
`dst_live_` `owner`, con `marcas_acceso`. Nay usa esta ruta o
`GET /api/v1/marcas/:slug`. No hace falta el secreto de cron en el Mac.

### `PATCH` y `PUT /api/v1/marcas/:slug/facts`

Escribe los campos presentes de `marca_facts`. Los que no vienen se conservan.
Strings vacíos se guardan como `null`. `productos_datos` es un objeto JSON
(reemplaza el objeto entero). Permiso: usuario sin `team_members`, rol
director o admin, o módulo settings. JWT o `dst_live_` `owner`. No acepta
`CRON_SECRET`.

```bash
curl -X PATCH -H "Authorization: Bearer dst_live_…" \
  -H "Content-Type: application/json" \
  -d '{"nombre_comercial":"Kintu","web_principal":"kintu.pe","frases_canon":["Ingresa a kintu.pe"]}' \
  https://distinto-app.vercel.app/api/v1/marcas/kintu/facts
```

Campos: `nombre_comercial`, `web_principal`, `whatsapp_principal`,
`puntos_venta`, `proximamente`, `productos_datos`, `frases_prohibidas`,
`frases_canon`, `notas`.

---

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

## MacOS — resto del sidebar

Los GET de listas del Mac aceptan el JWT de Supabase o `dst_live_…` con alcance `owner`. No aceptan `CRON_SECRET`. Una clave `tareas:read` recibe 403. Contratos en `mac/docs/API-FASE5.md`.

| Método | Ruta | Puerta |
|--------|------|--------|
| GET | `/api/v1/editor` | módulo `editor` |
| GET | `/api/v1/diseno` | módulo `diseno` |
| GET | `/api/v1/historias` | diseño, publicaciones, director o admin |
| GET | `/api/v1/influencers` | módulo `publicaciones` |
| GET | `/api/v1/planes` | solo `pedro@agenciadistinto.com` |
| GET | `/api/v1/dashboard` | director, admin u owner |
| GET | `/api/v1/grilla/:slug` | módulo `grilla` + `marcas_acceso` |
| GET | `/api/v1/habitos` | el miembro de la sesión |
| GET | `/api/v1/actividad` | el día; el director ve al equipo |
| GET | `/api/v1/historial` | director u owner |
| GET | `/api/v1/equipo` | módulo `equipo` (sin contraseñas) |
| GET | `/api/v1/settings` | módulo `settings` (sin tokens ni keys) |

`GET /api/v1/perfil` incluye `modulos` y `marcas_nav` para armar el sidebar. `GET /api/v1/marcas` sigue pidiendo `CRON_SECRET` y no lo usa el Mac.

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

## Versionado

Es `v1`. Si Anthropic / nosotros queremos breaking changes en el futuro,
creamos `v2` paralelo. La idea es que tu Routine consuma `v1` durante
meses sin que se rompa.
