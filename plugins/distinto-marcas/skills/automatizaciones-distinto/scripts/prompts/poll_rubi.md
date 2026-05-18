EJECUTA AHORA, en este orden, sin pedir confirmación. NO comentes el sistema, NO describas lo que vas a hacer — solo ACTÚA.

# Paso 1 — Lee eventos recientes de Rubi

Llamá la tool: `mcp__rubi__whatsapp_get_recent_events`
- Parametros: `event_type="message"`, `limit=20`

Si la tool no existe o falla, terminá imprimiendo `ERROR: rubi MCP no disponible` y stop.

# Paso 2 — Filtrá los relevantes

De los eventos devueltos:
- Quedate SOLO los que tienen `from` con número `51983852191` (Pedro). Cualquier otro número → ignorá.
- Quedate SOLO los que tienen `body` (texto del mensaje) que empieza con `>>` o `/distinto` (después de quitar espacios al inicio).

Si no queda ningún mensaje válido, imprimí `procesados: 0 | sin novedad` y stop.

# Paso 3 — Verificá idempotencia

Leé el archivo `~/.distinto/rubi_procesados.json` con la tool Read.
Si no existe, asumí lista vacía `[]`.

Es una lista de objetos `{"message_id": "...", "ts": "iso8601"}`.

Filtrá la lista del paso 2 para quitar los `message_id` que ya están procesados.

Si ya no queda ningún mensaje nuevo → imprimí `procesados: 0 | todo ya procesado` y stop.

# Paso 4 — Procesá cada comando nuevo

Para CADA mensaje válido restante:

## 4a. Parseá el comando

Quitá el prefijo `>>` o `/distinto` y espacios. Lo que queda es el comando.

Matcheá contra esta tabla (case insensitive, busca el patrón en el texto):

| Patrón en el texto | Acción canónica | Necesita marca |
|---|---|---|
| `revisa tiktok` o `revisa comentarios` | `revisar-tiktok` | sí |
| `ya respondi tiktok` o `ya termine tiktok` o `ya cerre tiktok` | `cerrar-tiktok` | sí |
| `haz la grilla` o `grilla semanal` o `grilla de` | `grilla` | sí |
| `aviso publicacion` | `aviso-publicacion` | sí + link |
| `trends` o `trends semana` | `trends-semana` | sí |
| `saludos hoy` o `saludos de hoy` | `saludos-hoy` | no |
| `pendientes` | `pendientes` | no |
| `status` | `status` | no |
| `resumen del dia` o `resumen dia` | `resumen-dia` | no |
| `help` o `ayuda` | `help` | no |

Marcas válidas (con aliases): manrique | little joe (alias: joe, lj) | lozano | distribuidora fitness (alias: fitness, df) | kintu | novalamps (alias: nova) | la victoria (alias: victoria, lv)

Si la acción necesita marca pero no la detectás → respondé a Pedro pidiendo aclaración y NO ejecutes nada.

## 4b. Ejecutá la acción

- **`status`**: Respondé a Pedro: "✅ Listener activo. Última poll: ahora. Sin tareas en curso." Si hay alguna tarea en `~/.distinto/tareas_activas.json`, listala.
- **`help`**: Respondé con la tabla de comandos disponibles (versión corta).
- **`pendientes`**: Respondé con la lista de tareas que esperan OK de Pedro (de `~/.distinto/pendientes.json`, si no existe → "Sin pendientes").
- **`revisar-tiktok <marca>`**: Por ahora solo respondé: "🔧 Acción `revisar-tiktok` para [marca] aún no conectada. Próximamente."
- **`cerrar-tiktok <marca>`**: Idem mensaje placeholder.
- **`grilla <marca>`**: Idem placeholder.
- **`aviso-publicacion <marca> <link>`**: ANTES de mandar al grupo del cliente, respondé SOLO A PEDRO: "⚠️ Confirmás envío al grupo de [marca] con link [link]? Respondé sí o no." NO mandes al cliente hasta nuevo polling con respuesta "sí".
- Cualquier otra acción: respondé "❓ No reconozco ese comando. Mandá `>> help` para ver opciones."

## 4c. Respondé a Pedro

Mandá DM a Pedro usando `mcp__rubi__whatsapp_send_to_phone`:
- `phone="51983852191"` (sin +, formato internacional)
- `text=` (la respuesta de la acción)

# Paso 5 — Marcá como procesado

Agregá los `message_id` procesados al archivo `~/.distinto/rubi_procesados.json`. Usá la tool Write para sobreescribirlo con la lista actualizada. Quitá entradas de más de 24h.

Formato: `[{"message_id": "ABC123", "ts": "2026-05-17T22:30:00"}, ...]`

# Paso 6 — Output final

Imprimí en stdout UNA SOLA línea con este formato:

```
procesados: N | comandos: <lista>
```

Ejemplo:
```
procesados: 2 | comandos: status, revisar-tiktok-manrique
```

Si no hubo nada:
```
procesados: 0 | sin novedad
```

# Reglas duras

1. **Solo procesá mensajes de 51983852191** — cualquier otro número → ignorá silenciosamente.
2. **NUNCA mandes mensajes al grupo del cliente** sin OK explícito de Pedro en este mismo polling.
3. **NUNCA reproceses un `message_id`** ya en la lista.
4. **NO conversés**. Sos un listener silencioso. Una respuesta corta a Pedro y terminás.
5. **Sé conciso en stdout**. Solo la línea de resumen del paso 6.
