# metricool-pro-mcp

MCP server enriquecido para Metricool, construido para **Distinto Agencia**.

Complementa al MCP oficial `metricool` (analytics + reads) agregando **27 tools** de alto nivel para **publicar** (todas las redes), **manejar el inbox** (mensajes, comentarios, reviews) y **listar/buscar/eliminar** publicaciones.

---

## Por qué existe

El MCP oficial de Metricool (`mcp-metricool` en PyPI):

| Capacidad | MCP oficial | `metricool-pro` |
|-----------|:-----------:|:---------------:|
| Analytics, métricas, brands | ✅ | (delegado al oficial) |
| Programar posts | ⚠️ Tool genérica difícil | ✅ Tools específicas por tipo |
| Stories de Instagram | ⚠️ Funciona pero requiere formato exacto | ✅ Tool dedicada |
| Carrusel | ❌ | ✅ |
| Reels | ⚠️ Funciona | ✅ Tool dedicada con cover/firstComment |
| **Inbox / responder mensajes** | ❌ No expuesto | ✅ 9 tools |
| **Responder comentarios** | ❌ | ✅ |
| **Responder reviews** | ❌ | ✅ |
| Auto-normalizar URLs de Drive | ❌ | ✅ Cualquier formato `/view`, `/uc?id`, etc. |

Los dos MCPs **conviven sin pisarse** — usas cada uno para lo que es mejor.

---

## Las 27 tools por grupo

### 📥 Inbox (9) — la base de tu automatización diaria

| Tool | Para qué |
|------|----------|
| `inbox_resumen_pendientes` | Conteo rápido de mensajes/comentarios/reviews sin atender. **Usa esto como trigger de tareas programadas**. |
| `inbox_listar_conversaciones` | DMs de IG/FB/etc — opción `only_unread=True`. |
| `inbox_obtener_mensajes` | Historial de una conversación. **Llama esto SIEMPRE antes de responder**. |
| `inbox_enviar_mensaje` | Responde o inicia conversación. Acepta `attachment_url`. |
| `inbox_listar_comentarios` | Comentarios en tus publicaciones (no DMs). |
| `inbox_responder_comentario` | Responde a un comentario. |
| `inbox_eliminar_comentario` | Oculta un comentario (úsalo con cuidado). |
| `inbox_listar_reviews` | Reseñas de FB / Google Business. |
| `inbox_responder_review` | Responde reseña. |
| `inbox_marcar_leido` | Marca conversación/comentario como leído. |

### 📤 Publicar (8 tools cubriendo redes + tipos)

| Tool | Caso de uso |
|------|-------------|
| `publicar_instagram_story` | 1 story (imagen o video). |
| `publicar_secuencia_stories` | **HOOK → DESARROLLO → CIERRE** en secuencia con spacing. |
| `publicar_instagram_post` | Feed post con caption + first_comment. |
| `publicar_instagram_carrusel` | 2-10 imágenes en carrusel. |
| `publicar_instagram_reel` | Video reel con cover/show_on_feed. |
| `publicar_facebook_post` | Feed FB (acepta solo-texto). |
| `publicar_facebook_story` | Story FB (24h). |
| `publicar_tiktok_video` | Video TikTok con música opcional de librería. |
| `publicar_multiplataforma` | Mismo contenido a varias redes a la vez. |

### 📊 Listar / Buscar (4)

| Tool | Devuelve |
|------|----------|
| `listar_publicaciones_programadas` | Calendario futuro (default 30 días). |
| `listar_publicaciones_publicadas` | Historial pasado (default 7 días). |
| `obtener_publicacion` | Detalle por ID, incluye status PUBLISHED/PENDING/ERROR. |
| `mejor_hora_publicar` | Sugerencia basada en tus analytics. |

### 🔧 Editar / Eliminar (2)

- `eliminar_publicacion` — DELETE por ID.
- `actualizar_publicacion` — PATCH con dict de cambios.

### 🏢 Marcas (2)

- `listar_marcas` — todas con blog_id, networks, timezone.
- `buscar_marca_por_nombre` — fuzzy match por label ("muebles lozano" → blog_id 6206541).

### ⚡ Multi-red (1)

- `publicar_multiplataforma` — un solo body a múltiples networks.

---

## Setup

Ya está registrado en:
- **Claude Code:** `~/.claude.json` (user scope)
- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Para verificar:
```bash
claude mcp list | grep metricool-pro
```

