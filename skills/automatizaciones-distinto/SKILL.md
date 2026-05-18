---
name: automatizaciones-distinto
description: Roadmap y workflows automatizados de Agencia Distinto — producción de video, copies, trends, reportes, comunidad, influencers, competidores, edición de fotos. Activable desde Claude desktop, Claude app móvil, o WhatsApp vía Rubi. Activar cuando el usuario diga "automatiza X", "programa la tarea X", "activa el flujo X de la marca Y", "configura la automatización X", o pida revisar el roadmap de automatizaciones de la agencia.
---

# Automatizaciones Agencia Distinto

Sistema central de workflows automatizados para los 9 clientes de Agencia Distinto. Aproveha los MCPs ya conectados (Drive, Notion, Metricool, Rubi WhatsApp, Chrome) + Patchright para tareas que requieren navegador real + Cron para tareas programadas.

## 🎯 Filosofía operativa

1. **Pedro aprueba antes de tocar al cliente**: cualquier mensaje al WhatsApp del cliente, cualquier post publicado, cualquier reporte enviado — requiere OK explícito de Pedro en el chat. NUNCA acciones unilaterales hacia el cliente.
2. **Automatizaciones internas full-auto**: detectar archivos nuevos en Drive, generar copies, scrapear trends, monitorear competencia, generar reportes — todo eso se puede correr sin intervención.
3. **Activación desde donde sea**: Pedro puede activar tareas desde:
   - Claude desktop (Mac)
   - Claude app móvil (iOS/Android)
   - WhatsApp → Rubi (conversacional desde celu)
   - Cron jobs (programadas)
4. **Tu Mac es el "cerebro"**: scripts Python locales, Drive Desktop sync, Chrome MCP, Patchright. No requiere servidor en cloud para empezar.

---

## 🗺️ Roadmap completo (A → G)

> Lista canónica de automatizaciones, organizada por categoría. Estado actualizado en cada fase.

### A. Flujo de video: producción → aprobación → publicación

1. **A.1** — Detectar video nuevo en `/CUENTAS/{marca}/VIDEOS/{mes}/` → preview al grupo interno
2. **A.2** — "Mandar a aprobación" en 1 click → mensaje al grupo del cliente
3. **A.3** — Detectar aprobación cliente ("aprobado/ok/va") → card Notion pasa a Programar
4. **A.4** — Detectar pedido de cambios → marcar Ajustes + avisar a Pierre
5. **A.5** — Recordatorio si el cliente no responde en X horas
6. **A.6** — Sincronización Metricool al pasar a Programar
7. **A.7** — Publicación → card a Publicado + primeras métricas
8. **A.8** — Aviso al cliente cuando se publicó (con link directo)

### B. Copies y Notion

1. **B.1** — Generar copy on-brand cuando Lorena suba videos a Grilla Fit
2. **B.2** — Marcar casilla "Copy Listo" automáticamente
3. **B.3** — Aviso vía Rubi al grupo interno: "Copies de {marca} listos para revisar"

### C. Guiones y scripts

1. **C.1** — Búsqueda automática de trends Instagram + TikTok por categoría de marca (periódica)
2. **C.2** — Referencias (links reels/TikToks) listos en Notion
3. **C.3** — Lista de hooks para próximos videos
4. **C.4** — Sugerir temas no tratados por marca

### D. Gestión de clientes

1. **D.1** — Reporte semanal/mensual por marca (Metricool MCP)
2. **D.2** — Aviso al cliente cuando se publica algo (link directo)
3. **D.3** — Saludos automáticos por fechas relevantes (cumpleaños fundador, aniversario marca, fechas comerciales)

### E. Comercial / Comunidad / Influencers

1. **E.1** — Responder comentarios todas marcas (semi-auto IG/FB; TikTok limitado a borradores)
2. **E.2** — Follow-up a influencers no respondieron en 7 días
3. **E.3** — Agenda visitas showroom (Calendar + recordatorio 24h antes)
4. **E.4** — Búsqueda mensual de nuevos influencers por marca

