# 09 · ESTILO DE DISEÑO — La Victoria · Distribuidora de Pino

> 🎨 **Referencia visual canónica para piezas de La Victoria**.
> Definido el 22 may 2026 a partir del brochure 2025 + pieza Día del Trabajador.
> 📌 Esta es la guía visual real que reemplaza cualquier inferencia previa.

---

## 🖼️ Referencias visuales aprobadas

Las piezas canónicas que definen el estilo son:

1. **Post Día del Trabajador**
   Path: `01 - IDENTIDAD DE MARCA/POST DISEÑOS/DIA DEL TRABAJADOR/Mesa de trabajo 2 copia 4-100.jpg`
   Lo que define: **firma visual = pill con em-dashes "— TEXTO —"** ("— FELIZ DÍA DEL TRABAJADOR —"). Fondo full bleed foto del taller con overlay verde bosque. Hero "EN ESTE DÍA / DEL TRABAJADOR" en serif moderna semibold ALL CAPS blanco gigante + serif italic delgado. Logo La Victoria al pie.

2. **Historia destacada — trozo madera ilustrado**
   Path: `07 - STORIES/HISTORIAS DESTACADAS/Mesa de trabajo 1-100.jpg`
   Lo que define: **fondo verde bosque profundo** con ilustración **line-art crema/beige** detallada (trozo de madera con anillo). Color crema oficial = `#F5EDD8`.

3. **Brochure La Victoria 2025**
   Path: `assets/catalogos-pdf/BROCHURE-LA-VICTORIA.pdf` (10 páginas, alta calidad)
   Lo que define: composición editorial — mucho espacio negativo + bloques verdes para títulos + tablas crema + checks verdes circle-open + fotos full bleed.

**Implementación de referencia** (código): `app/lib/grilla/styles/wood-industrial.ts` en el repo `distinto-marcas-skills`.

---

## 🎯 Filosofía del estilo

**Profesional Industrial Cinematográfico B2B**

- **Mood**: pieza editorial dark de autoridad industrial — verde bosque profundo es el "escenario", elementos crema son la "información". Confianza + respaldo + 15 años de experiencia.
- **No es**: callejero, meme, ofertón, casual, boutique deco, lifestyle wellness, mass market retail.
- **Cliente arquetípico**: Roberto (jefe de planta mueblería 40-55 años) + Carlos (fabricante pallets para exportadora) + Andrea (jefe compras agroexportadora). B2B serio.
- **Es lo opuesto** del estilo wellness/spa (Kintu) o gym hardcore (Distri Fitness). Más cerca de DF en cinematografía dark, pero con verde bosque sólido en vez de smoke naranja, y autoridad industrial en vez de energía gym.

---

## 🌑 Sistema visual canónico

### Background — VERDE BOSQUE DARK + textura sutil

| Capa | Tratamiento |
|---|---|
| **Color base** | Radial gradient `radial-gradient(ellipse at 50% 30%, #0F3D2A 0%, #0A2A1F 60%, #051811 100%)`. El centro es más claro (foco) y los bordes oscurecen. |
| **Overlay madera dorada** | `radial-gradient(ellipse 800px 600px at 50% 80%, rgba(139,111,71,0.10) 0%, transparent 70%)` — sugiere calidez de madera sin saturar. |
| **Vetas madera SVG** | Paths horizontales sutiles con `stroke: rgba(245,237,216,0.04-0.06)`, repetidas vía `<pattern>`. Textura de madera fina, no protagonista. |
| **Vignettes top/bottom** | `linear-gradient` oscurece bordes superior (240px) e inferior (220px) — foco al contenido central. |
| **Marcas esquineras** | 4 corner-mark de 38×38px con borde crema `rgba(245,237,216,0.4)` 1.5px — sensación de certificación industrial. |

### Paleta (refinada vs brochure)

