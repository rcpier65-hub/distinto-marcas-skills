# Plantilla — Grilla Semanal Novalamps

> Plantilla operativa para generar la pieza visual 1080×1620 de la grilla
> semanal de contenido de Novalamps, lista para enviar por WhatsApp.
>
> Validada el **18 May 2026** con la primera grilla automatizada
> (semana 18–24 may 2026, messageId `3EB02A52FF3F31E041A82B`).

---

## 📦 Contenido de esta carpeta

| Archivo | Qué hace |
|---|---|
| `template.html` | HTML base con paleta oficial Novalamps y placeholders `{{...}}` |
| `build.sh` | Script bash que renderiza el HTML a PNG 1080×1620 con Chrome headless + downscale 2x |
| `README.md` | Este manual operativo |

---

## 🚦 Workflow paso a paso

### 1. Consultar Notion para la grilla de la semana

Database **"GRILLA DE CONTENIDO"**:
```
collection://11688541-0ddd-83d3-8e56-873a2ca08fb9
```

Filtrar por:
- `proyecto` = `fba88541-0ddd-824b-8dce-01c538c171ea` (proyecto Novalamps)
- `date:Grilla de FIT:start` en el rango lun–dom de la semana objetivo

> ⚠️ **Trampa**: la búsqueda semántica de Notion (`notion-search`) puede saltarse cards
> recién creadas o cuyo texto no menciona "Novalamps" explícitamente.
> **Validar siempre contra el calendario visual de Notion** antes de armar la grilla.
> Esto incluye revisar el calendario en pantalla con captura/screenshot.

### 2. Copiar el template y editarlo

```bash
cp template.html grilla-2026-W21.html
```

Buscar/reemplazar TODAS las ocurrencias `{{...}}`:

| Placeholder | Valor de ejemplo (semana 18–24 may) |
|---|---|
| `{{RANGO_FECHAS_PILL}}` | `18 — 24 MAY · 2026` |
| `{{NUM_PUBLICACIONES}}` | `5` |
| `{{DIA_INICIO_LARGO}}` | `lun 18` |
| `{{DIA_FIN_LARGO}}` | `dom 24` |
| `{{MES_LARGO}}` | `mayo` |
| `{{DIA_ABREV}}` | `Lun`, `Mar`, `Mié`, `Jue`, `Vie`, `Sáb`, `Dom` |
| `{{DD}}` | `18` |
| `{{MES_ABREV}}` | `May`, `Jun`, etc. |
| `{{TITULO_PIEZA}}` | `1. Max — voz en off` |
| `{{TIPO}}` | `Reel`, `Carrusel`, `Post`, `Story` |
| `{{DESCRIPCION_2_LINEAS}}` | parafraseo del copy de Notion, 2 líneas máximo |
| `{{NUM_SEMANA}}` | `21` |
| `{{ANIO}}` | `2026` |

**Duplicar el bloque `<div class="card">...</div>`** una vez por cada publicación.
El grid se autoajusta — funciona bien con 3 a 5 cards.

**Días sin publicación NO se incluyen** (regla del cliente).

### 3. Renderizar a PNG

```bash
bash build.sh grilla-2026-W21.html grilla-novalamps-W21.png
```

El script:
1. Copia el logo oficial desde Drive (`logo-novalamps-blanco-verde.png.png`)
2. Lo recorta al área útil (880×280) con `sips`
3. Renderiza el HTML con Chrome headless a 2x para tipografía crisp
4. Downscale a 1080×1620 con `sips`
5. Output: `/tmp/distinto-grilla/<output-name>.png`

### 4. Validar visualmente

```bash
open /tmp/distinto-grilla/grilla-novalamps-W21.png
```

Checklist:
- [ ] Tamaño exacto 1080×1620
- [ ] Logo "novaLamps" blanco visible (no solo el isotipo lima)
- [ ] 6:30 pm en todas las cards
- [ ] Sin días vacíos (jue/sáb si no hay publicación)
- [ ] Texto de descripciones no se corta

### 5. Mostrar preview al usuario y esperar OK

Antes de enviar, mostrar al usuario:
- La imagen
- El caption completo
- El grupo destino + contacto a mencionar

**Esperar confirmación explícita** ("OK", "aprobado", "mandalo") antes de proceder.

Opcional: enviar **prueba primero** a número personal del operador para validar el render
final tal cual lo verá el cliente.

### 6. Subir PNG a URL pública y enviar

```bash
REPO="/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
cp /tmp/distinto-grilla/grilla-novalamps-W21.png "$REPO/tmp-demo/"
cd "$REPO"
git add tmp-demo/grilla-novalamps-W21.png
git commit -m "tmp: grilla novalamps W21" --quiet
git push origin main --quiet
```

URL resultante:
```
https://github.com/rcpier65-hub/distinto-marcas-skills/raw/main/tmp-demo/grilla-novalamps-W21.png
```

Enviar con `whatsapp_send_image`:

```json
{
  "chatId": "120363407777030884@g.us",
  "media": {
    "url": "https://github.com/rcpier65-hub/distinto-marcas-skills/raw/main/tmp-demo/grilla-novalamps-W21.png",
    "filename": "grilla-novalamps-W21.png",
    "mimetype": "image/png"
  },
  "caption": "..."
}
```

---

