# Distinto MCP

Servidor MCP (Model Context Protocol) que conecta **Claude Desktop** o **Claude Code** con el sistema de [Distinto Agencia](https://distinto-app.vercel.app).

Permite que Claude pueda consultar marcas, publicaciones, grabaciones, comentarios, tareas de diseño y crear pendientes rápidos directamente desde cualquier conversación, sin que tengas que abrir la app.

---

## ¿Qué tools expone?

| Tool | Qué hace |
|---|---|
| `list_marcas` | Lista todas las marcas activas (Manrique, TypHouse, Kintu, Lozano…) |
| `list_publicaciones_semana` | Pubs de la semana actual (opcionalmente filtrado por marca) |
| `list_publicaciones_mes` | Pubs del mes (filtrable por marca y estado) |
| `list_grabaciones_proximas` | Grabaciones planeadas a futuro con hora en AM/PM |
| `list_comentarios_pendientes` | Inbox de comentarios por responder |
| `list_tareas_diseno` | Tareas en diseño activas con sub-estado y motivo de pausa |
| `list_pendientes_rapidos` | Tus pendientes del chat de Inicio |
| `crear_pendiente_rapido` | Crea un pendiente con IA categorizándolo automáticamente |
| `generar_reporte_dia` | Reporte del día (avances + tareas + comentarios + hábitos) |
| `get_marca_facts` | Ficha de la marca (voz, audiencia, contactos, KPIs) |

---

## Instalación

### 1. Compilar el paquete

```bash
cd mcp-distinto
npm install
npm run build
```

Esto genera `dist/index.js` que es el binario MCP.

### 2. Configurar Claude Desktop

Editá `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "distinto": {
      "command": "node",
      "args": [
        "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/mcp-distinto/dist/index.js"
      ],
      "env": {
        "DISTINTO_API_TOKEN": "<tu CRON_SECRET de Vercel>",
        "DISTINTO_BASE_URL": "https://distinto-app.vercel.app"
      }
    }
  }
}
```

> El `DISTINTO_API_TOKEN` es el mismo `CRON_SECRET` que tenés en Vercel env vars.
> Lo encontrás en `vercel.com/rcpier65/distinto-app/settings/environment-variables`.

### 3. Reiniciar Claude Desktop

Salí completamente (⌘Q) y abrilo de nuevo. En el menú **🔧 Settings → Developer → MCP** debería aparecer `distinto` como **Connected**.

### 4. Probar

En cualquier conversación con Claude, escribí:

> *"Lista las marcas activas de Distinto"*

Claude llamará a `list_marcas` y devolverá la lista.

---

## Ejemplos de uso

**Mañana de lunes**:
> *"Generame el reporte del día de ayer"*
> → Claude llama a `generar_reporte_dia` (es del día actual, pero útil de ejemplo)

**Antes de una reunión con Manrique**:
> *"Mostrame las publicaciones de Manrique de esta semana y dame los facts de la marca"*
> → Claude combina `list_publicaciones_semana(marca='manrique')` + `get_marca_facts(marca='manrique')`

**Anotación rápida**:
> *"Anotame: tengo que llamar a Cristal de Little Joe el viernes para confirmar grabación"*
> → Claude llama a `crear_pendiente_rapido(texto=...)`. La IA categoriza como **Comunicación** prioridad 2.

**Coordinación grabaciones**:
> *"¿Qué grabaciones tengo esta semana?"*
> → `list_grabaciones_proximas(limit=10)` con horas en AM/PM listas para copiar al equipo.

---

## Modo dev (sin compilar)

Si querés iterar sin compilar cada vez:

```json
{
  "mcpServers": {
    "distinto": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/mcp-distinto/src/index.ts"
      ],
      "env": {
        "DISTINTO_API_TOKEN": "...",
        "DISTINTO_BASE_URL": "https://distinto-app.vercel.app"
      }
    }
  }
}
```

---

## Troubleshooting

**Claude dice "Tool unavailable"**:
- Verificá que `DISTINTO_API_TOKEN` esté seteado y coincida con el `CRON_SECRET` de Vercel.
- Reiniciá Claude Desktop completo (no solo cerrar la ventana).

**Respuesta 401 al llamar a una tool**:
- El token es incorrecto. Andá a Vercel → env vars → copiá `CRON_SECRET`.

**Respuesta 500**:
- La query a Supabase falló. Mirá los logs de Vercel para el endpoint específico (`/api/v1/...`).

---

## Desarrollo local

```bash
# Build watch
npm install
npx tsc --watch

# Probar el server stdio manualmente (sin Claude)
DISTINTO_API_TOKEN=xxx DISTINTO_BASE_URL=http://localhost:3000 npm start
```

Para probar tools manualmente, enviá JSON-RPC requests por stdin del proceso.
