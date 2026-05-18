# Fase 1 — Quick Wins

> Los 4 flows que dan más ROI con menos trabajo de armado. Total estimado: ~6-8 hrs de desarrollo + setup.

## Resumen de Fase 1

| Flow | Categoría | Esfuerzo | Activación |
|---|---|---|---|
| **D.2 + A.8** | Aviso publicación al cliente | 2 hrs | Trigger automático (cron poll Metricool) + tu OK previo |
| **B.1-3** | Copies automáticos grilla Notion | 2 hrs | Trigger: Lorena marca videos en Notion |
| **C.1** | Trends semanal por marca | 2 hrs | Cron domingo 8pm |
| **D.3** | Saludos fechas relevantes | 1 hr | Cron diario 8am |

---

## 🎬 D.2 + A.8 — Aviso publicación al cliente

### Objetivo
Cuando Metricool confirma que se publicó un post de una marca, Claude detecta el evento, busca el link directo del post, prepara mensaje on-brand para el grupo WhatsApp del cliente, y **espera tu OK** antes de mandar.

### Disparador
- **Cron cada 30 min**: poll Metricool API → `get_scheduled_posts` filtrado por marca + estado "publicado" + última hora
- **O manual**: Pedro dice `>> aviso publicacion [marca] [link-opcional]`

### Flujo detallado

```
[CRON o COMANDO]
    ↓
1. Detectar publicación nueva (last 1 hour)
    ↓
2. Obtener metadata: marca, plataforma (IG/FB/TikTok), link del post, copy original
    ↓
3. Consultar marca-X-cliente skill para:
   - Tono de cierre
   - Tratamiento + nombre del contacto
   - Grupo WhatsApp + chatId
    ↓
4. Componer mensaje (plantilla en plantillas-mensaje/aviso-publicacion-cliente.md)
    ↓
5. PEDIR OK A PEDRO en chat:
   "✅ Se publicó post de [marca] en [plataforma].
    Link: [link]
    Mensaje preparado para grupo '[grupo]':
    ---
    [mensaje]
    ---
    ¿Mando? (sí / no / editar)"
    ↓
6. Solo si Pedro dice SÍ → enviar con whatsapp_send_with_mentions
    ↓
7. Registrar en Notion / log local que ya se avisó (evitar duplicados)
```

### Plantilla mensaje (por marca)

Cada marca tiene su propio tono. Ver `plantillas-mensaje/aviso-publicacion-cliente.md` para detalle.

Ejemplo Manrique:
```
Hola Dr. Gustavo 👋

Acabamos de publicar el post de hoy en [IG/TikTok]:
🔗 [link]

📌 Tema: [tema del post]

Cualquier ajuste o duda, nos cuentas 🌿
```

### Requisitos previos
- ✅ Metricool MCP conectado
- ✅ Rubi WhatsApp MCP conectado
- ✅ Skills marca-X con datos de grupo WhatsApp
- 🟡 Plantilla por marca (a crear)

---

## ✍️ B.1-3 — Copies automáticos grilla Notion

### Objetivo
Cuando Lorena suba videos a la Grilla Fit (Notion) y los ordene, Claude lee cada card sin copy, consulta la skill de marca, genera **un solo copy on-brand**, lo escribe en el campo "Copy", marca la casilla "Copy Listo", y avisa por Rubi al grupo interno.

### Disparador
- **Cron cada 2 horas** (durante horario laboral): poll Notion DB Grilla Fit → cards con video subido + sin copy
- **O manual**: Pedro dice `>> genera copies grilla [marca]`

### Flujo detallado

```
[CRON o COMANDO]
    ↓
1. Notion search: cards de Grilla [marca] con estado "Para copy" o "Sin copy"
    ↓
2. Para cada card:
   a. Leer descripción del video (Lorena pone resumen breve)
   b. Leer thumbnail/imagen del video si hay
   c. Consultar marca-X-cliente skill (voz, pilares, palabras vetadas)
   d. Generar UN solo copy (no variantes — Pedro pidió 1 solo)
   e. Actualizar Notion: campo "Copy" + check "Copy Listo"
    ↓
3. Cuando termine TODOS los pendientes:
   Enviar al grupo interno vía Rubi:
   "Los copies de {marca} ya están listos para revisar 📝
    [N cards] generadas.
    → Link a Grilla [marca]"
    ↓
4. Si algún copy NO se pudo generar (falta info, etc.):
   Reportar SOLO a Pedro lista de cards sin generar
```

