# 09 · ESTILO DE DISEÑO — Distribuidora Fitness Marketing

> 🎨 **Referencia visual canónica para piezas de DF**.
> Definido el 22 may 2026 por Pedro a partir de pieza catálogo "Warrior Raw + Crunch".
> 📌 Esta es la guía visual real que reemplaza cualquier inferencia previa.

---

## 🖼️ Referencia visual aprobada

> Imagen de referencia: catálogo Warrior x Distribuidora Fitness mostrando promos de
> Warrior Raw + Crunch (avena/crocante + cookies/cookies dough).
> Archivada en `assets/referencias-visuales/` (cuando se guarde manualmente).

**Por qué es la referencia canónica**: Pedro la eligió como el estilo visual que define a DF.
Cualquier pieza que se haga para DF debe respetar este sistema visual.

---

## 🎯 Filosofía del estilo

**Cinematográfico · Dark · Energético · Premium-gym**

- **Mood**: cartel premium de suplementación gym hardcore
- **No es**: light, friendly, wellness, corporate-clean
- **Cliente arquetípico al que apunta**: Diego (gym brother) — la persona #1.
  El estilo se inclina hacia él. Andrea (fit girl) lee la pieza porque también va a gym,
  pero el lenguaje visual NO se diseña pensando en "friendly femenino".
- **Es lo opuesto** del estilo wellness/spa (Kintu) o cute italiano (Little Joe).

---

## 🌑 Sistema visual canónico

### Background — DARK con HUMO