Variables de entorno requeridas (ya configuradas):
- `METRICOOL_USER_TOKEN`
- `METRICOOL_USER_ID`

---

## Cheatsheet para tareas programadas (Pedro)

### Tarea daily: responder mensajes pendientes

Prompt para usar en `/schedule`:

```
Cada día a las 9:00 AM (Lima):

1. Para cada una de mis marcas (usa listar_marcas para obtenerlas):
   a. Llama inbox_resumen_pendientes(blog_id)
   b. Si hay mensajes_sin_leer > 0:
      - Llama inbox_listar_conversaciones(blog_id, network, only_unread=True)
      - Para cada conversación: inbox_obtener_mensajes(...) para entender contexto
      - Redacta respuesta acorde al tono de la marca
      - PIDE MI APROBACIÓN antes de inbox_enviar_mensaje
   c. Si hay comentarios_sin_responder > 0:
      - Similar flujo con inbox_listar_comentarios + inbox_responder_comentario
   d. Si hay reviews pendientes:
      - inbox_listar_reviews + responder (estos requieren tono extra cuidadoso)

2. Al final, mándame un resumen Slack/email con:
   - Qué respondí (con preview del texto)
   - Qué dejé pendiente y por qué
```

### Tarea: publicar la secuencia de stories del día

```
Mi calendario tiene 3 fotos para Muebles Lozano IG stories.
Drive folder: <URL>

1. listar_marcas → encuentra Muebles Lozano SAC
2. publicar_secuencia_stories(blog_id=6206541, media_urls=[
     "https://drive.google.com/file/d/HOOK_ID/view",
     "https://drive.google.com/file/d/DESARROLLO_ID/view",
     "https://drive.google.com/file/d/CIERRE_ID/view"
   ])
3. Verifica con obtener_publicacion en 5 min que status=PUBLISHED
```

---

## Ejemplos de payload

### Story de IG (lo más usado)

```python
publicar_instagram_story(
    blog_id=6206541,
    media_url="https://drive.google.com/file/d/10Pl7qlOu13teBEI4384YAo1nyVtH-7kp/view",
    minutes_from_now=3  # publica en 3 min
)
```

URLs de Drive con `/view`, `/uc?id=`, o `usercontent.google.com/download` son **auto-normalizadas** al formato directo `lh3.googleusercontent.com/d/ID=w1080`. No tienes que transformar manualmente.

### Responder un DM

```python
# 1. Listar pendientes
convs = inbox_listar_conversaciones(blog_id=6206541, network="instagram", only_unread=True)

# 2. Para cada conversación, leer el contexto
mensajes = inbox_obtener_mensajes(blog_id=6206541, network="instagram", conversation_id="...")

# 3. Responder (después de confirmación humana)
inbox_enviar_mensaje(
    blog_id=6206541,
    network="instagram",
    conversation_id="...",
    text="¡Hola! Gracias por escribirnos. ..."
)
```

---

## Mantenimiento

Si Metricool actualiza su API y algo se rompe:

1. Re-descarga el swagger:
   ```bash
   curl -o /tmp/mc-swagger.json https://app.metricool.com/api/swagger.json
   ```
2. Inspecciona el schema cambiado.
3. Ajusta `_build_post_body` o la tool específica en `server.py`.
4. Reinicia Claude Code/Desktop para reload del MCP.

El archivo `server.py` es deliberadamente **un solo archivo** (~600 LOC) para que sea fácil de mantener y leer entero.

---

## Estructura del proyecto

```
metricool-pro-mcp/
├── pyproject.toml      # Deps: mcp, httpx
├── server.py           # Todas las tools (27)
├── README.md           # Este archivo
├── .gitignore
├── .env.example        # Template de env vars (sin secretos)
└── .venv/              # Virtual env (gitignored)
```

---

## Bugs conocidos / limitaciones del API

- **Música de librería oficial de IG**: Meta NO la expone para terceros. Solo posible desde app móvil nativa.
- **Schedule "ahora exacto"**: el API requiere mínimo +1 minuto en el futuro. Defaults a +3 min para seguridad.
- **Drive URLs `/view`**: tienen redirect 303 que Metricool no sigue. Auto-convertimos a formato `lh3` directo.
- **Tools sin docs**: el campo `instagramData.audioName` existe en el swagger pero es solo metadata; IG lo ignora.