| Color | Hex | Rol |
|---|---|---|
| **Verde bosque dark** | **`#0A2A1F`** | Canvas base, card-date chip |
| Verde bosque medio | `#0F3D2A` | Centro del radial gradient |
| Verde bosque negro | `#051811` | Bordes del gradient |
| **Crema madera** | **`#F5EDD8`** | Texto sobre dark (primary), logo en color invertido — el color del logo en negativo oficial |
| **Madera dorada** | **`#C9A87A`** | Acentos secundarios (em-dashes, sub hero italic, plataformas) |
| Marrón madera | `#8B6F47` | Acentos terciarios (highlight) |
| **Card blanco crema** | **`#FFFCEB`** | Cards de día (paneles editoriales sobre dark) |
| Card alterno | `#F2E8D0` | Cards alternas |
| Texto dark sobre card | `#0A2A1F` | Title de cards |

> ⚠️ **Regla dura**: NUNCA usar `#000000` puro. El "negro" de La Victoria es el verde bosque muy oscuro `#0A2A1F`.

---

## ✏️ Sistema tipográfico CANÓNICO

| Rol | Familia | Peso | Aplicación |
|---|---|---|---|
| **Hero / Display** | **Playfair Display** | 700 (Bold) | "ESTA SEMANA" ALL CAPS 124px crema — espejo del "EN ESTE DÍA" del post DT |
| **Sub hero / énfasis italic** | Playfair Display italic | 500-600 | "Mayo · Del lunes 18 al domingo 24" — espejo del "DEL TRABAJADOR" italic |
| **Card titles** | Playfair Display | 700 | "Tablas para pallets" 26px verde bosque dark sobre card crema |
| **Date pill / labels** | Inter | 600 (SemiBold) | Tracking 3-5px uppercase. Texto en pill con em-dashes |
| **Plataformas / meta** | Inter | 600 | Tracking 2.5px uppercase 11px marrón madera |
| **DD en card** | Playfair Display | 700 | 46px crema sobre chip verde bosque |
| **Mes (LUN/MAR/etc) en card** | Inter | 600 | 11px tracking 3px uppercase madera dorada |

```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&display=swap
```

---

## 🎨 Componentes / patrones visuales

### 🟢 FIRMA VISUAL — Pill con em-dashes "— TEXTO —"

Es el patrón de identidad más importante de La Victoria, **espejo del "— FELIZ DÍA DEL TRABAJADOR —"** en el post Día del Trabajador. Se usa para:
- Date pill (en el header)
- Footer URL / CTA (WhatsApp · 973 991 208)
- Cualquier label institucional que necesite el "punctuation gravitas"

```css
.pill-firma {
  background: transparent;
  color: #F5EDD8;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 12px 24px;
  border-radius: 999px;
  border: 1.5px solid rgba(245,237,216,0.45);
}
.pill-firma::before { content: '— '; color: #C9A87A; }
.pill-firma::after  { content: ' —'; color: #C9A87A; }
```

### Hero text editorial (espejo post DT)

```css
.hero h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: 124px;
  letter-spacing: -1px;
  line-height: 0.92;
  text-transform: uppercase;
  color: #F5EDD8;
}
.hero .sub {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: 20px;
  color: #C9A87A;
}
```

### Cards crema con day en chip verde bosque

```css
.card {
  background: #FFFCEB;
  border-radius: 4px;
  border-left: 5px solid #C9A87A;
  box-shadow: 0 8px 28px rgba(0,0,0,0.5);
  padding: 18px 26px;
  display: flex;
  gap: 22px;
}
.card .date {
  background: #0A2A1F;
  color: #F5EDD8;
  padding: 12px 18px;
  border-radius: 3px;
  text-align: center;
}
.card .date .day {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: 46px;
  color: #F5EDD8;
}
.card .body .title {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: 26px;
  color: #0A2A1F;
}
.card .body .meta {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #8B6F47;
}
```

### Marcas esquineras (certificación industrial)

```css
.corner-mark {
  position: absolute; width: 38px; height: 38px;
  border: 1.5px solid rgba(245,237,216,0.4);
}
.corner-mark.tl { top: 30px; left: 30px; border-right: none; border-bottom: none; }
.corner-mark.tr { top: 30px; right: 30px; border-left: none; border-bottom: none; }
.corner-mark.bl { bottom: 30px; left: 30px; border-right: none; border-top: none; }
.corner-mark.br { bottom: 30px; right: 30px; border-left: none; border-top: none; }
```

