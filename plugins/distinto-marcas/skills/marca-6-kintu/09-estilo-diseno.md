# 09 · ESTILO DE DISEÑO — Kintu Essential Oils

> 🎨 **Referencia visual canónica para piezas de Kintu**.
> Definido el 22 may 2026 combinando piezas reales del Drive cliente.
> 📌 Esta es la guía visual real que reemplaza cualquier inferencia previa.

---

## 🖼️ Referencias visuales aprobadas

Las piezas canónicas que definen el estilo son:

1. **Carrusel "¿Por qué nace Kintu? · CANSADAS de vivir aceleradas"**
   Path: `1. GESTIÓN/CUENTAS/6. Kintu/01 - IDENTIDAD DE MARCA/CARRUSELES/CARRUSEL 3/CARRUSELES-KINTU-2_01.jpg`
   Lo que define: **firma visual = tarjeta verde profundo + texto blanco extrabold uppercase** ("CANSADAS"). Hojas reales, formas orgánicas verde-menta translúcidas, tipografía mixta Montserrat + script ocasional.

2. **Historia destacada Kit 2026 — planta line-art blanca sobre verde profundo**
   Path: `01 - IDENTIDAD DE MARCA/KIT DE MARCA 2026/HISTORIAS DESTACADAS/Mesa de trabajo 4 copia 3-100.jpg`
   Lo que define: ilustración botánica line-art como elemento decorativo. Verde profundo de fondo permitido.

3. **Carrusel "Antes de estudiar o trabajar"** (RollOn Focus)
   Path: `01 - IDENTIDAD DE MARCA/CARRUSELES/CARRUSEL 4/Mesa de trabajo 2.jpg`
   Lo que define: foto lifestyle + texto overlay + isotipo botánico semi-translúcido como marca de agua + firma visual "tarjeta verde profundo".

**Implementación de referencia** (código): `app/lib/grilla/styles/wellness-organic.ts` en el repo `distinto-marcas-skills`.

---

## 🎯 Filosofía del estilo

**Editorial Wellness Consciente · Clean + Orgánico · NO Esotérico**

- **Mood**: editorial wellness limpio con detalles orgánicos sutiles. Pieza premium sin caer en boutique mística.
- **No es**: esotérico, charlatán, "limpia auras", spa luxury europeo, milagroso, cursi-spiritual.
- **Cliente arquetípico al que apunta**: Camila (profesional 30s estresada). Mujer educada que valora wellness real, no marketing místico.
- **Es el opuesto** de Distri Fitness (cinematográfico dark + gym hardcore) y de Little Joe (cute italiano playful).

---

## 🌿 Sistema visual canónico

### Background

| Capa | Tratamiento |
|---|---|
| **Color base** | `#F8FBF5` (casi blanco con tinte verdoso muy sutil) o gradiente `linear-gradient(180deg, #FFFFFF 0%, #F8FBF5 100%)`. **NUNCA fondo oscuro/saturado** — Kintu vive en luz. |
| **Formas orgánicas amorfas** | SVG paths irregulares con `fill: rgba(187,224,205,0.28-0.35)` (verde menta translúcido), posicionadas en esquinas opuestas con `filter: blur(1px)`. Son el "mood" — manchas curvas que evocan plantas/agua sin ser figurativas. |
| **Hojas decorativas** | SVG line-art verde Kintu (`stroke: rgba(69,183,135,0.32)`, `fill: rgba(69,183,135,0.16)`) en esquinas. Hojas estilizadas tipo "monstera" o palmera. Mantener sutiles, no protagonistas. |
| **Brotes pequeños** | SVG sprout (tallo + hojas asimétricas) como detalle ocasional. Verde Kintu suave. |
| **Línea punteada curva** | Recurso visual del carrusel CANSADAS — `stroke-dasharray: 3,8` verde Kintu, conectando elementos. |

### Paleta (verificada manual oficial)

| Color | Hex | Rol |
|---|---|---|
| Blanco | `#FFFFFF` | Card bg, contraste |
| **Verde menta** | **`#BBE0CD`** | Formas orgánicas, fondos suaves, divider |
| **Verde Kintu** | **`#45B787`** | Acentos secundarios, plataformas en cards, hojas SVG, primera letra de hero |
| **Verde profundo** | **`#1A3E42`** | Texto principal + **firma visual (tarjetas + day card)** |
| Crema verdoso | `#F8FBF5` | Canvas base |

> ⚠️ **Regla dura**: NUNCA usar morados, dorados fuertes, tonos medicinales externos. Verdes como sistema cerrado.

---

## ✏️ Sistema tipográfico CANÓNICO

**Solo Montserrat** (manual oficial pág. 7 — NO Cormorant, NO serif, NO script decorativas).

```
https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap
```

| Rol | Familia + peso | Aplicación |
|---|---|---|
| Hero / Titulares | Montserrat 800 (ExtraBold) | "Tu semana en calma" 96px |
| Firma visual (tarjeta verde profundo) | Montserrat 800-900 | "CANSADAS", DD en cards, date pill |
| Subtítulos | Montserrat 600 (SemiBold) | Card titles, meta labels |
| Tagline / micro | Montserrat 500 + tracking 3-5px uppercase | Plataformas, sub hero, URL footer |
| Cuerpo (cuando aplica) | Montserrat 500 (Medium) | Descripciones |

