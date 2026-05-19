# Plantilla Grilla Semanal — Distribuidora Fitness Mayorista

Pieza vertical 1080×1620 (formato IG/TikTok story) que se publica cada
lunes con el calendario de contenido de la semana siguiente.

Esta es la **ÚNICA plantilla oficial** para la grilla semanal de
Distribuidora Fitness. Cualquier otra versión anterior debe descartarse.

## Archivos en esta carpeta

- `plantilla-grilla-distribuidora-fitness.html` — Plantilla editable (abrir en Chrome)
- `distribuidora-fitness-logo.png` — Logo oficial horizontal completo
  (descargar de `01 - IDENTIDAD DE MARCA/` o del skill local)
- `README - instrucciones de uso.md` — Este archivo

---

## ✅ QUÉ SE PUEDE EDITAR cada semana

Cada lunes, al actualizar la grilla, solo se modifican estos elementos
según lo definido en la grilla fit de Notion:

### 1. Pill de fecha (header arriba a la derecha)

```html
<div class="date-pill">11—17 MAY · 2026</div>
```

Solo cambian los números y el mes. Mantener el formato `DD—DD MES · AÑO`.

### 2. Subtítulo del hero

```html
<div class="sub">Mayo · Semana del 11 al 17</div>
```

### 3. Las 5 cards (una por publicación)

Por cada card, solo se editan **3 cosas**:

- `<div class="day">11</div>` → número del día
- `<div class="title">Combo Proteína + Creatina</div>` → título de la pieza
- `<div class="meta">6:30 pm · IG · TikTok · Reel</div>` → hora + plataformas + formato
- `<svg>...</svg>` → ícono representativo del contenido (opcional)

Los textos y el ícono salen de la **grilla fit en Notion** — copiá
literal lo que esté ahí.

### 4. Íconos SVG

Banco de íconos sugeridos para Distribuidora Fitness:
- Mancuerna (combos, productos, proteína)
- Gota (hidratación, suplementos líquidos)
- Etiqueta (ofertas, promos flash)
- Pantalla con play (rutinas, videos)
- Burbuja con `99` (testimonios)

---

## 🚫 QUÉ NO SE PUEDE TOCAR (respeta el manual de marca oficial)

### Colores — están fijados por el manual

```css
--orange: #F54922   /* Naranja Distribuidora Fitness - OFICIAL */
--black:  #333333   /* Negro Suave - OFICIAL */
--white:  #FFFFFF
```

Estos vienen del Manual Corporativo (IDEOTAS! Agencia de Diseño,
agosto 2024). No se pueden cambiar ni mezclar con otros colores.

### Tipografía — está fijada por el manual

```css
--display: 'Bebas Neue'   /* Substituto OSS de Stretch Pro - HEADLINES */
--body:    'Inter'        /* Substituto OSS de Infinite Light/Thin */
```

⚠️ **Para títulos usar siempre uppercase** — el manual marca que
el display es bold extended (Stretch Pro). Bebas Neue ya viene
condensed y solo en uppercase, lo que respeta el feel.

⚠️ **Para body usar Inter en peso 300 (Light) o 200 (Thin)** —
el manual marca que Infinite Light/Thin son para texto largo.

### Layout — estructura fija

- Lienzo: 1080×1620 (siempre, es el ratio de IG/TikTok story)
- Logo horizontal arriba a la izquierda (320px ancho)
- Pill de fecha negra con borde naranja izquierdo arriba a la derecha
- Forma diagonal naranja rotada 45° en esquina superior derecha
- Título "¿QUÉ SE VIENE?" centrado con "VIENE?" en naranja
- 5 cards verticales (v1 a v5)
- Footer con borde superior naranja 3px y firma de agencia

### Variantes de cards (v1 a v5) — no cambiar el orden

- `v1.has-accent` → blanca con borde izquierdo naranja 8px (lanzamiento)
- `v2` → fondo gris claro (visual de pausa)
- `v3` → **NARANJA STATEMENT** (la pieza más importante de la semana)
- `v4` → blanca borde negro (visual destacado)
- `v5.has-accent` → gris claro con borde izquierdo naranja 8px (cierre)

⚠️ **El naranja completo (v3) solo puede aparecer en UNA card por grilla**.
Si la semana no tiene oferta/promo destacada, mover la `v3` al
contenido más importante (lanzamiento, evento, anuncio mayorista).

### Footer de Distinto — fijo

La firma `DISTINTO · AGENCIA` con el logo morado+mostaza y la URL
`www.agenciadistinto.com` NO se modifican. Es la firma fija de la
agencia, no del cliente.

---

## 🛠️ Cómo exportar a PNG

1. Abrir `plantilla-grilla-distribuidora-fitness.html` en Google Chrome
2. Asegurarse que `distribuidora-fitness-logo.png` esté en la misma carpeta
3. F12 → Cmd+Shift+P → "Capture full size screenshot"
4. Chrome descarga PNG 1080×1620 listo para subir

---

## 🔄 Flujo de trabajo recomendado

1. **Lunes 9:00 am** — revisar grilla fit en Notion para la semana
2. Abrir esta plantilla, editar solo lo permitido (ver arriba)
3. Exportar PNG
4. Subir a la carpeta de POSTS semanales de Distribuidora Fitness
5. Programar en IG/TikTok/FB con la hora correspondiente

---

## ❓ FAQ

**¿Puedo cambiar el naranja por otro tono?**
No. El #F54922 viene del manual oficial. Es el color signature de
la marca, lo que la distingue de otras tiendas de suplementos.

**¿Puedo usar el logo en versión negativa (blanco sobre negro)?**
Sí, está documentado en el manual (página 8 — variaciones). Pero
para esta plantilla usamos siempre la versión positiva (color sobre
blanco) por consistencia con el fondo blanco del lienzo.

**¿Por qué la card v3 es naranja completa?**
Es el "statement" semanal. Funciona como en el manual donde dice
"blanco sobre naranja" para frases impactantes. La pieza más
importante de la semana se beneficia de máximo contraste.

**¿Por qué la forma diagonal naranja arriba a la derecha?**
Es un guiño al símbolo FD del logo (que tiene esa misma vibra
diagonal/aerodinámica). Refuerza la marca sin invadir el contenido.

**¿Puedo agregar texto adicional en alguna card?**
No. La estructura es de 3 elementos por card: día/mes, título, meta.
Si necesitás más info, usar el carrusel posterior, no la grilla.

---

Plantilla creada por Agencia Distinto · 2026