### F. Competidores

1. **F.1** — Lista actualizada de competidores por marca
2. **F.2** — Monitoreo periódico (publicaciones, formatos, campañas) + resumen

### G. Edición de fotos de portada

1. **G.1** — Editar fotos automáticamente al cargar links en Notion (formato/recorte/retoque por plantilla)
2. **G.2** — Guardar en carpeta correspondiente del Drive
3. **G.3** — Pegar enlace de la foto editada en el campo de Notion

---

## 📅 Plan de fases (priorizado por ROI)

### 🚀 FASE 1 — Quick wins (esta semana)

Documentación detallada: `fases/fase-1-quick-wins.md`

- **D.2 + A.8** — Aviso publicación al cliente (con tu OK previo)
- **B.1-3** — Copies automáticos para grilla Notion
- **C.1** — Trends semanales por marca
- **D.3** — Saludos fechas relevantes

### 🎬 FASE 2 — Flujo video completo (semana 2)

Documentación detallada: `fases/fase-2-flujo-video.md`

- **A.1 a A.8** — Producción → aprobación → publicación end-to-end

### 👥 FASE 3 — Comunidad e influencers (semana 3)

Documentación detallada: `fases/fase-3-comunidad-influencers.md`

- **E.2 a E.4** — Follow-ups, showroom, búsqueda
- **F.1 a F.2** — Competidores

### 🎨 FASE 4 — Avanzado (semana 4+)

Documentación detallada: `fases/fase-4-avanzado.md`

- **G.1 a G.3** — Edición fotos
- **D.1** — Reportes mensuales completos

---

## 📱 Activación desde el celular

Pedro puede activar cualquier automatización desde 3 canales (todos compatibles entre sí):

### Canal 1 — Claude app móvil
Más simple. Bajas Claude iOS/Android, te logueas, hablas igual que en laptop.
Detalles: `activacion/claude-app-movil.md`

### Canal 2 — WhatsApp → Rubi (RECOMENDADO para Pedro)
Le hablas a Rubi por WhatsApp con comandos cortos. Rubi escucha + activa flow en tu Mac.
Detalles: `activacion/rubi-whatsapp.md`

Ejemplos:
- *"Rubi, revisa TikTok manrique"*
- *"Rubi, aprueba el último video de Lozano y mándalo al cliente"*
- *"Rubi, genera trends Kintu"*

### Canal 3 — Shortcuts iOS / Atajos Android
Botones en el celu que disparan acciones específicas.
Detalles: `activacion/shortcuts-ios.md`

---

## 🔧 Triggers principales — qué frase activa qué

Documentación completa: ver cada sección de fase, pero los más usados:

| Frase | Activa |
|---|---|
| *"Revisa comentarios TikTok de [marca]"* | Skill `responder-tiktok` MODO 1 |
| *"Ya respondí TikTok de [marca]"* | Skill `responder-tiktok` MODO 2 (Rubi al cliente) |
| *"Pasa video [marca] a aprobación"* | Flujo A.2 |
| *"Aprobado video [marca]"* (cliente en WhatsApp) | Flujo A.3 detección automática |
| *"Genera copies grilla [marca]"* | Flujo B.1 |
| *"Trends de la semana [marca]"* | Flujo C.1 |
| *"Reporte mensual [marca]"* | Flujo D.1 |
| *"Influencers nuevos [marca]"* | Flujo E.4 |
| *"Competidores [marca]"* | Flujo F.2 |

---

## 🛡️ Reglas operativas (heredadas de skill `responder-tiktok`)

1. **NUNCA mandar mensaje al WhatsApp del cliente sin aprobación explícita** de Pedro en el chat.
2. **Errores técnicos → solo a Pedro**, nunca al cliente.
3. **Antes de ejecutar cualquier flujo que toque cliente** (mensaje WhatsApp, post Metricool, etc.) → mostrar preview + esperar OK.
4. **Marcas excluidas de TikTok inbox**: Mil Ideas, Oral Beauty (campo `no_trabajado: true` en `marcas.json`).
5. **Voz de marca**: cada flow debe consultar la skill `marca-X-<cliente>` antes de generar copy/respuesta/mensaje.

