# Activación vía Rubi WhatsApp

> Cómo Pedro activa automatizaciones desde su celular hablándole a Rubi por WhatsApp. Rubi es el MCP de WhatsApp ya conectado (`mcp__1a1b3384-1b85-4bee-96da-aed9167ef41d__whatsapp_*`).

## 🎯 Arquitectura del flujo

```
Pedro (celular)
   ↓
   WhatsApp → mensaje a Rubi (sin envío al cliente, es chat interno)
   ↓
Rubi escucha eventos (mcp__1a1b3384...__whatsapp_get_recent_events)
   ↓
Claude desktop (Mac, sesión persistente o Cron poll cada 60s)
   ↓
   Detecta mensaje de Pedro (filtrado por su número 51983852191)
   ↓
   Ejecuta la acción correspondiente (script Python local + MCPs)
   ↓
   Reporta resultado a Pedro vía Rubi (chat directo o grupo interno)
```

## 📞 Cómo Rubi escucha tus mensajes

Rubi ya guarda en buffer todos los eventos WhatsApp recibidos. Para que Claude desktop "escuche", necesita:

1. **Una sesión Claude activa en la Mac** (puede ser Claude desktop abierto, o un Cron que pollea)
2. **Filtrar por tu número** (`51983852191` es Pedro Reyes Calderon) o tu chatId DM
3. **Reconocer comandos** con un prefijo claro (ej: `/distinto`, `Rubi:`, `>>`)

## 💬 Sintaxis de comandos para Pedro

Convención: empezar con `>>` o `/distinto` para que Rubi/Claude sepa que es un comando, no chat casual.

### Triggers de Skill `responder-tiktok`

```
>> revisa tiktok manrique
>> revisa comentarios little joe
>> ya respondi tiktok manrique
>> ya termine con tiktok little joe
```

### Triggers de Skill `grilla-semanal`

```
>> haz la grilla manrique
>> grilla semanal de lozano
```

### Triggers de Fase 1 (en armado)

```
>> aviso publicacion manrique <link-del-post>
>> genera copies grilla little joe
>> trends de la semana kintu
>> saludos de hoy
```

### Triggers de Fase 2 (futuro)

```
>> aprobar video lozano (último subido)
>> rechazar video manrique <razón>
>> publicar video kintu ahora
```

### Triggers utilitarios

```
>> status              # qué tareas están corriendo
>> pendientes          # qué necesita mi aprobación
>> resumen del dia     # qué se hizo hoy
>> help                # lista de comandos
```

## 🔧 Setup técnico (YA ARMADO ✅)

### Arquitectura real

Como Rubi MCP solo es invocable desde dentro de una sesión Claude (no desde scripts Python), el listener funciona así:

```
launchd (cada 60s)
   ↓
scripts/escuchar_rubi.py (wrapper Python)
   ↓
spawn `claude --print --dangerously-skip-permissions`
   ↓
sesión Claude efímera ejecuta prompts/poll_rubi.md:
   - llama whatsapp_get_recent_events
   - filtra por Pedro + prefijo >>
   - parsea con router_comandos.py
   - ejecuta acción correspondiente
   - responde a Pedro vía Rubi
   ↓
logs en ~/.distinto/rubi.log
```

### Archivos del sistema

```
scripts/
├── escuchar_rubi.py             # wrapper que invoca claude CLI cada minuto
├── router_comandos.py           # parser determinístico (tabla canónica)
├── test_escuchar.sh             # validación manual antes de instalar
├── com.distinto.escuchar-rubi.plist  # launchd config
└── prompts/
    └── poll_rubi.md             # "código en lenguaje natural" para Claude
```

### Pasos de instalación

```bash
cd "/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills/skills/automatizaciones-distinto/scripts"

# 1. Probar el parser (instantáneo, no toca Rubi)
./test_escuchar.sh parser

# 2. Probar 1 polling real (invoca Claude CLI ~30-60s)
./test_escuchar.sh once

# 3. Si todo OK, instalar el launchd
cp com.distinto.escuchar-rubi.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.distinto.escuchar-rubi.plist

# 4. Verificar que está corriendo
launchctl list | grep distinto

# 5. Pedro hace prueba desde el celu:
#    Por WhatsApp a Rubi: ">> status"
#    Debería responder en ~60-90 segundos

# 6. Para parar el listener:
launchctl unload ~/Library/LaunchAgents/com.distinto.escuchar-rubi.plist
```

### Carpetas de estado

```
~/.distinto/
├── rubi.log                  # log principal con timestamps
├── rubi.lock                 # lock para evitar 2 polls simultáneos
├── rubi_last_poll.txt        # última vez que corrió
├── rubi_procesados.json      # message_ids ya procesados (24h)
├── rubi_err_<ts>.log         # errores guardados aparte
├── launchd_out.log           # stdout del launchd
└── launchd_err.log           # stderr del launchd
```