**Opcional (referencia carrusel)**: script cursiva (`Caveat`, `Sacramento`, `Lemon Tuesday`) en VERDE MENTA para palabras destacadas dentro de un texto. **Uso muy limitado** — máximo 1 palabra por pieza. En la grilla NO se usa.

---

## 🎨 Componentes / patrones visuales

### 🟢 FIRMA VISUAL — Tarjeta verde profundo + texto blanco extrabold

Es el patrón de identidad más importante de Kintu, **espejo del bloque "CANSADAS"** en el carrusel canónico. Se usa para:
- Date pill (en el header)
- Day cell (DD) dentro de cada day card
- Cualquier label crítico que necesite jerarquía máxima

```css
background: #1A3E42;
color: #FFFFFF;
font-family: 'Montserrat', sans-serif;
font-weight: 800-900;
letter-spacing: 2.5px;
text-transform: uppercase;
padding: 12-14px 16-28px;
border-radius: 4-10px;
box-shadow: 0 8px 22px rgba(26,62,66,0.18);
```

### Cards blancas con day en tarjeta verde

Espejo del bloque CANSADAS aplicado a cada card de día:

```css
.card {
  background: #FFFFFF;
  border-radius: 14px;
  border: none;
  box-shadow: 0 4px 18px rgba(26,62,66,0.08), 0 0 0 1px rgba(69,183,135,0.10);
  padding: 16px 22px;
  display: flex;
  gap: 22px;
}
.card .date {
  background: #1A3E42;
  color: #FFFFFF;
  padding: 12px 16px;
  border-radius: 10px;
  text-align: center;
}
.card .date .day {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 50px;
  color: #FFFFFF;
}
.card .date .month {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  letter-spacing: 3px;
  color: #BBE0CD;  /* Verde menta light para el mes */
  font-size: 11px;
}
```

### Cards empty (sin publicación)

Más sutiles, fondo blanco translúcido, dashed verde Kintu:

```css
.card.empty {
  background: rgba(255,255,255,0.55);
  border: 1.5px dashed rgba(69,183,135,0.30);
  box-shadow: none;
}
.card.empty .date {
  background: #BBE0CD;  /* Verde menta clarito (no verde profundo) */
  opacity: 0.6;
}
```

### Hero text con primera letra accent

```css
.hero h1 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 96px;
  letter-spacing: -3px;
  color: #1A3E42;
}
.hero h1::first-letter {
  color: #45B787;  /* Verde Kintu — acento sutil */
}
```

### Logos

#### Logo Kintu (header)

- **Asset**: `app/public/marcas/kintu/logo.svg`
- **viewBox crítico**: `"255 460 571 161"` (tight crop — bbox real x=265 y=470 w=551 h=141).
- **Aspect real**: 3.55:1 (banner horizontal). NO es cuadrado como sugiere el SVG raw.
- **Modo**: POSITIVO (verde profundo sobre blanco — manual oficial).
- **Sin filter CSS** porque el canvas es claro.
- **Dimensiones recomendadas**: `width: 320px; height: 90px`.
- **Posición**: pegado al borde izquierdo del header (`object-position: left center`).

#### Logo Distinto Agencia (footer)

- **Color original** (morado + amarillo + negro) sobre canvas claro.
- **Sin filter** (a diferencia de DF donde íbamos en negativo).
- **Dimensiones**: `height: 64px; max-width: 380px`.
- `filter: drop-shadow(0 3px 10px rgba(26,62,66,0.10))` para presencia sutil.

### Date pill (firma verde profundo)

```css
.date-pill {
  background: #1A3E42;
  color: #FFFFFF;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  padding: 14px 28px;
  border-radius: 4px;
  box-shadow: 0 8px 22px rgba(26,62,66,0.18);
}
```

### Divider editorial

```css
.line { background: #BBE0CD; height: 2px; width: 100px; }
.dot {
  width: 10px; height: 10px;
  background: #45B787;
  border-radius: 0 100% 0 100%;  /* forma de hojita */
  transform: rotate(-45deg);
}
```

---

## 🚫 Reglas duras (lo que NO va)

- ❌ Fondo dark/oscuro (Kintu vive en luz)
- ❌ Cormorant Garamond u otra serif decorativa (manual: Montserrat estricto)
- ❌ Tonos morados, dorados, rosa fuerte (paleta cerrada en verdes + blanco)
- ❌ Esoterismo visual (símbolos místicos, mandalas, chakras)
- ❌ Texto blanco fino sobre fondo claro (sin contraste)
- ❌ Tagline frase comercial en footer (mantener minimalista)
- ❌ Logo Kintu encerrado en wrapper blanco (canvas ya es blanco)
- ❌ Wordmark "kintu" duplicando lo que el logo ya dice (display:none al brand-name)
- ❌ Hojas line-art muy gruesas o saturadas (mantener sutiles)
- ❌ Formas orgánicas con colores fuera de paleta (solo verde menta translúcido)
- ❌ Border-radius 0 en cards (rompe el feel orgánico — usar 10-14px)

