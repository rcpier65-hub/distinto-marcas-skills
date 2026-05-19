# Plantilla Grilla Semanal — Novalamps Eléctrika

Pieza vertical 1080×1620 (formato IG/TikTok story).

## Archivos en esta carpeta

- `plantilla-grilla-novalamps.html` — Plantilla editable
- `novalamps-logo.png` — Logo oficial (wordmark + símbolo casa con wifi + tagline eléctrika)
- `README - instrucciones de uso.md` — Este archivo

---

## ✅ QUÉ SE PUEDE EDITAR cada semana

Según lo definido en la grilla fit de Notion:

### 1. Pill de fecha — verde lima
```html
<div class="date-pill">11—17 MAY · 2026</div>
```

### 2. Subtítulo del hero
```html
<div class="sub"><span class="accent"></span>Mayo · Semana del 11 al 17</div>
```

### 3. Las 5 cards
- `<div class="day">11</div>` → número del día
- `<div class="title">Nueva línea LED</div>` → título de la pieza
- `<div class="meta">6:30 pm · IG · TikTok · Reel</div>` → hora + plataformas + formato
- `<svg>...</svg>` → ícono representativo

### 4. Banco de íconos sugeridos para Novalamps
- Foco/bombilla (productos LED)
- Cable cruzado (instalación profesional)
- Rayo (ahorro energético, electricidad)
- Pantalla con play (tour, demos)
- Burbuja con `99` (testimonios)

---

## 🚫 QUÉ NO SE PUEDE TOCAR

### Colores — manual oficial Novalamps

```css
--lime:     #D2DD00   /* Verde lima Pantone 389 C - color principal */
--graphite: #262726   /* Verde negro/grafito Pantone 419 C */
--white:    #FFFFFF
```

Vienen del Manual de Identidad Corporativa Novalamps (página 7-8).

### Tipografía — manual oficial

```css
--font: 'Inter'   /* Substituto OSS de Arial Regular/Bold */
```

⚠️ Usar **siempre Inter Black (900) en uppercase** para titulares
— matchea Arial Bold con peso máximo, que es la directiva del manual.

⚠️ **No usar serif ni tipografías premium** — el manual lo prohíbe
explícitamente para identidad base. Solo si una campaña específica
de interiorismo lo pide.

### Layout — estructura fija

- Lienzo: 1080×1620
- Logo arriba a la izquierda (280px ancho)
- Cuadrado diagonal grafito en esquina superior derecha (efecto eléctrico)
- Pill de fecha lima sin border-radius (técnico)
- Título "¿QUÉ SE / VIENE?" con "VIENE?" sobre fondo lima (sticker style)
- 5 cards con border-left de 8px lime/grafito (técnico)
- Footer con barra grafito + acento lima izquierdo

### Variantes de cards (v1 a v5)

- `v1` → blanca con border-left lime (lanzamiento)
- `v2` → gris claro con border-left grafito (educativo)
- `v3` → **GRAFITO STATEMENT con texto LIME** (oferta / tip más importante)
- `v4` → lime soft con border-left lime (visual / video)
- `v5` → blanca con border-left grafito (testimonio / cierre)

⚠️ **La card grafito (v3) solo aparece UNA vez por grilla**.

### Footer de Distinto — fijo
No modificar firma ni URL.

---

## 🛠️ Cómo exportar a PNG

1. Abrir `plantilla-grilla-novalamps.html` en Google Chrome
2. Asegurarse que `novalamps-logo.png` esté en la misma carpeta
3. F12 → Cmd+Shift+P → "Capture full size screenshot"
4. Chrome descarga PNG 1080×1620

---

## ❓ FAQ

**¿Puedo usar el lima en fondos grandes?**
No es ideal. El verde lima #D2DD00 es muy intenso/saturado y cansa
la vista en fondos grandes. Por eso se usa como STICKER en "VIENE?",
en el pill de fecha y en bordes/acentos pequeños.

**¿Puedo agregar serif para el título?**
No. El manual oficial prohíbe explícitamente serif/Playfair en
identidad base de Novalamps. Mantener Inter (sans-serif técnico).

**¿Por qué el título alineado a la izquierda (no centrado)?**
Refuerza la sensación técnica/industrial de la marca. La marca es
eléctrica, técnica, ingenieril — no decorativa. El centrado se siente
más residencial/cálido, la izquierda más industrial/profesional.

---

Plantilla creada por Agencia Distinto · 2026
