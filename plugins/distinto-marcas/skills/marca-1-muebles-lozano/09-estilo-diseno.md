# 09 · ESTILO DE DISEÑO — Muebles Lozano SAC

> 🎨 **Referencia visual canónica para piezas de Lozano**.
> Definido el 22 may 2026 a partir del post "Día de la Madre 2026" + manual 2019.
> 📌 Esta es la guía visual real que reemplaza cualquier inferencia previa.

---

## 🖼️ Referencias visuales aprobadas

1. **Post Día de la Madre 2026** (la pieza canónica del estilo aplicado)
   Path: `dia-de-la-madre-2026/post-dia-de-la-madre-2026.png`
   Lo que define: **canvas negro `#0C0C12` + serif italic Playfair delgada blanco + última palabra en amarillo dorado + sans uppercase tracking ancho para labels + barra amarilla vertical pequeña + underline amarillo bajo el label de fecha**.

2. **Manual de Identidad Corporativa 2019** (Logos Perú)
   Path: `assets/manual-pdf/MUEBLES-LOZANO-MANUAL-IDENTIDAD-CORPORATIVA.pdf` (19 págs)
   Lo que define: paleta oficial (`#DCC32C` amarillo + `#0C0C12` negro + `#FFFFFF`), logo en 6 versiones, regla "Opificio Neue NO tiene bold (usar borde)".

**Implementación de referencia** (código): `app/lib/grilla/styles/artisan-craft.ts` en `distinto-marcas-skills`.

---

## 🎯 Filosofía del estilo

**Editorial Elegante Dark Luxury — Magazine de Interiorismo Premium**

- **Mood**: pieza editorial de revista de diseño de interiores premium. Confianza + oficio + elegancia atemporal.
- **No es**: industrial-blueprint, gym hardcore, wellness orgánico, mass market retail, IKEA flat.
- **Cliente arquetípico**: familia/oficina que quiere mueble a medida sin pagar boutique de diseño. Busca confiar en el oficio.
- **Es lo opuesto** del estilo industrial Oswald-blueprint (mi v1 inicial). La marca es **luxury sobria**.

---

## 🌑 Sistema visual canónico

### Background — NEGRO oficial

| Capa | Tratamiento |
|---|---|
| **Color base** | `#0C0C12` (negro oficial del manual, NO `#000000` puro — tiene tinte azulado sutil) |
| **Glow dorado central** | `radial-gradient(ellipse 900px 700px at 50% 35%, rgba(220,195,44,0.06) 0%, transparent 70%)` — profundidad sin saturar |
| **Barras amarillas verticales** | 2 barras 3px ancho × ~700px alto con `box-shadow: glow amarillo`. Top-left + bottom-right (firma visual editorial luxury) |

### Paleta canónica (manual oficial pág. 6)

| Color | Hex | Rol |
|---|---|---|
| **Negro azulado** | **`#0C0C12`** | Canvas base, texto sobre claro |
| **Amarillo dorado** | **`#DCC32C`** | Acentos, palabras destacadas, barras firma, borders, sub labels |
| Amarillo suave | `#F4E180` | Highlights derivados (poco uso) |
| **Blanco** | **`#FFFFFF`** | Cards, texto principal sobre dark |
| Gris muy claro | `#FAFAFA` | Cards alternas |

> ⚠️ **Regla dura del manual**: NUNCA usar opacidades del logo, NO deformar, NO cambiar colores. NO usar amarillo limón (es dorado mostaza). NO bold en Opificio Neue (usar borde).

---

## ✏️ Sistema tipográfico CANÓNICO

| Rol | Familia | Peso | Aplicación |
|---|---|---|---|
| **Hero / Display** | **Playfair Display** italic | 500 | "Esta semana" 124px blanco italic — espejo del "un lugar / único." del post DM |
| **Card titles** | Playfair Display italic | 500 | "Closet a medida" 26px dark sobre card blanca |
| **DD en card** | Playfair Display italic | 600 | 56px dorado |
| **Brand-name big** | Playfair Display | 500 | "MUEBLES LOZANO" 36px tracking 5px uppercase blanco |
| **Date pill / sub hero** | Inter | 500-600 | Tracking 3-4px uppercase amarillo + underline 2px amarillo |
| **Brand-name small** | Inter | 500 | "MUEBLES A MEDIDA · LIMA, PERÚ" tracking 3px uppercase blanco opacity 0.55 |
| **Card meta** | Inter | 600 | Plataformas tracking 2.5px uppercase gris |
| **Card "month"** | Inter | 600 | "LUN/MAR/MIE" tracking 3px uppercase dark opacity 0.55 |