---

## 🔁 Cómo replicar este estilo en otras piezas

Cuando se diseñe **cualquier** pieza para Kintu (post IG, carrusel, story, banner web, grilla):

1. **Background**: blanco/crema con tint verdoso (`#F8FBF5`) + formas orgánicas verde-menta translúcidas
2. **Hojas SVG line-art** + brotes + (opcional) línea punteada curva como decoración
3. **Tipografía**: SOLO Montserrat (300-900 según jerarquía)
4. **Firma visual = tarjeta verde profundo `#1A3E42` + texto blanco extrabold uppercase** para énfasis crítico
5. **Verde Kintu `#45B787`** para acentos secundarios (plataformas, hojas, primera letra hero)
6. **Verde menta `#BBE0CD`** para formas suaves, dividers, date de empty cards
7. **Logo Kintu en positivo** (verde sobre blanco) sin wrapper
8. **Logo Distinto en color original** (no negativo — el canvas es claro)
9. **Cards blancas radius 14px** con day en tarjeta verde profundo
10. **Sin tagline frase** en footer (mantener clean)

---

## 📐 Tamaño y proporción de pieza

- **Grilla semanal**: 1080×1620px (formato vertical 2:3, optimizado feed IG)
- **Post cuadrado**: 1080×1080px
- **Story**: 1080×1920px
- **Carrusel**: 1080×1350px (vertical 4:5) o 1080×1080 cuadrado

---

## 📎 Referencias internas

- 🎨 Brand book oficial extract: `assets/brand-book-extract.md`
- 🎨 Colores y fuentes: `assets/colores-fuentes.txt`
- 🎨 Manual PDF: `assets/manual-pdf/KINTU-BRANDING.pdf`
- 🎙️ Voz: `01-marca.md`
- 👥 Audiencia: `02-audiencia.md`
- 🚦 Rubric ON/OFF: `07-rubric.md`
- 🧱 Implementación referencia (grilla v2): `app/lib/grilla/styles/wellness-organic.ts` en `distinto-marcas-skills`

---

## 📝 Histórico de iteraciones

| Versión | Cambio | Aprendizaje |
|---|---|---|
| v1 (sesión previa) | Montserrat estricto + hojas SVG + cards blancas básicas + date pill verde Kintu (menta-ish) | Faltaba la firma visual editorial. Cards genéricas sin jerarquía Kintu. |
| **v2 (22 may 2026)** | **Tarjeta verde profundo en date pill + day cells (firma "CANSADAS")** + viewBox tight del logo + brand-name oculto + tagline eliminado + organic blobs verde-menta + sprouts + dot-line + hojas más sutiles | La firma visual Kintu es el bloque verde profundo extrabold blanco (carrusel CANSADAS) — replicarla en cada componente da identidad inmediata. |

## 🎓 Lecciones aprendidas (para futuras piezas Kintu)

1. **La firma visual de Kintu NO es el verde Kintu medio (`#45B787`)** sino el **verde profundo `#1A3E42` como tarjeta con texto blanco extrabold uppercase**. Espejo del bloque "CANSADAS" en el carrusel canónico. Se replica en date pill + day cells.

2. **El verde Kintu medio es ACENTO secundario**, no protagonista. Para plataformas/meta de cards, hojas, primera letra hero. NO para fondos de tarjeta.

3. **Las formas orgánicas verde-menta translúcidas** son el "mood" de fondo — manchas curvas amorfas (SVG paths irregulares), NO círculos perfectos NI cuadrados. Filter blur 1px da sensación de acuarela.

4. **Hojas SVG line-art** son mejor que hojas reales (foto PNG) para la grilla — más livianas (~3KB), escalan perfecto, son consistentes. Las fotos reales se reservan para piezas product/lifestyle.

5. **El logo Kintu es banner horizontal aspect 3.55:1**, no cuadrado. Verificar con `getBBox()` runtime antes de asumir dimensiones (aprendizaje del proceso DF).

6. **Logo Distinto en footer va en color original**, sin filter — porque el canvas Kintu es claro, el morado+amarillo del logo Distinto se ve bien sobre blanco. (En DF iba en negativo blanco porque era dark.)

7. **El detalle del hero "::first-letter color: #45B787"** funciona como acento sutil sin distraer. Si se quiere más drama, ampliar a palabra completa con `<span>`.

8. **Empty cards merecen tarjeta verde menta** (no verde profundo) para diferenciarlas visualmente sin perder el patrón. Opacity 0.6 + dashed border completa el "no programado".

9. **NUNCA agregar tagline frase comercial** ("Cuidarte de forma simple…") en footer — aprendizaje de DF aplicado aquí. El logo + URL alcanzan.

10. **Composición Kintu = aire generoso + decoraciones sutiles**, NO densidad alta. Es lo opuesto a DF (smoke saturado + chips densos).