### Logos

#### Logo La Victoria (header)

- **Asset**: `app/public/marcas/la-victoria/logo.svg`
- **viewBox tight**: `"208 319 664 423"` (bbox real getBBox: x=220 y=331 w=640 h=399).
- **Aspect real**: 1.57:1 (**stack vertical** símbolo pino + wordmark — NO banner horizontal).
- **Modo**: el SVG es verde bosque oscuro. Sobre canvas dark requiere conversión a crema:
  ```css
  filter: brightness(0) invert(1) sepia(0.4) saturate(2) hue-rotate(-15deg);
  ```
  Esto convierte el verde a crema/dorado pálido visible sobre verde bosque dark.
- **Dimensiones**: `width: 180px; height: 115px` (proporcional al aspect).
- **Sin wrapper**: `logoBg: transparent; logoPad: 0` (flota sobre canvas).

#### Logo Distinto Agencia (footer)

- **En NEGATIVO** sobre el verde bosque dark:
  ```css
  filter: drop-shadow(0 3px 14px rgba(245,237,216,0.18)) brightness(0) invert(1);
  ```
- **Dimensiones**: `height: 72px; max-width: 420px`.

### Date pill (firma visual aplicada)

```css
.date-pill {
  background: transparent;
  color: #F5EDD8;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 12px 24px;
  border-radius: 999px;
  border: 1.5px solid rgba(245,237,216,0.45);
}
.date-pill::before { content: '— '; color: #C9A87A; }
.date-pill::after  { content: ' —'; color: #C9A87A; }
```

### Footer institucional

- **NO tagline** frase comercial
- **URL = WhatsApp comercial** `WHATSAPP · 973 991 208` con em-dashes (firma visual)
- **Logo Distinto en negativo**

---

## 🚫 Reglas duras (lo que NO va)