### Alternativa futura — Webhook reactivo

Si en algún momento queremos respuestas instantáneas (<2s en vez de hasta 60s), se puede pasar a webhook con Cloudflare Tunnel + FastAPI. Documentado en `shortcuts-ios.md`. Por ahora, polling cada minuto es más que suficiente.

## 🛡️ Reglas de seguridad

1. **Solo el número de Pedro puede emitir comandos**. Otros números → ignorar.
2. **Comandos que tocan al cliente requieren confirmación**. Ej: `>> aviso publicacion manrique` → Rubi pregunta "¿Confirmas que mando al grupo? Responde sí/no" antes de actuar.
3. **Idempotencia en comandos repetidos**. Si Pedro manda `>> revisa tiktok manrique` 2 veces seguidas, no re-ejecutar; responder "Ya estoy en ello desde hace X min".
4. **Logs en `~/distinto-rubi.log`** con timestamp + comando + acción + resultado para auditoría.
5. **Wallclock prudente**: si Pedro manda comandos entre 0am-6am, confirmar 2 veces antes de tocar al cliente.

## 📝 Plantillas de respuesta de Rubi a Pedro

```
✅ Listo, [acción ejecutada]
   [detalles]
   [link si aplica]

⚠️ Pendiente tu OK:
   [acción que requiere aprobación]
   Responde "sí" o "no"

❌ No pude ejecutar:
   [razón técnica]
   ¿Quieres que reintente o veas alternativas?
```

## 🎯 Casos de uso reales

### Caso 1: Pedro va manejando, recibe notif del cliente "ya aprobé el video"

```
1. Cliente: "ya aprobé el video, está perfecto"
2. Pedro (desde el auto, semáforo): "Rubi, aprobar video lozano cliente"
3. Rubi: "✅ Aprobado. Pasando card Notion a 'Programar' + sincronizando con Metricool"
4. (30 segundos después) Rubi: "✅ Programado en Metricool para mañana 6pm"
```

### Caso 2: Pedro despierta, quiere ver pendientes

```
1. Pedro: ">> pendientes"
2. Rubi: 
   "🔵 3 cosas necesitan tu OK:
    1. Aviso publicación Little Joe (post de 8am)
    2. Saludo cumpleaños fundador Manrique (Dr. Gustavo cumple hoy)
    3. Follow-up @influencer_x (lleva 7 días sin responder)
    
    Responde con número(s) para aprobar."
3. Pedro: "1, 2"
4. Rubi: "Procesando 1 y 2..." (después) "✅ Aviso Little Joe enviado al grupo. ✅ Saludo Dr. Gustavo enviado."
```

### Caso 3: Pedro en reunión, le piden trends

```
1. Pedro: ">> trends de la semana kintu"
2. Rubi: "Buscando trends Kintu... (esto toma ~2 min)"
3. (2 min después) Rubi: "✅ Top 5 trends Kintu esta semana:
   1. #aceiteesencial — +40% últimos 7d
   2. #wellness — trending
   3. ...
   Detalle completo en Notion → [link]"
```

## ⏳ Estado actual

- ✅ Rubi MCP conectado y funcionando
- ✅ Comando `whatsapp_send_with_mentions` validado
- ✅ Comando `whatsapp_get_recent_events` disponible
- ✅ Script `escuchar_rubi.py` creado (wrapper de claude CLI headless)
- ✅ `router_comandos.py` con 7/7 tests pasando
- ✅ Plist launchd `com.distinto.escuchar-rubi.plist` listo
- ✅ Prompt template `prompts/poll_rubi.md` listo
- 🟡 Pedro debe correr `./test_escuchar.sh once` para validar end-to-end
- 🟡 Pedro debe `launchctl load` el plist cuando esté satisfecho
- ⏳ Sub-skills que el listener invoca (revisar-tiktok, grilla, etc.) requieren cada una su propia validación

---

## 🚀 Siguiente paso

1. ✅ Crear `scripts/escuchar_rubi.py` (loop de polling cada 60s)
2. ✅ Crear `scripts/router_comandos.py` (mapeo comando → acción)
3. 🟡 **TU TURNO**: correr `./test_escuchar.sh once` para validar
4. 🟡 Si OK: instalar plist con `launchctl load`
5. 🟡 Pedro hace prueba mandando `>> status` desde su celu
6. 🟡 Validar que responde en <2 minutos
7. ⏳ Iterar con casos reales y refinar el prompt

Versión: 0.2.0 · Última actualización: 17 mayo 2026
