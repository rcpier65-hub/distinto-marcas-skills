# 09 · ESTILO DE DISEÑO — Distribuidora Fitness Marketing

> 🎨 **Referencia visual canónica para piezas de DF**.
> Definido por Pedro a partir de pieza catálogo "Warrior Raw + Crunch" (22 may 2026).
> Aprobado en v8 el 22 may 2026 después de 8 iteraciones verificadas en browser real.
> 📌 Esta es la guía visual real que reemplaza cualquier inferencia previa.

---

## 🖼️ Referencia visual aprobada

**Imagen original**: catálogo Warrior x Distribuidora Fitness mostrando promos de
Warrior Raw + Crunch.
Archivada en `assets/referencias-visuales/`.

**Por qué es la referencia canónica**: Pedro la eligió como el estilo visual que define a DF.
Cualquier pieza que se haga para DF debe respetar este sistema visual.

**Implementación de referencia**: la grilla semanal v8 en
`app/lib/grilla/styles/gym-energy.ts` del repo `distinto-marcas-skills` aplica este
estilo correctamente. Si una pieza necesita ejemplo concreto de código → leer ese archivo.

---

## 🎯 Filosofía del estilo

**Cinematográfico · Dark · Editorial · Premium-gym**

- **Mood**: cartel premium de suplementación gym hardcore con jerarquía editorial.
- **No es**: light, friendly, wellness, corporate-clean, sci-fi, cyberpunk.
- **Cliente arquetípico al que apunta**: Diego (gym brother) — persona #1.
  El estilo se inclina hacia él. Andrea (fit girl) lee la pieza porque también va a gym,
  pero el lenguaje visual NO se diseña pensando en "friendly femenino".
- **Lo opuesto** del estilo wellness/spa (Kintu) o cute italiano (Little Joe).

---

## 🌑 Sistema visual canónico

### Background — DARK con HUMO + VIGNETTES