### Reglas de generación copy
- Aplicar voz de `marca-X-<cliente>/01-marca.md`
- Aplicar pilares de `04-contenido.md`
- Respetar palabras vetadas de `05-cliente.md`
- 1 sola variante (no A/B/C)
- Hashtags: 3-5 del bank de la marca (`calendario/hashtag-bank.md`)
- CTA según pilar (DM, link bio, comentar, etc.)

### Requisitos previos
- ✅ Notion MCP conectado
- ✅ Skills marca-X con voz documentada
- 🟡 Schema Notion confirmado (campos exactos: "Copy", "Copy Listo", "Estado")
- 🟡 Grupo WhatsApp interno definido (¿Marketing Manrique? ¿New team? ¿uno general?)

---

## 📊 C.1 — Trends semanales por marca

### Objetivo
Cada domingo 8pm, Claude busca trends en Instagram + TikTok de la categoría de cada marca, los rankea por relevancia, y genera reporte en Notion + aviso por Rubi.

### Disparador
- **Cron domingo 8pm** (semanal)
- **O manual**: Pedro dice `>> trends de la semana [marca]`

### Flujo detallado

```
[CRON SEMANAL o COMANDO]
    ↓
1. Para cada marca activa (las 7 que trabajamos):
   a. Leer "categoría" de la marca (de 01-marca.md)
   b. Generar lista de hashtags y keywords objetivo (de 04-contenido.md)
    ↓
2. Buscar trends:
   a. TikTok Discover / Explore (vía Chrome MCP o scraping limitado)
   b. Instagram Reels Explore (Chrome MCP)
   c. Audios trending TikTok
   d. Hashtags creciendo
    ↓
3. Filtrar trends por relevancia categoría:
   - Para Manrique → trends salud mental, parenting, autismo
   - Para Little Joe → trends auto, lifestyle, regalos
   - Para Lozano → trends interiores, deco, hogar
   - etc.
    ↓
4. Para cada marca, generar Notion page:
   "Trends semana [fecha] — [Marca]"
   ├── Top 5 trending sounds (con links)
   ├── Top 5 hashtags emergentes
   ├── 3 hooks sugeridos basados en trends
   ├── 2 temas no tratados aún por la marca
   └── Referencias (links a reels/TikToks ejemplos)
    ↓
5. Aviso vía Rubi al grupo interno:
   "📊 Trends de la semana listos:
    [marca 1] → [link Notion]
    [marca 2] → [link Notion]
    ..."
```

### Limitaciones técnicas
- TikTok no tiene API pública para explorar trends → usar Chrome MCP + scraping
- Instagram Reels Explore tampoco → Chrome MCP
- Lento: ~2-3 min por marca → total ~15-20 min para las 7

### Requisitos previos
- ✅ Chrome MCP conectado
- ✅ Patchright para evitar detección
- 🟡 Notion DB "Trends Semanales" a crear
- 🟡 Categorías por marca documentadas (algunas ya en `01-marca.md`)

---

## 🎂 D.3 — Saludos fechas relevantes

### Objetivo
Cada día a las 8am, Claude revisa si hay fechas relevantes hoy (cumpleaños fundador, aniversario marca, fechas comerciales propias) y prepara saludo para enviar al grupo del cliente — **con tu OK previo**.

### Disparador
- **Cron diario 8am**
- **O manual**: Pedro dice `>> saludos de hoy`

### Flujo detallado

