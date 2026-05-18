# Activación desde Shortcuts iOS / Atajos Android

## Concepto

Crear botones en tu celu (en el widget, lockscreen, o pantalla de inicio) que disparan acciones específicas vía webhook.

```
Tap en botón "Revisa TikTok Manrique" del widget
   ↓
Shortcut iOS envía POST a webhook URL
   ↓
Webhook recibe en tu Mac (vía ngrok/tailscale/cloudflare tunnel)
   ↓
Script Python ejecuta la acción
   ↓
Notificación de vuelta al celu cuando termina
```

## Setup (requiere armar primero el endpoint)

### 1. Servidor webhook en tu Mac

Necesitamos un endpoint público que tu celu pueda llamar. Opciones:

**Opción A: Cloudflare Tunnel (gratis, recomendado)**
- Instalar `cloudflared`
- `cloudflared tunnel create distinto`
- Mapear a `localhost:8080` donde corre el server Python
- URL pública estable: `distinto.tudominio.workers.dev`

**Opción B: ngrok**
- Más simple pero URL cambia cada vez
- Plan gratis = URL random, plan pago = URL fija

**Opción C: Tailscale (más seguro pero solo desde tu celu)**
- VPN privada Mac↔Celu
- Tu celu llama a `mac.tail-net.ts.net:8080`

### 2. Server Python en la Mac

`scripts/webhook_server.py`:

```python
from fastapi import FastAPI
import subprocess

app = FastAPI()

@app.post("/distinto/{command}")
async def ejecutar(command: str, payload: dict = None):
    # Validar token simple
    if payload.get("secret") != "tu_secret_aqui":
        return {"error": "unauthorized"}
    
    # Mapeo comando → script
    scripts = {
        "revisa-tiktok-manrique": "scripts/leer_comentarios.py --marca manrique",
        "revisa-tiktok-little-joe": "scripts/leer_comentarios.py --marca little-joe",
        "trends-semana": "scripts/trends_semanal.py",
        "saludos-hoy": "scripts/saludos_fechas.py",
        # ... más
    }
    
    if command not in scripts:
        return {"error": "comando desconocido"}
    
    subprocess.Popen(scripts[command].split())
    return {"status": "ejecutando", "command": command}
```

### 3. Crear Shortcut en iOS

1. Abrir app "Atajos" (Shortcuts)
2. + Nuevo atajo
3. Agregar acción "Get Contents of URL":
   - URL: `https://tu-tunnel.com/distinto/revisa-tiktok-manrique`
   - Method: POST
   - Body: `{"secret": "tu_secret_aqui"}`
4. Nombre: "Revisa TikTok Manrique"
5. Agregar al widget de pantalla de inicio

### 4. Crear shortcuts para los más usados

| Shortcut | Comando webhook |
|---|---|
| 📊 Revisa TikTok Manrique | /distinto/revisa-tiktok-manrique |
| 📊 Revisa TikTok Little Joe | /distinto/revisa-tiktok-little-joe |
| 📊 Trends semana | /distinto/trends-semana |
| 🎂 Saludos hoy | /distinto/saludos-hoy |
| 📈 Reporte estado | /distinto/status |
| ✅ Aprobar último video | /distinto/aprobar-ultimo |

## Comparativa Rubi vs Shortcuts

| Caso | Mejor con |
|---|---|
| Comando rápido único (1 tap) | **Shortcut** |
| Conversación con seguimiento ("¿y cuántos quedan? ¿muéstrame los compliments?") | **Rubi WhatsApp** |
| Aprobar/rechazar con detalle | **Rubi WhatsApp** |
| Tareas predefinidas que NUNCA cambian | **Shortcut** |

## Combinable

Puedes usar las 3 a la vez:
- **Shortcuts** para los 6-8 más frecuentes
- **Rubi WhatsApp** para conversación + tareas ad-hoc
- **Claude app** cuando estás de viaje sin Mac

## Estado
⏳ Requiere armar el webhook server primero (Fase 1 incluye prerequisitos)

Versión: 0.1.0