> 💡 **Opificio Neue oficial NO tiene bold** — para el "MUEBLES LOZANO" del header usamos Playfair Display medio (500) con tracking ancho para evocar la misma elegancia sin pedir bold.

```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&display=swap
```

---

## 🎨 Componentes / patrones visuales

### 🟡 FIRMA VISUAL — Barras amarillas verticales pequeñas

Es la marca editorial luxury. Aparece en el post DM como **barra vertical amarilla pequeña** al lado del "MUEBLES LOZANO". En grilla la replicamos en bordes del poster:

```css
.bar-firma {
  position: absolute; width: 3px; background: #DCC32C;
  box-shadow: 0 0 12px rgba(220,195,44,0.4);
}
.bar-firma.top { top: 70px; bottom: 50%; left: 60px; }
.bar-firma.bottom { top: 50%; bottom: 70px; right: 60px; }
```

### Date pill / labels — Sans uppercase + underline amarillo

Espejo del "DÍA DE LA MADRE · 2026" del post DM:

```css
.label-firma {
  background: transparent;
  color: #DCC32C;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 8px 0;
  border-bottom: 2px solid #DCC32C;
}
```

### Hero text editorial (espejo "un lugar / único.")

```css
.hero h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: 124px;
  letter-spacing: -2px;
  line-height: 0.95;
  color: #FFFFFF;
}
```

### Cards blancas con title serif italic

```css
.card {
  background: #FFFFFF;
  border-radius: 2px;
  border-left: 4px solid #DCC32C;
  box-shadow: 0 8px 30px rgba(0,0,0,0.55);
}
.card .date .day {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 600;
  font-size: 56px;
  color: #DCC32C;
}
.card .body .title {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: 26px;
  color: #0C0C12;
}
```

### Logos

#### Logo Muebles Lozano (header)

- **Asset**: `app/public/marcas/lozano/logo.svg`
- **viewBox tight**: `"177 206 726 668"` (bbox real getBBox: x=189 y=218 w=702 h=644).
- **Aspect real**: 1.09:1 (**casi cuadrado** — isotipo casa+ML arriba + wordmark + subtitle debajo).
- **Filter**: el logo SVG es negro+amarillo sobre transparente. Sobre canvas negro el negro desaparece. Filter convierte el negro a blanco/amarillo dorado:
  ```css
  filter: brightness(0) invert(1) sepia(0.5) saturate(2.5) hue-rotate(5deg);
  ```
- **Dimensiones**: `width: 100px; height: 92px` (proporcional al aspect, pequeño para no competir con brand-name texto).
- **Sin wrapper**: `logoBg: transparent; logoPad: 0`.

#### Logo Distinto Agencia (footer)

- **En NEGATIVO** sobre el dark:
  ```css
  filter: drop-shadow(0 3px 14px rgba(255,255,255,0.15)) brightness(0) invert(1);
  ```
- **Dimensiones**: `height: 70px; max-width: 420px`.

### Footer

- **NO tagline** frase comercial
- **URL = handle IG** `@muebleslozanosac` en amarillo dorado lowercase tracking
- **Logo Distinto en negativo blanco**

---

## 🚫 Reglas duras (lo que NO va)

- ❌ Fondo blanco/crema como base (el post DM y el feed real son DARK)
- ❌ Negro puro `#000000` (manual dice `#0C0C12` con tinte azulado)
- ❌ Oswald display masivo (era v1 — la marca NO es industrial-blueprint)
- ❌ Reglas/marcas técnicas estilo blueprint (era v1 — luxury no técnico)
- ❌ Bebas Neue / Anton (fuentes condensed industrial)
- ❌ Amarillo limón (es dorado mostaza `#DCC32C`)
- ❌ Combinar amarillo con rojo/naranja/morado (manual: solo con negro y blanco)
- ❌ "Stock", "barato", "garantizado sin condiciones" — palabras vetadas voz
- ❌ Renders 3D, fotos stock genéricas
- ❌ Tagline frase comercial en footer

---

## 🔁 Cómo replicar este estilo en otras piezas

Cuando se diseñe **cualquier** pieza para Lozano:

