# Fase 2 — Flujo video completo (A.1 a A.8)

> Pipeline end-to-end de producción de video: detección del archivo → aprobación interna → mensaje al cliente → detección de aprobación → programación Metricool → publicación → aviso al cliente.

## Diagrama del flujo

```
Pierre sube video a Drive
   ↓ (cron detecta archivo nuevo cada 10 min)
[A.1] Preview al grupo interno
   ↓ Pedro/equipo dice "mandar a aprobación"
[A.2] Mensaje al grupo del cliente con preview + copy + fecha tentativa
   ↓ (Rubi escucha respuestas cliente)
[A.3] Cliente dice "aprobado / ok / va"   [A.4] Cliente dice "cambiar X, Y"
   ↓                                            ↓
   Card Notion → Programar                     Card Notion → Ajustes
   ↓                                            ↓
[A.6] Metricool programa post                  Aviso a Pierre con comentario
   ↓
[A.7] Post se publica
   ↓
   Card Notion → Publicado
   Métricas iniciales (alcance, likes, comments) en Notion
   ↓
[A.8] Aviso al cliente "se publicó tu post" + link
```

## A.5 — Recordatorio si cliente no responde
Si Card está en "Aprobación" y han pasado >X horas (config por marca, default 24h):
- Mensaje cordial al grupo cliente: "Hola [tratamiento] [nombre], te dejo el video por aquí 🌿 ¿lo viste? Quedo atento."
- Requiere OK previo de Pedro.

## Componentes técnicos

### Detección archivo nuevo en Drive
```python
# scripts/detector_videos.py — cron cada 10 min
# Para cada marca activa:
#   files = drive_mcp.search_files(parentId=carpeta_videos_mes)
#   nuevos = files filtrar por modifiedTime > last_check
#   para cada nuevo:
#       crear card en Notion (estado "Aprobación interna")
#       avisar al grupo interno con preview + link
```

### Detección respuestas cliente
```python
# scripts/detector_aprobaciones.py — cron cada 5 min
# events = rubi.whatsapp_get_recent_events(event_type="message")
# para cada mensaje en grupo cliente:
#   if mensaje.contiene("aprobado", "ok", "va", "sí", "perfecto", "👍"):
#       → marcar card como Aprobado
#   elif mensaje.contiene cambios pedidos:
#       → marcar como Ajustes + extraer comentario textual
#       → avisar a Pierre
```

### Setup Metricool
- Ya tenemos Metricool MCP conectado
- Usa `post_schedule_post` con (marca, copy, hashtags, hora, plataformas)
- Hora viene de la card Notion campo "Fecha programada"

## Requisitos previos antes de armar
- Schema exacto de Notion para Grilla por marca
- Carpeta exacta de videos por marca en Drive (validar que sigue `/CUENTAS/{marca}/VIDEOS/{mes}/`)
- Grupos WhatsApp del cliente con chatIds confirmados (faltan 5 de 7)

## Estado
⏳ Pendiente — empezar después de Fase 1

Versión: 0.1.0