```
[CRON DIARIO 8am o COMANDO]
    ↓
1. Cargar calendario por marca de:
   - calendar/fechas-marca.md (cumpleaños fundador, aniversario)
   - calendar/fechas-sector.md (días específicos del rubro)
   - calendar/fechas-nacionales.md (madre, padre, fiestas patrias)
    ↓
2. Filtrar fechas == HOY
    ↓
3. Para cada fecha relevante:
   a. Consultar marca-X-cliente skill (tono, tratamiento contacto)
   b. Generar saludo on-brand (plantilla en plantillas-mensaje/saludo-cumpleanos.md o variantes)
   c. Componer mensaje al grupo WhatsApp del cliente
    ↓
4. PEDIR OK A PEDRO con lista:
   "🎂 Saludos para hoy:
   1. [Marca]: 🎉 Cumple fundador [nombre]
      → Mensaje: '[mensaje]'
      → Grupo: '[grupo]'
   2. [Marca]: 🏆 Aniversario marca
      → ...
   
   Responde con número(s) para enviar (ej. '1, 2') o 'todos'"
    ↓
5. Enviar solo los aprobados via whatsapp_send_with_mentions
    ↓
6. Registrar en log que ya se mandó (evitar reenvíos accidentales)
```

### Calendario inicial necesario por marca

Tengo que crear/poblar:

| Marca | Fechas a documentar |
|---|---|
| Manrique | Cumpleaños Dr. Gustavo, aniversario centro, Día Salud Mental (10 oct), Día Persona TEA (2 abr) |
| Lozano | Cumpleaños César Lozano, aniversario empresa, Día del Carpintero |
| Distribuidora Fitness | Día del Profesional Fitness, aniversario empresa |
| Little Joe | Aniversario distribuidor Ares Perú, Día del Auto, Día del Padre (regalo) |
| Kintu | Día del Wellness, aniversario marca |
| NovaLamps | Aniversario empresa, Día del Diseño Interior |
| La Victoria | Aniversario empresa, Día del Constructor |

### Requisitos previos
- ✅ Rubi WhatsApp MCP
- ✅ Skills marca-X con calendarios (algunos ya tienen, otros faltan)
- 🟡 Lista canónica de fechas por marca (a confirmar con Pedro)

---

## 🛠️ Setup técnico común para Fase 1

### Cron jobs

Archivo `~/Library/LaunchAgents/com.distinto.automations.plist` (launchd macOS):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>Label</key><string>com.distinto.automations</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/pedroreyescalderon/.../scripts/cron_runner.py</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <!-- Aviso publicación: cada 30 min -->
        <dict><key>Minute</key><integer>0</integer></dict>
        <dict><key>Minute</key><integer>30</integer></dict>
    </array>
</dict>
</plist>
```

### Estructura de scripts (a armar)

```
automatizaciones-distinto/scripts/
├── cron_runner.py          # Orquesta todos los flows según hora actual
├── aviso_publicacion.py    # D.2 + A.8
├── copies_grilla.py        # B.1-3
├── trends_semanal.py       # C.1
├── saludos_fechas.py       # D.3
└── lib/
    ├── notion_helpers.py
    ├── rubi_helpers.py
    ├── metricool_helpers.py
    └── chrome_helpers.py    # Patchright wrappers
```

---

## 📅 Cronograma sugerido

| Día | Tarea | Esfuerzo |
|---|---|---|
| **Lunes** | Setup cron + escuchar_rubi.py básico (sin lógica) | 2 hrs |
| **Martes** | D.3 Saludos fechas (más simple, sirve para validar el flow OK→envío) | 1 hr |
| **Miércoles** | D.2/A.8 Aviso publicación | 2 hrs |
| **Jueves** | B.1-3 Copies grilla Notion | 2 hrs |
| **Viernes** | C.1 Trends semanal + test integral | 2 hrs |
| **Sábado-Domingo** | Pulir, fix bugs, documentar comandos finales | 2 hrs |

Total: ~11 hrs (incluye buffer para imprevistos).

---

## 🚦 Checkpoints

Después de cada flow armado, validar con Pedro:

1. **D.3**: que llegue mensaje a tu chat con preview saludo → tú apruebas o rechazas
2. **D.2/A.8**: simular post publicado → ver preview → aprobar → confirmar que llegó al grupo
3. **B.1-3**: revisar copies generados en Notion ANTES de marcar "Copy Listo"
4. **C.1**: revisar reporte de trends antes de difundirlo al equipo

---
Versión: 0.1.0 · Última actualización: 17 mayo 2026