1. **Background**: negro oficial `#0C0C12` + glow dorado sutil central
2. **Barras amarillas verticales pequeñas** como firma visual (al menos una)
3. **Tipografía hero**: Playfair Display italic 500 — espejo del "un lugar / único."
4. **Última palabra del hero en amarillo dorado** (técnica "two-color hero" del post DM)
5. **Labels**: Inter 600 uppercase tracking 3-4px amarillo + underline amarillo
6. **Cards/paneles blancos** con border-left amarillo + title Playfair italic
7. **DD en Playfair italic dorado** grande
8. **Logo con filter sepia-hue-rotate** sobre dark
9. **Logo Distinto en negativo** blanco
10. **Footer URL = handle IG** `@muebleslozanosac`

---

## 📐 Tamaño y proporción de pieza

- **Grilla semanal**: 1080×1620px (formato vertical 2:3)
- **Post cuadrado**: 1080×1080px (referencia post DM)
- **Story**: 1080×1920px
- **Carrusel**: 1080×1350px (vertical 4:5)

---

## 📎 Referencias internas

- 📄 **Manual de Identidad Corporativa 2019** (Logos Perú, 19 págs): `assets/manual-pdf/MUEBLES-LOZANO-MANUAL-IDENTIDAD-CORPORATIVA.pdf`
- 🎨 Brand book extract: `assets/brand-book-extract.md`
- 🎨 Colores y fuentes: `assets/colores-fuentes.txt`
- 🎙️ Voz: `01-marca.md`
- 👥 Audiencia: `02-audiencia.md`
- 🚦 Rubric ON/OFF: `07-rubric.md`
- 🧱 Implementación referencia (grilla v2): `app/lib/grilla/styles/artisan-craft.ts` en `distinto-marcas-skills`

---

## 📝 Histórico de iteraciones

| Versión | Cambio | Aprendizaje |
|---|---|---|
| v1 (sesión previa) | Oswald display industrial + canvas crema + reglas técnicas + barras top/bottom blueprint | OFF-BRAND. La marca es luxury editorial dark, no industrial blueprint. El manual dice "seriedad + formalidad + fuerza + confianza" — eso se logra con Playfair italic + dark + amarillo dorado, no con Oswald + crema. |
| **v2 (22 may 2026)** | **Canvas negro `#0C0C12` + serif Playfair italic 124px + amarillo dorado acento + barras verticales pequeñas + cards blancas con DD italic dorado + Brand-name visible "MUEBLES LOZANO" Playfair tracking ancho** | El post Día de la Madre 2026 mostró el estilo real aplicado por el equipo del cliente. Replicar fielmente: editorial dark luxury. |

## 🎓 Lecciones aprendidas (para futuras piezas Lozano)

1. **Lozano NO es industrial-blueprint**. Mi v1 estaba completamente off-brand. La marca es **editorial dark luxury** — magazine de interiorismo premium.

2. **Playfair Display italic 500** es la fuente serif clave (sustituto OSS legítimo de Opificio Neue + agrega elegancia italic). El manual dice "Opificio Neue NO tiene bold" — usamos Playfair medio 500 italic con tracking ancho para evocar la misma elegancia sin pedir bold.

3. **El post DM tiene 2 técnicas de tipografía críticas**:
   - Hero serif italic blanco + palabra destacada AMARILLA (ej: "un lugar / único.")
   - Labels sans uppercase tracking + underline amarillo (ej: "DÍA DE LA MADRE · 2026")
   Ambas se replican en la grilla.

4. **Barras amarillas verticales pequeñas** (3-4px) son la firma editorial luxury. Una al lado del header, otra abajo del footer. NO usar barras gruesas (no son chips de DF — son finas y elegantes).

5. **Filter del logo**: `brightness(0) invert(1) sepia(0.5) saturate(2.5) hue-rotate(5deg)` convierte el negro+amarillo del logo a blanco con tinte dorado sobre dark. Sin el sepia-hue-rotate quedaría blanco puro y perdería el alma dorada de Lozano.

6. **Brand-name VISIBLE en header** (vs Kintu/LV/DF donde lo ocultamos). Razón: el post DM canónico muestra el wordmark "MUEBLES LOZANO" prominente arriba — es parte de la identidad editorial. Lo conservamos.

7. **Date pill = sans uppercase con underline amarillo** (no chip relleno, no pill border completo). Espejo del "DÍA DE LA MADRE · 2026".

8. **DD en cards = Playfair italic dorado** (no blanco, no negro). El número del día funciona como acento secundario que pinta de oro la card.

9. **Cards blancas con title Playfair italic 500 dark** + meta Inter uppercase tracking gris = jerarquía editorial. NO usar bold en title (Playfair italic medio basta).

10. **Footer URL = handle IG `@muebleslozanosac`** (espejo del cierre del post DM). El brochure no tiene domain web propio — el handle IG es la firma de contacto digital real.
