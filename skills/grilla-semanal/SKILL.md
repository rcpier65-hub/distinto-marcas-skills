---
name: grilla-semanal
description: Genera y envía la grilla semanal de contenido de cualquier marca de Distinto Agencia. Activar cuando el usuario diga "haz la grilla de [marca]", "envía la grilla semanal de [marca]", "manda la grilla a [contacto]", "armá la grilla fit de [marca]", "Lorena ya arregló Notion, manda la grilla de [marca]", o frases similares. Lee Notion (grilla fit), filtra publicaciones de la fecha actual hasta fin de semana, genera la pieza visual 1080×1620 con la plantilla de la marca, y la envía por WhatsApp al grupo correspondiente con mention al contacto del cliente.
---

# Grilla Semanal — Workflow operativo

## ⚡ Cuándo activar este skill

Activar **siempre** que el usuario pida:

- "Haz la grilla de [marca]"
- "Envía la grilla semanal de [marca]"
- "Manda la grilla a [contacto del cliente]"
- "Armá la grilla fit de [marca]"
- "Lorena ya arregló Notion, haz la grilla de [marca]"
- "Avanzá con la grilla de [marca]"
- "[Marca]: armá la grilla de esta semana"

Donde `[marca]` puede ser: Manrique, Lozano, Distribuidora Fitness, Kintu, Novalamps, La Victoria, Mil Ideas, Little Joe, Oral Beauty (o variaciones).

## 📋 Reglas absolutas

1. **NUNCA inventar datos** — todo viene de Notion. Si Notion no tiene contenido para un día, dejar la card como "Sin publicación programada" o omitirla del mensaje (según preferencia del cliente).
2. **NUNCA enviar el WhatsApp sin mostrar antes el preview** al usuario y esperar su aprobación. Excepción: si el usuario dice explícitamente "envialo directo" o "no hace falta preview".
3. **SIEMPRE leer primero la skill de marca** (`marca-X-cliente`) para contexto de voz, sensibilidades y reglas de contenido antes de generar el mensaje.
4. **SIEMPRE confirmar el receptor de WhatsApp** consultando `recipients.md` de este skill — cada marca tiene su grupo y contacto específico.
5. **NO incluir** la frase "Cualquier ajuste antes de mañana 6:30 pm es bienvenido" ni similares al final del mensaje. El cliente no lo pidió.
6. **NO incluir** un header tipo "Grilla de contenido para [MARCA]" — el mensaje empieza directo con el saludo personalizado al contacto.
7. **NO incluir** los días "Sin publicación programada" en el mensaje de texto (sí pueden aparecer visualmente en la pieza si el diseño lo requiere).
8. **NO incluir** el "Estado Notion" (ej. "Aprobar", "Programar") en el mensaje.

---

## 🗺️ Workflow completo (paso a paso)

### Paso 1 — Identificar la marca y el contacto

1. Extraer el nombre de la marca del mensaje del usuario
2. Mapear al skill correspondiente (`marca-1-muebles-lozano`, `marca-2-manrique`, etc.)
3. Consultar `recipients.md` para obtener:
   - Nombre del contacto del cliente (ej. Gustavo para Manrique)
   - Número de WhatsApp con prefijo país (ej. `51983852191`)
   - Grupo de WhatsApp donde enviar (ej. "New team" / alias `little-joe`)

### Paso 2 — Cargar contexto de marca

Invocar la skill `marca-X-[cliente]` para tener acceso a:
- Voz de marca (`01-marca.md`)
- Sensibilidades del cliente (`05-cliente.md`)
- Calendario y reglas de contenido (`04-contenido.md`)
- Plantilla HTML (`assets/plantillas/grilla-semanal/` cuando esté disponible)

### Paso 3 — Leer Notion (grilla fit)

1. Calcular el rango de fechas:
   - **Inicio**: fecha actual (hoy)
   - **Fin**: domingo de la semana actual (si hoy es lunes-domingo)
2. Usar `notion-search` con `data_source_url: "collection://11688541-0ddd-83d3-8e56-873a2ca08fb9"` (la database "📅 GRILLA DE CONTENIDO") y query = nombre de la marca
3. Por cada candidato resultante, usar `notion-fetch` para verificar:
   - Propiedad `proyecto` = página del proyecto de esa marca (relaciones)
   - Propiedad `date:Grilla de FIT:start` está dentro del rango calculado