- ❌ Fondo blanco/crema como base (rompe el mood cinematográfico)
- ❌ Negro puro `#000000` (el "negro" LV es verde bosque #0A2A1F)
- ❌ Tag forzado "PREMIUM · 15 AÑOS" o similar (aprendizaje v1 — el brochure no lo usa)
- ❌ Fuentes serif italic excesivo (mantener semibold normal para titulares)
- ❌ Colores fuera de paleta: rosa, morado, naranja saturado, azul royal
- ❌ Memes / humor visual (audiencia B2B no premia)
- ❌ Fotos stock genéricas (la audiencia espera ver bodega/operarios reales)
- ❌ Frases tipo "REMATE", "OFERTA ÚNICA" (rompe valor B2B)
- ❌ Asociación a deforestación — siempre subrayar bosques REFORESTADOS
- ❌ Brand-name texto duplicando el logo (display:none)

---

## 🔁 Cómo replicar este estilo en otras piezas

Cuando se diseñe **cualquier** pieza para La Victoria (post IG, carrusel, story, banner web, grilla):

1. **Background**: verde bosque dark radial gradient `#0F3D2A → #0A2A1F → #051811`
2. **Overlay**: dorado warm sutil + vetas madera SVG + vignettes top/bottom
3. **Marcas esquineras** crema 38×38 borde 1.5px (certificación industrial)
4. **Tipografía display**: Playfair Display 700 ALL CAPS — espejo del "EN ESTE DÍA"
5. **Tipografía body**: Inter 600 tracking generoso uppercase
6. **Firma visual**: pill con em-dashes "— TEXTO —" (border crema + texto crema)
7. **Cards de información** en crema `#FFFCEB` con DD en chip verde bosque
8. **Crema `#F5EDD8`** para texto sobre dark (color del logo en negativo)
9. **Madera dorada `#C9A87A`** para acentos secundarios (em-dashes, italic sub)
10. **Logo La Victoria** con filter sepia-saturate-hue-rotate → crema dorado sobre dark
11. **Logo Distinto en negativo** (blanco/crema) en footer
12. **Sin tagline frase** + URL = WhatsApp con em-dashes

---

## 📐 Tamaño y proporción de pieza

- **Grilla semanal**: 1080×1620px (formato vertical 2:3)
- **Post cuadrado**: 1080×1080px (referencia post Día Trabajador)
- **Story**: 1080×1920px
- **Carrusel**: 1080×1350px

---

## 📎 Referencias internas

- 📄 **Brochure La Victoria 2025**: `assets/catalogos-pdf/BROCHURE-LA-VICTORIA.pdf`
- 📄 **Catálogo DEYJIM 2026**: `assets/catalogos-pdf/CATALOGO-2026-DEYJIM-ARMAZONES.pdf`
- 🎨 Brand book extract: `assets/brand-book-extract.md`
- 🎨 Colores y fuentes: `assets/colores-fuentes.txt`
- 🎙️ Voz: `01-marca.md`
- 👥 Audiencia (5 segmentos B2B): `02-audiencia.md`
- 🚦 Rubric ON/OFF: `07-rubric.md`
- 🧱 Implementación referencia (grilla v2): `app/lib/grilla/styles/wood-industrial.ts` en `distinto-marcas-skills`

---

## 📝 Histórico de iteraciones

| Versión | Cambio | Aprendizaje |
|---|---|---|
| v1 (sesión previa) | Canvas crema (#F2E8D0) + Playfair italic + vetas madera SVG + tag forzado "PREMIUM · 15 AÑOS" | El mood debía ser dark cinematográfico (post DT), no crema light. El tag PREMIUM era invención. |
| **v2 (22 may 2026)** | **Canvas verde bosque dark + cards crema + firma "— TEXTO —" + serif moderna semibold ALL CAPS + logo en filter sepia-cream + marcas esquineras industriales** | El verde bosque NO es accent — es el escenario protagonista. Las cards crema son el "papel" sobre el cual cae la información. Em-dashes son la firma visual editorial. |

## 🎓 Lecciones aprendidas (para futuras piezas La Victoria)

1. **El verde bosque es el ESCENARIO, no el accent**. Canvas dark verde bosque + cards crema = inversión correcta vs intuición inicial.

2. **Pill con em-dashes "— TEXTO —"** es la firma visual canónica de LV (no clip-path angular como DF, no tarjeta rectangular como Kintu). Aplicada en date pill + footer URL + cualquier label institucional.

3. **Playfair Display 700 ALL CAPS** funciona para hero porque la marca tiene autoridad serif (no es modern sans gym ni montserrat wellness). El post DT lo confirma — "EN ESTE DÍA" en serif semibold uppercase blanco.

4. **Filter para logo**: `brightness(0) invert(1) sepia(0.4) saturate(2) hue-rotate(-15deg)` convierte el verde bosque del logo a crema/dorado visible sobre dark. Sin el sepia+hue-rotate quedaría blanco puro y perdería el dorado madera.

5. **Crema `#F5EDD8`** es el color crítico — el del logo en negativo oficial + texto sobre dark + ilustraciones de historias destacadas. NO usar blanco puro `#FFFFFF` excepto en cards.

6. **Marcas esquineras corner-mark** dan sensación de certificación industrial (FSC, ISO, etc.) sin tener que mostrar logos de certificadoras reales.

7. **Vetas madera SVG sutiles via `<pattern>`** son mejor que vetas hardcoded — repiten sin esfuerzo, opacity baja (0.04-0.06).

8. **Vignettes top/bottom** críticos: cubren el dark con foco al contenido central. Sin ellos la pieza se ve plana.

9. **Footer URL = WhatsApp con em-dashes** (no domain web). El brochure dice que el WhatsApp 973 991 208 es el único CTA — usarlo respeta la realidad del cliente.

10. **NO tagline frase comercial** + brand-name texto oculto. El logo ya dice "LA VICTORIA · DISTRIBUIDORA DE PINO" — no duplicar.

11. **El logo es stack vertical aspect 1.57:1**, no banner horizontal como DF/Kintu. Eso afecta dimensiones (180×115 vs 400×83 de DF).

12. **Pino+círculo como "símbolo solo"** podría usarse como marca de agua decorativa en piezas (no en grilla, sí en posts/historias) — está documentado en `_DUPLICADOS_REVISAR/LA VICTORIA/FORMATO IMAGEN/ISOTIPO/`.
