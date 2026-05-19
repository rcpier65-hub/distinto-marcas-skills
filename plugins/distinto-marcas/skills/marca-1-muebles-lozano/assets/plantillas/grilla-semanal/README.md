# Plantilla Grilla Semanal — Muebles Lozano

Pieza vertical 1080×1620 (formato IG/TikTok story) que se publica cada
lunes con el calendario de contenido de la semana siguiente.

Esta es la **ÚNICA plantilla oficial** para la grilla semanal de Muebles Lozano.
Cualquier otra versión anterior debe descartarse.

## Archivos en esta carpeta

- `plantilla-grilla-lozano.html` — Plantilla editable (abrir en Chrome)
- `lozano-logo.png` — Logo oficial (descargar de
  `01 - IDENTIDAD DE MARCA/` si no está aquí, o del skill local)
- `README - instrucciones de uso.md` — Este archivo

---

## ✅ QUÉ SE PUEDE EDITAR cada semana

Cada lunes, al actualizar la grilla, solo se modifican estos elementos
según lo definido en la grilla fit de Notion:

### 1. Pill de fecha (header arriba a la derecha)

```html
<div class="date-pill">11<span class="accent">—</span>17 MAY · 2026</div>
```

Solo cambian los números y el mes. Mantener el formato `DD—DD MES · AÑO`.

### 2. Subtítulo del hero

```html
<div class="sub">Mayo · Semana del 11 al 17</div>
```

### 3. Las 5 cards (una por publicación)

Por cada card, solo se editan **3 cosas**:

- `<div class="day">11</div>` → número del día
- `<div class="title">Mueble destacado</div>` → título de la pieza
- `<div class="meta">6:30 pm · IG · TikTok · Reel</div>` → hora + plataformas + formato
- `<svg>...</svg>` → ícono representativo del contenido (opcional)

Los textos y el ícono salen de la **grilla fit en Notion** — copiá
literal lo que esté ahí.

### 4. Íconos SVG

Cada card tiene un ícono representativo. Si la pieza es nueva y necesita
otro ícono, reemplazá solo el contenido dentro de `<svg viewBox="0 0 64 64">`.

Banco de íconos sugeridos para Muebles Lozano:
- Mueble (sofá, silla, mesa, ropero)
- Casa / habitación
- Etiqueta de oferta
- Pantalla / TV (video / tour)
- Burbuja con "99" (testimonio)

---

## 🚫 QUÉ NO SE PUEDE TOCAR (respeta el manual de marca oficial)

### Colores — están fijados por el manual

```css
--yellow: #DCC32C   /* Amarillo Muebles Lozano - OFICIAL CMYK 16/26/91/0 */
--black:  #0C0C12   /* Negro Corporativo - OFICIAL CMYK 84/83/73/80 */
--white:  #FFFFFF
```

Estos vienen del Manual de Identidad Corporativa (Logos Perú, v1.0, 2019).
No se pueden cambiar ni mezclar con otros colores.

### Tipografía — está fijada por el manual

```css
--display: 'Bebas Neue'   /* Substituto OSS de Opificio Neue */
--body:    'Inter'        /* Substituto OSS de Myriad Pro */
```

⚠️ **NO usar bold en headlines**. El manual de Lozano marca que Opificio
Neue NO tiene versión bold — para énfasis usar borde, no peso.
Bebas Neue ya viene en un solo peso que respeta esto.

### Layout — estructura fija

- Lienzo: 1080×1620 (siempre, es el ratio de IG/TikTok story)
- Logo arriba a la izquierda (220px ancho)
- Pill de fecha negra arriba a la derecha
- Título "¿QUÉ SE VIENE?" centrado con "VIENE?" en amarillo
- 5 cards verticales (v1 a v5)
- Footer con firma "DISTINTO · AGENCIA" + URL

### Variantes de cards (v1 a v5) — no cambiar el orden

- `v1` → blanca borde gris (visual neutro)
- `v2` → fondo gris claro (visual de pausa)
- `v3` → **AMARILLA STATEMENT** (la pieza más importante de la semana)
- `v4` → blanca borde negro (visual destacado)
- `v5` → fondo gris claro (visual de cierre)

⚠️ **El amarillo solo puede aparecer en UNA card por grilla**. Si la
semana no tiene oferta/promo, mover la `v3` a la pieza más importante.

### Footer de Distinto — fijo

La firma `DISTINTO · AGENCIA` con el logo morado+mostaza y la URL
`www.agenciadistinto.com` NO se modifican. Es la firma fija de la
agencia, no del cliente.

---

## 🛠️ Cómo exportar a PNG

1. Abrir `plantilla-grilla-lozano.html` en Google Chrome
2. Asegurarse que `lozano-logo.png` esté en la misma carpeta
3. F12 → Cmd+Shift+P → escribir "Capture full size screenshot"
4. Chrome descarga PNG 1080×1620 listo para subir

Alternativa: usar la extensión "GoFullPage" de Chrome.

---

## 🔄 Flujo de trabajo recomendado

1. **Lunes 9:00 am** — revisar grilla fit en Notion para la semana
2. Abrir esta plantilla, editar solo lo permitido (ver arriba)
3. Exportar PNG
4. Subir a la carpeta de POSTS semanales de Lozano
5. Programar en IG/TikTok/FB con la hora correspondiente

---

## ❓ FAQ

**¿Puedo cambiar el amarillo por otro tono?**
No. El #DCC32C viene del manual oficial. Si la pieza necesita otro
acento, usar negro o gris (también del manual). Nunca otros colores.

**¿Puedo agregar una 6ta card?**
No. La estructura es de 5 cards. Si hay 6 publicaciones la semana,
agrupar 2 en una sola card o discutir con el responsable de diseño.

**¿Puedo usar el logo blanco sobre amarillo?**
Sí, está documentado en el manual (B.01 versión 4). Pero para esta
plantilla específica usamos el logo color sobre blanco para máximo
contraste y lectura.

**¿Puedo cambiar la tipografía Bebas Neue por otra fuente?**
No. Bebas Neue es el sustituto OSS oficial de Opificio Neue. Si más
adelante se compra licencia de Opificio Neue, se reemplaza en el CSS
solo el valor de `--display`.

---

Plantilla creada por Agencia Distinto · 2026
