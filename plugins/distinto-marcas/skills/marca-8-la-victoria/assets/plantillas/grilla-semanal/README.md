# Plantilla Grilla Semanal — La Victoria · Distribuidora de Pino

Pieza vertical 1080×1620 (formato IG/TikTok story).

⚠️ **Hex APROXIMADOS** — los colores son una aproximación basada en
el Brochure La Victoria 2025. Cuando se levante el manual oficial,
confirmar y reemplazar los valores en `:root`.

⚠️ **Logo placeholder** — La marca aún no tiene logo oficial levantado
en alta resolución. La plantilla usa un placeholder SVG con un pino
estilizado. Cuando llegue el logo real, reemplazarlo.

## Archivos en esta carpeta

- `plantilla-grilla-la-victoria.html` — Plantilla editable
- `la-victoria-logo.png` — Logo oficial (pendiente cuando se levante)
- `README - instrucciones de uso.md` — Este archivo

---

## ✅ QUÉ SE PUEDE EDITAR cada semana

Según lo definido en la grilla fit de Notion:

### 1. Pill de fecha — verde bosque
```html
<div class="date-pill">11 — 17 MAY · 2026</div>
```

### 2. Subtítulo del hero
```html
<div class="sub">Mayo · Semana del 11 al 17</div>
```

### 3. Las 5 cards
- `<div class="day">11</div>` → número del día
- `<div class="title">Producto destacado · Pino</div>` → título
- `<div class="meta">6:30 pm · IG · TikTok · Reel</div>` → meta
- `<svg>...</svg>` → ícono representativo

### 4. Banco de íconos sugeridos para La Victoria (Pino/Madera)
- Pino estilizado (productos, materia prima)
- Tabla con medidas (productos cortados)
- Etiqueta (ofertas, distribución mayorista)
- Pantalla con play (tour aserradero, demos)
- Burbuja con `99` (testimonios industria mueblera)

---

## 🚫 QUÉ NO SE PUEDE TOCAR

### Colores aproximados (basados en brochure 2025)

```css
--forest: #1B4332   /* Verde bosque oscuro - primario */
--cream:  #F5F0E8   /* Crema cálido - fondo principal */
--wood:   #B5926D   /* Madera natural - acentos */
--ink:    #2A2A2A   /* Gris oscuro - texto */
```

⚠️ Cuando llegue el manual oficial, confirmar y ajustar.

### Tipografía — basada en brochure

```css
--display: 'Cormorant Garamond'   /* Serif moderna semibold */
--body:    'Inter'                  /* Sans serif tracking ancho */
```

⚠️ El brochure usa serif moderna tipo Calluna para títulos. Cormorant
Garamond es el sustituto OSS más cercano (premium, semibold, italic).

### Layout — estructura fija

- Lienzo: 1080×1620
- Barra verde de 14px arriba (bloque verde institucional)
- Logo (pino circular + nombre serif + tagline sans tracking) arriba a la izquierda
- Pill de fecha verde sin border-radius arriba a la derecha
- Pre-header "— CALENDARIO SEMANAL —" en madera natural
- Título serif con "viene?" en italic + color madera
- 5 cards con paleta cream/white rotativa
- Footer con frase de marca italic + firma de agencia

### Variantes de cards (v1 a v5)

- `v1` → blanca con borde madera (apertura)
- `v2` → cream con borde madera (educativo / medidas)
- `v3` → **VERDE BOSQUE STATEMENT** (oferta o pieza importante)
- `v4` → blanca con borde madera (tour / video)
- `v5` → cream con borde madera (testimonio)

⚠️ **El verde bosque (v3) solo aparece UNA vez por grilla**.

### Footer de Distinto — fijo
No modificar firma ni URL.

### Frase de cierre "ESTABLECIDOS EN CONFIANZA"
Es parte de la identidad de marca. No modificar.

---

## 🛠️ Cómo exportar a PNG

1. Abrir `plantilla-grilla-la-victoria.html` en Google Chrome
2. F12 → Cmd+Shift+P → "Capture full size screenshot"
3. Chrome descarga PNG 1080×1620

---

## ❓ FAQ

**¿Puedo cambiar el verde bosque por otro tono?**
No. El verde bosque oscuro es el color signature de La Victoria
(asociado a pino, madera, naturaleza, autoridad). Mantener fijo.

**¿Puedo agregar fotos de madera real al fondo?**
Para versión premium, sí — usando el color madera (#B5926D) como
overlay opacity para mantener legibilidad. Pero esta plantilla base
prioriza el espacio negativo del brochure.

**¿Por qué el "viene?" está en italic madera?**
Refleja la estética del brochure 2025 donde nombres de productos
(ej: "Industria Mueblera", "Carpintería") aparecen en cursiva con
acento madera. Es deliberado.

---

Plantilla creada por Agencia Distinto · 2026
⚠️ Pendiente de actualización cuando se levante el manual oficial