## 💬 Caption WhatsApp — formato canónico (validado)

```
@51987672233 Hola Cynthia 👋

Envío para ti la grilla de contenido que se publicará esta semana, del DD al DD de MES.

📍 *DÍA DD MES · TÍTULO PIEZA*
PLATAFORMAS · 6:30 pm
Descripción 2 líneas máximo.

📍 *DÍA DD MES · TÍTULO PIEZA*
PLATAFORMAS · 6:30 pm
Descripción 2 líneas máximo.

[...más bloques según cantidad de publicaciones...]
```

### Reglas del caption (Novalamps)

- **Saludo**: `Hola Cynthia 👋` — sin tratamiento ("Sr.", "Dr." NO)
- **Mention**: `@51987672233` al inicio (texto plano — push real solo con
  `whatsapp_send_with_mentions`, que no soporta imagen → usar `whatsapp_send_image` y aceptar
  que el `@` es solo texto)
- **Día abreviado**: 3 letras MAYÚSCULAS — `LUN MAR MIÉ JUE VIE SÁB DOM`
- **Mes abreviado**: `ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC`
- **Hora**: `6:30 pm` con espacio antes de `pm`, minúscula
- **Plataformas**: separadas por ` · ` (punto medio U+00B7)
- **NO incluir**: "Estado: Aprobar/Editar", "Cualquier ajuste antes de…",
  header "Grilla de contenido para [marca]", emojis decorativos en exceso

---

## 🎨 Decisiones de diseño documentadas

### Por qué logo blanco-verde sobre grafito (no plaqueta blanca)

El manual define la **"versión principal negativo"** del logo específicamente para fondos
oscuros. El archivo `logo-novalamps-blanco-verde.png.png` ES esa versión.

Una versión anterior usó una "plaqueta blanca" con el logo negro adentro — funciona pero
es menos limpia. La versión actual (logo blanco directo) es la composición canónica del
manual.

### Por qué Inter como tipografía

El manual oficial dice **Arial Regular/Bold**. Como Arial no está garantizada en todos los
sistemas/CDN, se usa **Inter** — explícitamente documentada en
`assets/colores-fuentes.txt` como sustituto OSS aprobado.

### Por qué render 2x + downscale

Chrome renderiza a 2160×3240 px con `--force-device-scale-factor=2`, luego `sips` lo baja
a 1080×1620. Resultado: bordes anti-aliasing más limpios que un render directo a 1x.
Especialmente notable en la tipografía pequeña de las descripciones.

### Por qué `--virtual-time-budget=8000`

Le da 8 segundos virtuales al navegador para cargar la fuente Inter desde Google Fonts
antes de tomar el screenshot. Sin este flag, Chrome puede capturar antes de que la fuente
esté disponible y se renderiza con Arial/system fallback.

---

## ⚠️ Trampas conocidas

### 1. PNG blanco transparente "parece vacío"

`logo-novalamps-blanco-verde.png.png` tiene texto blanco sobre fondo transparente.
Al previsualizarlo en herramientas con fondo claro (Read de Claude Code, Preview macOS sin
tema oscuro, GitHub PR diff), **solo se ve el isotipo lima** y el wordmark blanco queda
invisible — lo que puede llevar a descartarlo creyendo que es solo el símbolo.

**Validar siempre sobre fondo grafito antes de descartar.**

### 2. Archivos "Mesa de trabajo X" NO son el logo principal

En `01 - IDENTIDAD DE MARCA/LOGOS MARCAS NOVALAMPS/PNG/` hay archivos con nombres
genéricos de Illustrator (`Mesa de trabajo 1.png`, etc.). Son logos de **sub-marcas**:
- "novaLamps eléctrika" (con casita naranja)
- Líneas de producto: QUIMERA, AMBER PLUS, etc.

**El logo principal está en `01 - IDENTIDAD DE MARCA/LOGO/PNG/`** (carpeta singular,
nombres descriptivos `logo-novalamps-*-verde.png.png`).

### 3. Cards muy recientes pueden no aparecer en notion-search

La búsqueda semántica de Notion tiene latencia de indexación. Si una card fue creada
hace menos de unas horas, puede no aparecer en `notion-search`. **Validar contra el
calendario visual de Notion antes de armar la grilla**, no confiar solo en la búsqueda.

### 4. El proyecto Maderera La Victoria tiene cards homónimas

Cards como "1. MEDIDAS" o "7. SALTO DE TIGRE" pueden aparecer al buscar Novalamps por
similitud semántica, pero su `proyecto` apunta a `6c5885410ddd8278963a01e4b84595fc`
(Maderera La Victoria, no Novalamps).

**Filtrar siempre por el ID del proyecto** (`fba88541-0ddd-824b-8dce-01c538c171ea`),
no por nombre.

---

## 📞 Datos operativos confirmados

| Campo | Valor |
|---|---|
| Contacto cliente | **Cynthia** |
| WhatsApp Cynthia | `51987672233` |
| Tratamiento | _(sin tratamiento — informal)_ |
| Grupo WhatsApp | **Novalamps** |
| chatId del grupo | `120363407777030884@g.us` |
| Miembros del grupo | 6 |
| Hora oficial publicación | **6:30 pm** |
| Plataformas habituales | Instagram · Facebook · TikTok |

---

Plantilla creada y validada: 18 May 2026 · v1.0