| Elemento | Tratamiento |
|---|---|
| **Color base** | Negro grafito profundo (NO #000 puro — el manual dice `#333333` pero para fondo full pieza puede usarse `#1A1818` a `#0D0D0D`). |
| **Capa "Fiery Red Smoke"** | El asset oficial `assets/elementos-graficos/Fiery Red Smoke.png` se aplica como background full pieza al 70-100% opacidad. Es el alma visual de DF — NO inventar otro humo. |
| **Gradiente** | El smoke emerge desde el medio/abajo hacia los bordes. Esquinas superiores quedan más oscuras (negro puro). Centro tiene la energía naranja del humo. |
| **Vignette** | Ligero darken en las esquinas para foco al producto/título. |

### Paleta aplicada (refinada vs manual base)

| Color | Hex | Rol |
|---|---|---|
| Negro vignette | `#0D0D0D` | Bordes superiores, vignette |
| Grafito base | `#1A1818` | Background sin smoke |
| **Naranja DF** | **`#F54922`** | Chips/etiquetas (PRECIOS, PROMO N, COMBINACIONES), CTAs, símbolo FD |
| Naranja humo | `#F54922` con 30-60% alpha | Capa de smoke encima del grafito |
| Blanco crudo | `#FFFFFF` | Texto principal, headlines display, productos |
| Crema sutil | `#F5F1E8` | Bullets ("• Cookies & Cream"), descripciones secundarias |
| Texto sobre naranja | `#0D0D0D` o `#FFFFFF` | Según contraste — los precios "1 x S./10" van en blanco sobre fondo, los chips de promo "PROMO 1" van blanco sobre naranja |

---

## ✏️ Sistema tipográfico

### Display / Headlines — CONDENSED + ITALIC + BOLD

Lo que la imagen muestra:
- **WARRIOR RAW**, **WARRIOR CRUNCH**, **COMBINACIONES**, **PROMO 1/2/3/4**:
  - Condensed (estrechas)
  - **Italic** (inclinadas hacia adelante — sensación de velocidad)
  - Peso bold / black
  - Todo MAYÚSCULAS
- Fuente oficial: **Stretch Pro** italic bold extended (no Google Font — pago).
- **OSS válidos (en orden de cercanía visual)**:
  1. **Bowlby One** + `transform: skew(-8deg)` → la más cercana al feel italic-condensed-pesado
  2. **Saira Condensed** weight 900 + italic
  3. **Anton** + `font-style: italic` (no tiene italic real, pero CSS lo simula con skew)
  4. **Oswald** weight 700 + `transform: skew(-8deg)` → más industrial, menos gym hardcore
- **Para producción Web/PNG**: usar **Saira Condensed 900 italic** (tiene italic real en Google Fonts, condensed, peso black). Es la opción más limpia. Alternativa: **Bebas Neue + skew CSS**.

### Subtítulos / labels — Sans bold uppercase

- "SABORES:", "PRECIOS", "ATENCIÓN PERSONALIZADA":
  - Sans bold, uppercase
  - Tracking moderado (1-2px)
  - Sobre chip naranja o texto crudo
- **OSS**: Inter Bold / Montserrat Bold uppercase

### Cuerpo — Sans regular/italic light

- Bullets de sabores ("• Cookies & Cream"): italic light/regular sans
- Descripciones ("TEXTURA DE AVENA"): light italic, muy pequeño
- **OSS**: Inter regular/italic, peso 400-500

### Precios — Sans bold extra grande

- "S./10", "S./200": sans bold, peso 800-900, tamaño dominante
- En chips naranjas con el "S./" más chico que el número

---

## 🎨 Elementos compositivos

### Chips/etiquetas

Las "etiquetas" (PROMO 1, COMBINACIONES, PRECIOS) son **fundamentales** al estilo DF:
- Fondo naranja sólido `#F54922`
- Texto blanco bold uppercase, condensed o italic
- Esquinas con **corte angular asimétrico** (parallelogram efecto), o bordes redondeados sutiles 4-6px
- Sombra: drop-shadow naranja 30% alpha 8-12px (glow sutil)
- Tamaño: padding generoso (10-16px vertical, 20-32px horizontal)
- **Ejemplo CSS aproximado**:
  ```css
  background: #F54922;
  color: #fff;
  padding: 10px 24px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%); /* corte angular */
  box-shadow: 0 6px 20px rgba(245,73,34,0.35);
  ```

### Drop shadows / glows

- **Productos**: sombras dramáticas negras (rgba(0,0,0,0.5)) para flotar sobre el smoke
- **Chips**: glow naranja sutil
- **Textos blancos sobre dark**: NO usar shadow — usar peso fuerte directamente

### Espacio negativo

- El layout **respira** — no llenar todo. La pieza de Warrior tiene mucho aire entre secciones.
- Permite que el smoke se vea entre elementos.

### Logo FD + Logo partner

- Logo FD oficial arriba a la izquierda (versión MENOS ELEMENTOS o MÍNIMA según pieza)
- Si hay marca partner (Warrior), va al lado del FD separado por aire mínimo

### Footer institucional

La pieza Warrior muestra 4 íconos al final con valores:
1. 🛡️ **CONFIANZA Y SEGURIDAD**
2. 🕐 **ENTREGA RÁPIDA A TODO EL PERÚ**
3. 👤 **ATENCIÓN PERSONALIZADA**
4. 💲 **PRECIOS JUSTOS**

Estos pueden usarse como diferenciadores recurrentes en piezas institucionales.
**Estilo**: línea fina, no rellenos, naranja o blanco sobre dark.

---

## 📐 Aplicación a la grilla semanal de contenido

La pieza Warrior es un **catálogo de producto**. La **grilla semanal** es un calendario,
distinto en función pero debe sentirse de la MISMA familia visual.

### Cómo traducir el estilo a la grilla

| Elemento de grilla | Aplicación del estilo DF |
|---|---|
| **Background** | Dark grafito (`#1A1818`) + capa "Fiery Red Smoke" full overlay con 75% opacidad. Vignette en esquinas. |
| **Header (logo + brand name + date pill)** | Logo FD oficial sobre fondo "transparent" (smoke visible detrás). Brand name "DISTRIBUIDORA FITNESS" en Saira Condensed italic black + small "MAYORISTA Y MENOR \| DELIVERY LIMA" en blanco sutil. Date pill = **chip naranja con corte angular**. |
| **Hero** | "ESTA SEMANA" o "AGENDA DE LA SEMANA" en Saira Condensed italic black SUPER GRANDE (140px+), blanco, con drop shadow rojo sutil. Subtítulo en blanco regular italic. |
| **Cards de días** | Fondo gris muy oscuro (`#1F1F1D`) con borde-izquierdo naranja, texto blanco. Date.day en Saira Italic black grande NARANJA, date.month blanco condensed bold. Title blanco bold, meta naranja uppercase. **NO usar borde redondeado sutil — más bien angular cuadrado con border-left 5px naranja**. |
| **Divider** | Flecha naranja apuntando derecha (motion) — coherente con "velocidad". |
| **Footer** | Tagline marca en blanco italic. Logo Distinto Agencia en blanco/grayscale (sobre dark). URL en gris sutil. |

### Lo que NO va

- ❌ Fondo blanco/crema (rompe el mood dark)
- ❌ Anton (mi diseño previo — muy "recta", no italic)
- ❌ Skew exagerado >-10deg (queda payaso)
- ❌ Speed lines/bandas naranjas (yo las metí antes — están de más, el smoke ya da movimiento)
- ❌ Border-radius redondeado >12px en cards (rompe el feel industrial)
- ❌ Texto naranja sobre fondo blanco (al revés del manual)

---

## 🔁 Cómo replicar este estilo en otras piezas

Cuando se diseñe **cualquier** pieza para DF (post IG, carrusel, story, banner web):

1. **Empezar siempre** con dark grafito + Fiery Red Smoke overlay
2. **Tipografía display** = Saira Condensed Italic Black (o Bebas Neue con skew CSS)
3. **Chips naranjas con corte angular** para CTAs/labels/precios
4. **Naranja `#F54922` puro** — no derivar tonos, no rosa ni rojo
5. **Texto blanco crudo** dominante. Crema sutil para subtítulos.
6. **Drop shadows negras** para productos/imágenes (no naranjas)
7. **Glow naranja sutil** solo en chips
8. **Logo FD** siempre presente

---

## 📎 Referencias internas

- 🎨 Brand book extract: `assets/brand-book-extract.md`
- 🎨 Colores y fuentes: `assets/colores-fuentes.txt`
- 🖼️ Fiery Red Smoke: `assets/elementos-graficos/Fiery Red Smoke.png` (asset oficial)
- 🎙️ Voz: `01-marca.md`
- 👥 Audiencia: `02-audiencia.md`
- 🚦 Rubric ON/OFF: `07-rubric.md`

---

## 📝 Histórico de cambios

- **22 may 2026** — Pedro define este estilo a partir de pieza Warrior x DF.
  Reemplaza diseño previo (que usaba fondo blanco + Anton + speed lines).
  Implementado primero en `gym-energy.ts` del sistema de grillas semanales.