---

## 📂 Estructura del skill

```
automatizaciones-distinto/
├── SKILL.md                          ← este archivo (entry point + roadmap)
│
├── fases/                            ← detalle técnico por fase
│   ├── fase-1-quick-wins.md
│   ├── fase-2-flujo-video.md
│   ├── fase-3-comunidad-influencers.md
│   └── fase-4-avanzado.md
│
├── activacion/                       ← cómo activar desde cada canal
│   ├── claude-app-movil.md
│   ├── rubi-whatsapp.md              ← setup conversacional WhatsApp
│   └── shortcuts-ios.md
│
├── scripts/                          ← código Python ejecutable
│   ├── (vacío por ahora — se llena en cada fase)
│   └── _README.md
│
└── plantillas-mensaje/               ← mensajes pre-aprobados por escenario
    ├── aviso-publicacion-cliente.md
    ├── saludo-cumpleanos.md
    ├── follow-up-influencer.md
    └── (más por agregar)
```

---

## 🧭 Principio de proactividad (regla dura, aplica a TODA conversación de la agencia)

Cuando Pedro use frases como:
- *"ya tienes la plantilla"*
- *"ya tienes el contexto"*
- *"ya sabes cómo va"*
- *"solo debes [acción]"*
- *"haz lo de siempre"*
- *"como la vez pasada"*
- *"con la info que ya conoces"*

**NO PREGUNTAR** dónde está la plantilla, qué formato usar, ni pedir clarificaciones que se pueden resolver buscando. **ACTUAR** en este orden:

1. **Buscar en serio** los recursos en este orden de prioridad:
   - Skills del plugin (`marca-X-<cliente>/`, `grilla-semanal/`, `responder-tiktok/`, esta skill)
   - Notion (con query filtrado o búsqueda por título)
   - Google Drive (carpeta `1. GESTIÓN/CUENTAS/[marca]/`)
   - Canva (templates marca)
   - Conversaciones previas del proyecto (memoria)

2. **Si lo encuentras** → ejecutar la tarea y entregar resultado.

3. **Si NO lo encuentras** después de buscar en al menos 3 fuentes → recién entonces preguntar, **especificando dónde ya buscaste** (ej: *"Busqué en skill marca-manrique, en Notion 'plantillas Manrique' y en Drive '4. PLANTILLAS' — no encontré la plantilla. ¿En qué carpeta está?"*).

**Filtro antes de cada pregunta:** *"¿esto se puede deducir del contexto o buscar en algún lado al que tengo acceso?"*. Si la respuesta es sí → buscar primero, no preguntar.

**Antipatrones prohibidos:**
- Preguntar dónde está algo que Pedro acaba de decir *"ya tienes"*
- Listar 2 opciones cuando una está claramente implícita en el mensaje original
- Ofrecer *"¿quieres que haga X?"* después de no hacer X (si X era lo pedido)
- Devolver una muestra cuando Pedro pidió la lista completa

---

## 🚦 Estado actual del proyecto

- ✅ Skill `responder-tiktok` v2.1.0 funcional (lectura + Excel + Rubi MODO 2)
- ✅ 7 marcas activas (Manrique, Lozano, Distribuidora Fitness, Little Joe, Kintu, NovaLamps, La Victoria)
- ✅ MCPs conectados: Drive, Notion, Metricool, Rubi WhatsApp, Chrome MCP, scheduled-tasks
- 🟡 Fase 1 en armado
- ⏳ Fases 2-4 pendientes

---

## 📎 Skills relacionadas (usar como referencia)

- `responder-tiktok` — inbox TikTok comments
- `grilla-semanal` — generación semanal de grilla content
- `marca-X-<cliente>` (1-9) — voz y datos por marca
- `credito-peru-pedro` — finanzas personales Pedro (separado de agencia)

---
Versión: 0.2.0 (en armado) · Última actualización: 18 mayo 2026
