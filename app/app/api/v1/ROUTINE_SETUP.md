# Cómo crear la Routine de Claude Code

Instrucciones paso a paso para conectar el sistema de comentarios de
Distinto con una Routine programada en Anthropic. **Toma ~10 minutos**.

## Pre-requisitos

- Plan Claude.ai **Pro / Max / Team / Enterprise** con Claude Code on the
  web habilitado
- Acceso al proyecto Vercel `distinto-app` para leer el `CRON_SECRET`
- Conocer el alias del grupo WhatsApp interno (default: `distinto-equipo`)

---

## Paso 1 — Obtener el API token

Vas a Vercel dashboard → `distinto-app` → Settings → Environment Variables
→ buscás `CRON_SECRET` → copiás el valor.

Ese valor va a ir como `DISTINTO_API_TOKEN` en la Routine.

URL directo:
```
https://vercel.com/rcpier65-7045s-projects/distinto-app/settings/environment-variables
```

---

## Paso 2 — Crear un Environment personalizado

Abrí https://claude.ai/code/environments y click **New environment**.

### Configuración del environment

| Campo                  | Valor                                                                  |
|------------------------|------------------------------------------------------------------------|
| **Name**               | `distinto-api`                                                         |
| **Network access**     | `Custom`                                                               |
| **Allowed domains**    | `distinto-app.vercel.app` (uno por línea si agregás más)               |
| **Include default**    | ✅ Sí (mantén los package registries + GitHub para que la routine funcione) |
| **Environment variables** | Agregar **`DISTINTO_API_TOKEN`** con el valor copiado en paso 1     |

Click **Save**.

> ⚠️ **Crítico**: si NO agregás `distinto-app.vercel.app` a Allowed
> domains, la Routine va a fallar con `403 host_not_allowed` en todos
> los curl. Es el error #1 que vamos a tener si saltamos este paso.

---

## Paso 3 — Crear la Routine

Abrí https://claude.ai/code/routines y click **New routine**.

### Configuración

| Campo            | Valor                                                                                                              |
|------------------|--------------------------------------------------------------------------------------------------------------------|
| **Name**         | `Distinto · Sugerencias Comentarios`                                                                               |
| **Model**        | `claude-sonnet-4-5` (Sonnet es suficiente; Opus es overkill y 5× más caro)                                         |
| **Instructions** | Copy-paste el contenido completo de `ROUTINE_PROMPT.md` (el archivo de al lado)                                    |
| **Repository**   | `rcpier65-hub/distinto-marcas-skills` (opcional pero útil — el repo trae el README de la API para que Claude consulte) |
| **Environment**  | Seleccionar `distinto-api` (el que creaste en paso 2)                                                              |

### Trigger

Click **Add trigger** → **Schedule** → **Daily** → seleccionar **08:30**
(hora local Lima). Esto deja 30 min de buffer después del cron diario
de la app a las 08:00.

### Connectors

**Remover todos los conectores MCP** que aparezcan por default. Esta
Routine NO necesita Slack, Notion, Linear, ni ningún MCP — solo usa
`curl` para hablar con tu API REST. Menos surface area = más seguro.

### Permissions

Dejá todo en default. **NO habilites** "Allow unrestricted branch
pushes" — la Routine no debe escribir al repo.

Click **Create**.

---

## Paso 4 — Probar manualmente (recomendado)

Antes de esperar al schedule de mañana 8:30am, probá el flow manual
para detectar errores temprano:

1. En la página de la routine recién creada, click **Run now**
2. Se abre una nueva sesión cloud — mirá en tiempo real qué hace Claude
3. Verificá que:
   - El primer `curl` GET devuelve `ok: true` (no 401 ni 403)
   - Claude redacta respuestas razonables
   - El POST de sugerencias devuelve `updated > 0`
   - El POST de WhatsApp devuelve `ok: true`
4. Después abrí https://distinto-app.vercel.app/comentarios y verificá
   que las sugerencias aparezcan en la columna correspondiente

