# Plantilla Grilla Semanal — Kintu Essential Oils

Pieza vertical 1080×1620 (formato IG/TikTok story) que se publica cada
lunes con el calendario de contenido de la semana siguiente.

Esta es la **ÚNICA plantilla oficial** para la grilla semanal de Kintu.

## Archivos en esta carpeta

- `plantilla-grilla-kintu.html` — Plantilla editable (abrir en Chrome)
- `kintu-logo.png` — Logo oficial wordmark + hojas + tagline "ESSENTIAL OILS"
- `README - instrucciones de uso.md` — Este archivo

---

## ✅ QUÉ SE PUEDE EDITAR cada semana

Según lo definido en la grilla fit de Notion:

### 1. Pill de fecha (header arriba a la derecha)
```html
<div class="date-pill">11 — 17 MAY · 2026</div>
```

### 2. Subtítulo del hero
```html
<div class="sub">Mayo · Semana del 11 al 17</div>
```

### 3. Las 5 cards (3 elementos por card)

- `<div class="day">11</div>` → número del día
- `<div class="title">Nuevo aceite esencial</div>` → título de la pieza
- `<div class="meta">6:30 pm · IG · TikTok · Reel</div>` → hora + plataformas + formato
- `<svg>...</svg>` → ícono representativo del contenido

### 4. Banco de íconos sugeridos para Kintu
- Gota (aceites, aromaterapia, hidratación)
- Sol/rayos (rituales matutinos, energía)
- Caja/packaging (combos, productos)
- Pantalla con play (tutoriales, demos de uso)
- Burbuja con `99` (testimonios)

---

## 🚫 QUÉ NO SE PUEDE TOCAR

### Colores — manual oficial

```css
--deep:  #1A3E42   /* Verde profundo - texto, autoridad */
--green: #45B787   /* Verde Kintu - acentos, logos */
--mint:  #BBE0CD   /* Verde menta claro - fondos suaves */
--cream: #F7FBF9   /* Off-white verdoso (fondo principal) */
```

Vienen del Manual Branding Kintu / Identidad Visual.

### Tipografía — manual oficial

```css
--font: 'Montserrat'   /* TODA la familia */
```

- Títulos: **ExtraBold (900)** — para `¿Qué se viene?` y card titles
- Subtítulos: **SemiBold (600)** — para metadata
- Cuerpo: **Medium (500)** — para body normal
- Tagline: **Regular (400) con tracking amplio** — para "ESSENTIAL OILS"

### Layout — estructura fija

- Lienzo: 1080×1620
- Logo arriba a la izquierda (240px ancho)
- Pill de fecha verde profundo arriba a la derecha
- Hojas decorativas verde menta en esquinas (top-right + bottom-left)
- Título "¿Qué se viene?" con "viene?" en verde Kintu
- 5 cards con paleta verde rotativa
- Footer con divisor verde + firma de agencia

### Variantes de cards (v1 a v5) — mantener orden

- `v1` → fondo menta soft (apertura, naturaleza)
- `v2` → blanca con borde menta (educativo)
- `v3` → **VERDE PROFUNDO STATEMENT** (oferta o pieza más importante)
- `v4` → blanca con borde menta (visual / video)
- `v5` → fondo menta saturado (cierre emocional / testimonio)

⚠️ **El verde profundo completo (v3) solo aparece UNA vez por grilla**.

### Footer de Distinto — fijo
No modificar la firma `DISTINTO · AGENCIA` ni la URL.

---

## 🛠️ Cómo exportar a PNG

1. Abrir `plantilla-grilla-kintu.html` en Google Chrome
2. Asegurarse que `kintu-logo.png` esté en la misma carpeta
3. F12 → Cmd+Shift+P → "Capture full size screenshot"
4. Chrome descarga PNG 1080×1620

---

## 🔄 Flujo recomendado

1. **Lunes 9:00 am** — revisar grilla fit en Notion
2. Editar solo lo permitido
3. Exportar PNG
4. Subir a carpeta POSTS de Kintu
5. Programar en IG/TikTok/FB

---

## ❓ FAQ

**¿Puedo usar otros tonos de verde?**
No. Los 3 verdes del manual (deep, kintu, mint) son la paleta completa.
El "Cream" (#F7FBF9) es un off-white con leve tinte verdoso, también permitido.

**¿Por qué el título es en lowercase "Qué se viene?"?**
Es coherente con el wordmark del logo Kintu (también en minúsculas).
Esto refuerza la sensación orgánica, natural y cercana de la marca.

**¿Las hojas decorativas son obligatorias?**
Sí. Son parte de los "patrones orgánicos" documentados en página 8 del
manual. Le dan a la pieza su carácter natural/wellness sin imágenes pesadas.

---

Plantilla creada por Agencia Distinto · 2026
