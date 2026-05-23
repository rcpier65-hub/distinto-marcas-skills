# WhatsApp Service (interno) — Distinto Agencia

Bot WhatsApp propio basado en [Baileys](https://github.com/WhiskeySockets/Baileys),
deployable en [Koyeb](https://www.koyeb.com) (free tier). Reemplaza el MCP externo
`distinto-mcp.fly.dev` que estaba bajo control de terceros.

## Por qué este servicio existe

El bot anterior (Rubi) estaba hosteado en una cuenta ajena. Cuando la sesión
se caía (P15-T2, P17 sesión `STOPPED`), había que pedir al admin externo que
reiniciara. Este servicio resuelve eso:

- **Mismo repo** que la app Distinto (atomic commits cross-service).
- **Tu cuenta Koyeb** (vos sos el admin, reiniciás cuando quieras).
- **Sesión persistente** en volumen `/data` — sobrevive redeploys.
- **HTTP API simple** con shared secret — la app Vercel lo consume.

## Arquitectura

```
Vercel (app Next.js)
    │  HTTP requests con X-Secret header
    ▼
Koyeb (este servicio)
    │  WebSocket persistente
    ▼
Meta (WhatsApp servers)
```

## Endpoints

Todos requieren header `X-Secret: <WHATSAPP_SHARED_SECRET>` excepto `/healthz` y `/qr`
(`/qr` usa `?key=<secret>` en query string para abrirlo desde browser).

| Método | Path | Body / Query | Respuesta |
|---|---|---|---|
| GET | `/healthz` | — | `{ok, ts}` |
| GET | `/status` | — | `{ok, status, connectedAt, myJid, hasQr}` |
| GET | `/qr?key=<secret>` | — | HTML con QR para escanear (auto-refresh 5s) |
| GET | `/groups` | — | `{ok, groups: [{chatId, nombre, miembros}]}` |
| POST | `/send/image` | `{chatId, imageUrl, caption?, mentions?[]}` | `{ok, messageId}` |
| POST | `/send/text` | `{chatId, text, mentions?[]}` | `{ok, messageId}` |

### Formato de `mentions`

Array de números sin `@`, formato internacional. Ej: `["51983852191", "51902414745"]`.
Para que se renderice como mention clickeable, el caption/text debe contener `@51983852191`
literalmente.

## Deploy a Koyeb (paso a paso)

### 1. Crear cuenta Koyeb

- Andá a https://app.koyeb.com/signup
- Sign up con GitHub (más rápido — conecta el repo automáticamente).
- **No requiere tarjeta de crédito** para free tier.

### 2. Crear secret

- En Koyeb dashboard → **Secrets** → **Create secret**
- Nombre: `whatsapp-shared-secret`
- Value: generá uno con: `openssl rand -hex 32` (ej. `a1b2c3...`)
- **Guardá este valor** — también lo vas a poner en Vercel como `WHATSAPP_SHARED_SECRET`.

### 3. Deploy

- Dashboard → **Create App** → **GitHub** → seleccionar `rcpier65-hub/distinto-marcas-skills`
- En **Build settings**:
  - Builder: **Dockerfile**
  - Dockerfile location: `services/whatsapp/Dockerfile`
  - Build context: `services/whatsapp`
- **Service**:
  - Type: **Web service**
  - Region: **Washington, D.C.** (was) — closest to Lima
  - Instance: **Free** (eco-1, 0.1 vCPU / 512MB RAM)
  - Port: **8000**
- **Volumes**:
  - Add volume → name `auth-data`, mount `/data`, size **1GB**
- **Environment variables**:
  - `NODE_ENV` = `production`
  - `AUTH_DIR` = `/data/auth`
  - `LOG_LEVEL` = `info`
  - `WHATSAPP_SHARED_SECRET` = link to secret `whatsapp-shared-secret`
- Click **Deploy**.

### 4. Escanear QR (primera vez)

- Esperá ~2 min hasta que el deploy quede "Healthy".
- Tu URL será algo como `https://whatsapp-distinto-<random>.koyeb.app`.
- Abrí en browser: `https://whatsapp-distinto-XXXX.koyeb.app/qr?key=<el secret que generaste>`
- Verás un QR. Abrí WhatsApp en tu celular (número 51941397982):
  - **Configuración** → **Dispositivos vinculados** → **Vincular un dispositivo**
  - Escaneá el QR mostrado en el navegador.
- La página se refresca cada 5s. Cuando diga "✅ Bot ya está conectado" listo.

### 5. Verificar grupos

```bash
curl -H "X-Secret: <tu secret>" https://whatsapp-distinto-XXXX.koyeb.app/groups
```

Debe devolver los 4 grupos: Manrique, NovaLamps, New team, Little Joe.

### 6. Configurar la app Distinto

En Vercel → Project `distinto-app` → Settings → Environment Variables, agregar:

- `WHATSAPP_SERVICE_URL` = `https://whatsapp-distinto-XXXX.koyeb.app`
- `WHATSAPP_SHARED_SECRET` = (mismo secret que en Koyeb)
- `WHATSAPP_USE_INTERNAL` = `true` (feature flag — true usa este service, false sigue usando Rubi externo)

Redeploy la app Vercel.

## Dev local

```bash
cd services/whatsapp
npm install
export WHATSAPP_SHARED_SECRET=dev-secret-local
export AUTH_DIR=./auth   # ruta local en vez de /data
npm run dev
```

Abrir http://localhost:8000/qr?key=dev-secret-local para escanear.

## Mantenimiento

### Ver logs

Dashboard Koyeb → tu app → tab **Logs**. Filtros por nivel (info/warn/error).

### Reiniciar (cuando sesión cae)

Dashboard Koyeb → tu app → **Settings** → **Restart**.
Si la sesión seguía válida en `/data`, reconecta sin QR nuevo.

### Logout y re-pairing

Si querés cambiar de cuenta WhatsApp:
1. WhatsApp celular → Dispositivos vinculados → cerrar sesión "Distinto Agency"
2. Borrar volumen `/data` en Koyeb (UI o `koyeb volume delete`)
3. Redeploy
4. Escanear QR nuevo con la nueva cuenta

## Costo

**$0/mes** mientras estés en Koyeb free tier (1 eco-1 instance + 1GB volume).

Si excedés (Baileys consume ~100MB idle, picos a 200MB enviando), Koyeb te avisa
y podés migrar a un plan pago (~$5/mes) o a Oracle Cloud Always Free.