Si hay errores, los más probables y sus fixes:

| Error                                            | Causa                                            | Fix                                                                                                |
|--------------------------------------------------|--------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `403 host_not_allowed`                           | Dominio no en allowlist del environment          | Editar environment `distinto-api` → agregar `distinto-app.vercel.app`                              |
| `401 unauthorized`                               | Token mal o env var no leída                     | Verificar `DISTINTO_API_TOKEN` en el environment está SETEADO y MATCH con CRON_SECRET de Vercel    |
| `Sin pendientes`                                 | No hay comentarios pending en BD                 | Disparar primero el cron `/api/cron/morning-fetch` para poblar la inbox                            |
| `curl: command not found`                        | Bash tool deshabilitado en environment           | Verificar que el environment NO bloquea Bash tool (default lo permite)                             |

---

## Paso 5 — Wirear el cron de la app (si no está)

El flujo completo es:

```
8:00am Lima → Vercel Cron app /api/cron/morning-fetch
              → fetch Metricool + upsert en BD + WhatsApp notify

8:30am Lima → Anthropic Routine "Distinto · Sugerencias"
              → GET /api/v1/comentarios/pendientes?sin_sugerencia=true
              → genera respuestas con Claude
              → POST /api/v1/comentarios/sugerencia (batch)
              → POST /api/v1/whatsapp/notify (resumen interno)

9:00am+ → Pedro abre /comentarios → revisa + aprueba en UI
```

El cron de la app **ya está configurado en `vercel.json`** del proyecto.
Solo asegurate que las env vars de Vercel tengan:
- `CRON_SECRET` ✅ (ya estaba)
- `METRICOOL_USER_TOKEN` ✅ (ya estaba)
- `WHATSAPP_INTERNAL_GROUP_ALIAS` ← agregar si querés grupo específico

---

## Mantenimiento

### Cambiar el prompt
Editá `ROUTINE_PROMPT.md` en este repo → commit → la próxima vez que
edites la Routine en https://claude.ai/code/routines, copia el contenido
nuevo. No hay sync automático: el prompt vive en Anthropic, no en el repo.

### Rotar el token
Si el `CRON_SECRET` se compromete:
1. Generar uno nuevo en Vercel env vars
2. Editar el environment `distinto-api` en claude.ai → actualizar
   `DISTINTO_API_TOKEN` con el nuevo valor
3. Re-deploy la app de Vercel para que tome el secret nuevo

### Apagar la routine temporalmente
En la página de la routine, toggle del schedule → **Paused**. La
Routine conserva su config pero no dispara hasta que la re-actives.

### Cambiar la hora
Editar la routine → Schedule trigger → cambiar la hora. Está en zona
horaria local de tu cuenta.

---

## Logs y observabilidad

- **Logs de la Routine**: cada run aparece como una sesión en
  https://claude.ai/code/sessions — click en una para ver el transcript
  completo (curl outputs incluidos)
- **Logs del cron Vercel**: https://vercel.com/rcpier65-7045s-projects/distinto-app/logs
  filtrar por path `/api/cron/morning-fetch` o `/api/v1/`
- **Estado de BD**: query en Supabase
  ```sql
  SELECT marca_id, status, COUNT(*)
  FROM comentarios_inbox
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY marca_id, status;
  ```

---

## Próximos pasos opcionales

- **Auto-aprobar los "fáciles"**: editar el prompt para que la Routine
  también llame `POST /api/v1/comentarios/aprobar` (endpoint nuevo) en
  casos donde `categoria=reaccion` o `testimonial corto`. Más complejo
  pero te libera de aprobar manualmente cada gracias.
- **Multi-frecuencia**: agregar segundo trigger schedule a las 14:00
  para procesar comentarios de la tarde. Mismo prompt, misma Routine.
- **Métricas de costo**: la respuesta del endpoint sugerencia acepta
  `metadata: { tokens_in, tokens_out, modelo }` — la Routine puede
  pasarlos para que vos veas el costo exacto por día en BD.