| Capa | Tratamiento |
|---|---|
| **Color base poster** | `#0D0D0D` (negro muy oscuro, NO negro puro #000) |
| **Capa "Fiery Red Smoke"** | Asset oficial `assets/elementos-graficos/Fiery Red Smoke.png` aplicado FULL pieza. **CSS**: `background-size: cover`, `background-position: center 40%`, `opacity: 0.78`, `mix-blend-mode: screen` (suma luminancia, hace que el humo naranja "ilumine" sobre el grafito). |
| **Capa darker** | Gradiente vertical `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.55) 100%)` que oscurece el arriba y abajo. |
| **Vignettes** | Top: `linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 100%)` altura 280px. Bottom: igual invertido altura 220px. Enfocan el contenido central. |
| **Acentos estructurales** | Líneas naranjas top y bottom del poster (4px alto, `box-shadow: 0 0 18px rgba(245,73,34,0.55)`). Top en `top: 22px`, bottom en `bottom: 10px` (importante: NO atravesar el logo del footer). |

### Paleta aplicada

| Color | Hex | Rol |
|---|---|---|
| Negro vignette | `#0D0D0D` | Base del poster, bordes oscuros |
| **Naranja DF** | **`#F54922`** | Chips, CTAs, día (DD) en cards, plataformas, líneas estructurales, acentos |
| Naranja brillante | `#FF6B45` | Variación (border alterno de cards) |
| **Card blanco** | `#FFFFFF` | Fondo de cards de día (paneles editoriales que rompen con el dark) |
| Card alterno | `#FAFAFA` | Cards alternas |
| **Texto dark sobre card** | `#1A1818` | Títulos en cards blancas |
| Texto blanco | `#FFFFFF` | Sobre el dark del poster (hero, brand-name si hubiera, footer tagline si hubiera) |

> ⚠️ Regla dura: **NUNCA usar `#000000` puro**. El manual dice `#333333` para texto cuerpo. En contextos de fondo full pieza, `#0D0D0D` o `#1A1818` están permitidos.

---

## ✏️ Sistema tipográfico FINAL

### Display / Headlines / Brand

- **Fuente OSS canónica**: **`Saira Condensed`** weight `900` italic
  (reemplaza Stretch Pro pago con fidelidad alta — condensed + italic + bold)
- **Fallback chain**: `'Saira Condensed', 'Bebas Neue', Impact, sans-serif`
- **Aplicaciones**: hero `158px`, brand name `58px` (si se usa), date pill `24px`, day (DD) en cards `72px`, card title `28px`.
- **Estilo**: siempre `italic` + `font-weight: 900` + `text-transform: uppercase` (excepto card titles que pueden ser size variable).

### Subtítulos / labels / cuerpo

- **Fuente OSS**: **`Inter`** weights 300-800.
- **Aplicaciones**: subtítulo hero, meta de cards (plataformas), URL footer, "DÍA SIN CONTENIDO" en empty cards.
- **Características**: `letter-spacing: 2-5px`, `text-transform: uppercase` en labels, `font-weight: 500-700` según jerarquía.

### Google Fonts URL completa

```
https://fonts.googleapis.com/css2?family=Saira+Condensed:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap
```

---

## 🎨 Componentes / patrones visuales

### Date pill / chips con corte angular (FIRMA VISUAL DF)

Es el elemento de identidad más importante. Espejo del precio "S./200" en Warrior:

```css
background: #FFFFFF;
color: #F54922;
font-family: 'Saira Condensed', Impact, sans-serif;
font-style: italic;
font-weight: 900;
font-size: 24px;
letter-spacing: 1.5px;
text-transform: uppercase;
padding: 16px 36px;
border-radius: 0;
clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);  /* corte angular asimétrico */
box-shadow: 0 10px 30px rgba(0,0,0,0.55);
```

**Variantes**:
- Chip blanco + texto naranja → date pill, etiquetas de precio
- Chip naranja + texto blanco → CTAs, "PROMO N", labels destacados

### Cards blancas editoriales (paneles de información)

Rompen el dark cinematográfico para legibilidad. Espejo de los chips de precio en Warrior:

```css
background: #FFFFFF;
border-radius: 4px;
border-left: 7px solid #F54922;
box-shadow: 0 6px 28px rgba(0,0,0,0.55);
padding: 18px 30px;
```

- Día (DD): Saira italic 900 72px naranja
- Mes (LUN/MAR/etc): Inter 800 13px dark con opacity 0.55
- Título: Saira italic 800 28px dark `#1A1818` uppercase
- Plataformas: Inter 700 11px naranja uppercase
- Cards alternas: `background: #FAFAFA` + `border-left-color: #FF6B45`

### Logos

#### Logo de la MARCA (Distribuidora Fitness)

- **Asset**: `app/public/marcas/distribuidora-fitness/logo.svg`
- **viewBox crítico**: `"138 457 803 166"` (tight crop al bbox real del logo — sin Bezier whitespace).
- **Aspect real**: 4.86:1 (banner horizontal). NO es cuadrado.
- **Modo**: NEGATIVO via CSS `filter: brightness(0) invert(1)` (manual permite versión negativa).
- **Dimensiones recomendadas en grilla**: `width: 400px; height: 83px`.
- **Posición**: pegado al borde izquierdo del header (`object-position: left center !important`).
- **Drop-shadow**: `drop-shadow(0 4px 24px rgba(255,255,255,0.18))` para halo blanco sutil.

#### Logo de Distinto Agencia (footer)

- **Asset**: `app/public/agencia/distinto-horizontal.svg`
- **viewBox crítico**: `"129 462 821 169"` (excluye el texto "VERSION HORIZONTAL" del artwork de Illustrator).
- **Aspect**: 4.86:1.
- **Modo**: NEGATIVO via mismo filter.
- **Dimensiones en grilla**: `height: 88px; max-width: 480px`.

### Hero text "ESTA SEMANA"

```css
font-family: 'Saira Condensed', 'Bebas Neue', Impact, sans-serif;
font-style: italic;
font-weight: 900;
font-size: 156px;
letter-spacing: -2px;
line-height: 0.88;
text-transform: uppercase;
color: #FFFFFF;
text-shadow:
  4px 4px 0 rgba(245,73,34,0.85),
  8px 8px 40px rgba(245,73,34,0.4);
```

El doble text-shadow (offset sólido naranja + blur grande) da el efecto cinematográfico de la imagen Warrior.

### Divider editorial (no flecha, no curva)

```css
.line {
  background: #F54922;
  height: 4px;
  width: 80px;
  box-shadow: 0 0 14px rgba(245,73,34,0.6);
}
.dot {
  width: 8px; height: 8px;
  background: #F54922;
  border-radius: 0;
  transform: rotate(45deg);
  box-shadow: 0 0 10px rgba(245,73,34,0.7);
}
```

### Footer minimalista

- **NO incluir** tagline frase ("Tu progreso, nuestro suplemento") — Pedro eliminó. El logo Distinto + URL alcanzan.
- **Solo**: logo Distinto + URL `distribuidorafitness.pe` + línea naranja al borde inferior.

---

## 🚫 Reglas duras (lo que NO va)

- ❌ Fondo blanco/crema como base (rompe el mood dark cinematográfico)
- ❌ Negro puro `#000000` (manual prohíbe)
- ❌ Wordmark texto "DISTRIBUIDORA FITNESS" duplicando lo que el logo ya dice
- ❌ Anton recta (sin italic) o cualquier fuente display sin italic
- ❌ Skew CSS exagerado (> -8deg) en pills/cards — queda payaso
- ❌ Speed lines / bandas naranjas (ya el smoke da movimiento)
- ❌ Border-radius redondeado > 12px en cards (rompe feel industrial)
- ❌ Texto blanco fino sobre dark en bloques largos (fatiga vista — usar cards blancas)
- ❌ Frase comercial extra en footer (mantener minimalista)
- ❌ Logo cuadrado/thumbnail blanco wrapper (logos van flotando en negativo)
- ❌ Líneas decorativas atravesando logos (siempre dejar gap > 30px)

---

## 🔁 Cómo replicar este estilo en otras piezas

Cuando se diseñe **cualquier** pieza para DF (post IG, carrusel, story, banner web, grilla):

1. **Background**: dark grafito `#0D0D0D` + Fiery Red Smoke overlay con `mix-blend-mode: screen` + vignettes
2. **Tipografía display**: `Saira Condensed` weight 900 italic uppercase
3. **Tipografía body**: `Inter` con tracking generoso uppercase
4. **Chips**: clip-path angular asimétrico (espejo de "S./200" en Warrior)
5. **Naranja `#F54922`** puro — no derivar tonos, no rosa, no rojo
6. **Texto blanco crudo** o texto dark sobre paneles blancos según jerarquía
7. **Logos en negativo** via `filter: brightness(0) invert(1)` con drop-shadow blanco
8. **Líneas estructurales naranjas** top y bottom con `box-shadow: glow`
9. **Cards/paneles blancos** para info que rompe con el dark (igual que precios en Warrior)
10. **Sin tagline frase comercial** en footer

---

## 📐 Tamaño y proporción de pieza

- **Grilla semanal**: 1080×1620px (formato vertical 2:3, optimizado para feed IG)
- **Post cuadrado**: 1080×1080px
- **Story**: 1080×1920px
- **Header / banner web**: aspect variable, mantener cohesión

---

## 📎 Referencias internas

- 🎨 Brand book oficial extract: `assets/brand-book-extract.md`
- 🎨 Colores y fuentes: `assets/colores-fuentes.txt`
- 🖼️ Fiery Red Smoke (asset oficial): `assets/elementos-graficos/Fiery Red Smoke.png`
- 🖼️ Backgrounds adicionales: `assets/elementos-graficos/`
- 🎙️ Voz: `01-marca.md`
- 👥 Audiencia: `02-audiencia.md`
- 🚦 Rubric ON/OFF: `07-rubric.md`
- 🧱 Implementación referencia (grilla v8): `app/lib/grilla/styles/gym-energy.ts` en `distinto-marcas-skills`

---

## 📝 Histórico de iteraciones (verificadas en browser real con Chrome MCP)

| Versión | Cambio | Aprendizaje |
|---|---|---|
| v1 | Blanco + Anton + speed lines | Off-brand. La marca es dark cinematográfica, no clean+naranja. |
| v2 | Pivote: dark + Fiery Red Smoke + Saira italic + cards dark | Cards dark + texto blanco fino fatigan la vista en 7 días. |
| v3 | Cards blancas (paneles editoriales) + logos en negativo via `filter: brightness(0) invert(1)` | El blanco rompe el dark sin perder mood (espejo de precios en Warrior). |
| v4 | Logo DF más grande + sin wordmark texto + Distinto grande | El logo oficial ya dice "DISTRIBUIDORA FITNESS" — duplicar es ruido visual. |
| v5 | `object-position: left` + línea bottom 18px | El `object-fit: contain` default centraba el logo dentro del wrapper. |
| v6 | viewBox del logo DF apretado al **aspect REAL 4.84:1** (vía `getBBox()` runtime) | Calcular bbox con regex sobre `path d=` incluye **puntos de control de Bezier** que están fuera del visible — aspect calculado de 1.6 era erróneo. **Siempre usar `getBBox()` en runtime para verificar SVGs de Illustrator**. |
| v7 | viewBox del logo Distinto excluyendo texto "VERSION HORIZONTAL" del artwork | SVGs exportados de mesas de trabajo de Illustrator pueden traer labels/headers que hay que recortar del viewBox. |
| **v8** | **Sin tagline "Tu progreso nuestro suplemento"** en footer | Pedro: "el logo + URL alcanzan". Footer minimalista. |

## 🎓 Lecciones aprendidas (críticas para futuras piezas DF)

1. **Dark canvas + cards blancas** > dark canvas + cards dark: la lectura editorial
   exige paneles blancos de información que rompen el "stage" cinematográfico.
   Una grilla de 7 días con todo dark fatiga la vista.

2. **Filter `brightness(0) invert(1)`** convierte cualquier SVG/PNG a versión blanca
   sin tocar el asset original. Útil para "modo negativo" sobre dark.

3. **El smoke debe respirar**: opacity 0.7-0.85 + `mix-blend-mode: screen`.
   Más opacidad = pieza ahogada. Menos = perder el mood.

4. **Vignettes top/bottom críticas**: el smoke cubre toda la pieza pero las
   esquinas necesitan oscurecerse para foco al contenido.

5. **Cards blancas con border-left 7px naranja** son la "firma visual"
   repetible — espejo de los precios "S./200" en Warrior.

6. **getBBox() en runtime > cálculo analítico**: cuando un SVG viene de Illustrator,
   los path Bezier tienen control points fuera del visible. Para apretar viewBox al
   contenido real, usar la API DOM `element.getBBox()` en el browser.

7. **Logos en Illustrator suelen traer "VERSION HORIZONTAL" u otros labels** del
   artwork — inspeccionar children groups del SVG y recortar viewBox al group del logo.

8. **NO duplicar lo que el logo dice**: si el logo oficial incluye el wordmark
   "DISTRIBUIDORA FITNESS", no poner texto adicional en el header.

9. **Líneas estructurales y logos**: siempre dejar gap > 30px verticalmente
   entre líneas decorativas y logos para evitar atravesamientos.

10. **Verificar con browser real**: no asumir que el CSS se ve como diseñado.
    Usar Chrome MCP + `getBBox()` + `getBoundingClientRect()` antes de marcar listo.