4. Recopilar las páginas que matchean. De cada una extraer:
   - `Nombre de la tarea` → título de la pieza
   - `date:Grilla de FIT:start` → fecha de publicación
   - `Plataforma` → array de plataformas (Instagram, Facebook, TikTok, etc.)
   - `Tipo de contenido` → array (Reel, Post, Carrusel, etc.)
   - Contenido de la página → para generar resumen de 2 líneas

### Paso 4 — Generar la pieza visual

1. Copiar el HTML de plantilla de la marca a una ubicación temporal
2. Reemplazar:
   - Pill de fecha: `DD — DD MES · AÑO` con el rango
   - Subtítulo del hero: `Mes · Del [día] [DD] al [día] [DD]`
   - Cards: una por cada publicación encontrada en Notion
3. Renderizar a PNG 1080×1620 vía Playwright (server local + screenshot del `.poster`)
4. Recortar al tamaño exacto si hace falta

### Paso 5 — Preparar mensaje WhatsApp (caption)

Usar la plantilla en `message-template.md`. Estructura:

```
@[NUMERO_CONTACTO] Hola [NOMBRE_CONTACTO] 👋

Envío para ti la grilla de contenido que se publicará la siguiente semana, del [DD] al [DD] de [mes].

📍 *[DÍA] [DD] [MES] · [TÍTULO PIEZA]*
[PLATAFORMAS · separadas por · ] · [HORA]
[RESUMEN 2 LÍNEAS MÁXIMO de qué trata el contenido]

[Repetir bloque por cada publicación]
```

⚠️ **NO incluir**:
- Línea "Cualquier ajuste antes de las X es bienvenido"
- Header "Grilla de contenido para [marca]"
- Estado Notion
- Días sin publicación
- Emojis decorativos excesivos en el header

### Paso 6 — Subir imagen a URL pública

El servidor Rubi (WhatsApp MCP) necesita URL pública o base64. Para máxima calidad usar URL:

1. Copiar la imagen generada a `tmp-demo/` en este repo
2. `git add` + `git commit` + `git push` al repo público
3. Construir URL: `https://github.com/rcpier65-hub/distinto-marcas-skills/raw/main/tmp-demo/[nombre-archivo].png`
4. Verificar con curl que devuelve HTTP 200 antes de seguir

### Paso 7 — Mostrar preview al usuario

Antes de enviar, mostrar:
1. La imagen generada (con `open` en macOS)
2. El caption completo en formato bloque de código
3. El grupo destino + contacto a mencionar
4. Preguntar explícitamente: "¿Procedo a enviar?" o "¿Algún ajuste antes?"

### Paso 8 — Enviar WhatsApp

Solo después de aprobación del usuario:

1. Usar `whatsapp_send_image` con:
   - `chatId`: el chatId del grupo (ver `recipients.md`)
   - `media.url`: la URL pública de la imagen
   - `caption`: el mensaje completo con @mention al número del contacto
2. Confirmar el `messageId` retornado al usuario

### Paso 9 — Limpieza (opcional)

Después de confirmar que el mensaje llegó:
1. Remover la imagen temporal del repo: `git rm tmp-demo/[archivo].png`
2. Commit + push
3. (Opcional) Si el repo se hizo público solo para este envío, revertir a privado con `gh repo edit --visibility private`

---

## 📂 Archivos de soporte (leer antes de operar)

- **`recipients.md`** — Mapa marca → contacto + número + grupo WhatsApp
- **`message-template.md`** — Plantilla exacta del caption
- **`workflow-troubleshooting.md`** — Errores conocidos y workarounds (Notion query, base64, etc.)

---

## ✅ Output esperado

Al finalizar exitosamente, reportar al usuario:

```
✅ Grilla [MARCA] enviada
   • Grupo: [nombre del grupo]
   • Contacto mencionado: [nombre] (@[número])
   • Imagen: [N] cards (X publicaciones)
   • messageId: [id retornado por Rubi]
```

---

## 🚨 Cuándo escalar al humano (no enviar)

- Notion no devuelve ninguna publicación para la semana → preguntar al usuario si la grilla está realmente vacía o si hay un problema
- Marca no tiene plantilla HTML disponible en `assets/plantillas/grilla-semanal/`
- Imagen generada no respeta los colores oficiales del manual de marca
- El usuario no aprueba el preview después de 2 iteraciones de ajuste
- Errores de Notion API o WhatsApp/Rubi que no se resuelven en 2 intentos

---

Skill creado por Agencia Distinto · v1.0
