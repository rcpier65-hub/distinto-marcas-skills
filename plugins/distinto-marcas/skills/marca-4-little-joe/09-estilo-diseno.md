# 09 · ESTILO DE DISEÑO — Typhouse (ex-Little Joe)

> 🎨 **Referencia visual canónica para piezas de Typhouse**.
> Definido el 22 may 2026 — **rebrand v4 completo**: Little Joe → Typhouse (agencia de diseño / branding).
> 📌 Esta guía REEMPLAZA todas las versiones anteriores (v1 royal blue, v2 cielo cartoon, v3 fucsia + Joe rojo). Son obsoletas.

---

## ⚠️ Contexto del rebrand

Pedro decidió el **22 may 2026** rebrandear "Little Joe" (importador peruano de muñecos italianos) a **"Typhouse"** — pivote a marca de **agencia de diseño / branding propio**. Implica:

- ❌ FUERA: mascota Joe roja, cielo cartoon italiano, script cursive Caveat, fucsia/coral fútbol.
- ✅ DENTRO: símbolo TP celeste minimalista + wordmark "typhouse" sans bold + concepto editorial limpio creativo.
- El skill se mantiene en `marca-4-little-joe/` (slug de BD legacy) pero el contenido es Typhouse.

---

## 🖼️ Referencia visual canónica

1. **Logo Typhouse oficial** (única fuente de verdad)
   Path: `13 - GESTION COMERCIAL/TYPHOUSE/LOGO/FORMATO PNG/Mesa de trabajo 1.png` (horizontal)
   Lo que define: símbolo **TP en celeste** (`#1FB3E8` aprox) compuesto por dos formas redondeadas que sugieren splash/gota + **wordmark "typhouse"** en sans serif bold rounded negro/grafito + acento de gotas (concepto splash) a la derecha de la "y".
   - Aspect-ratio nativo del bbox útil: ~3.68:1 (711×193 dentro del 1080×1080 original).
   - Asset desplegado: `app/public/marcas/little-joe/logo.png` recortado a **771×253** (aspect 3.05:1) para maximizar área visible con `object-fit:contain`.

2. **Variante vertical**
   Path: `13 - GESTION COMERCIAL/TYPHOUSE/LOGO/FORMATO PNG/Mesa de trabajo 1 copia.png`
   No se usa en grilla horizontal pero existe como recurso.

**Implementación referencia**: `app/lib/grilla/styles/playful-italian.ts` (mismo nombre por compat, contenido completamente reescrito).

---

## 🎯 Filosofía del estilo

**Editorial Limpio Creativo · Agencia de Diseño/Branding**

- **Mood**: pieza editorial luminosa, profesional creativa. Confianza + claridad + acento de color refrescante.
- **No es**: dark luxury, cute italiano, ofertón comercial, sci-fi industrial, cartoon, cielo, mascota.
- **Cliente arquetípico interno**: agencia/empresa que necesita branding, identidad visual, casos de éxito. Audiencia: dueños de marca, diseñadores, marketing managers.
- **Diferenciador en el set Distinto**: única marca **clara editorial creativa**. Manrique=clinical warm, Kintu=organic light, La Victoria=wood industrial, Lozano=artisan craft, NovaLamps=dark luxury lima, Distri Fitness=gym energy ámbar, Typhouse=**editorial blanco crema + celeste splash**.

---

## ☁️ Sistema visual canónico

### Background — Blanco crema warm

| Capa | Tratamiento |
|---|---|
| **Gradient** | `linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 60%, #F4F9FC 100%)` — blanco arriba, sutil celeste muy claro abajo |
| **Splashes decorativos** | 3 SVG con círculos celeste (`#1FB3E8` opacity 0.4–0.7) emulando el concepto splash del logo TP — top-right, bottom-left, mid-right |
| **Accent bars** | Barras 4px celeste con border-radius 999px en `top: 28px` y `bottom: 28px` (estructurales editoriales) |

### Paleta canónica

| Color | Hex | Rol |
|---|---|---|
| **Negro Typhouse** | `#0A0A0A` | Texto principal (wordmark, hero, títulos cards) |
| **Celeste Typhouse** | **`#1FB3E8`** | ACENTO PROTAGONISTA — símbolo TP, pill fecha, DD cards, divider, splashes |
| Celeste claro | `#5DC8EF` | Highlight / shadows del celeste |
| **Blanco** | `#FFFFFF` | Card bg principal |
| Crema sutil | `#FAFBFC` | Mid gradient |
| Celeste muy claro | `#F4F9FC` | Card alt + bottom gradient |

> ⚠️ **NO usar** rosa fucsia, fondo cielo cartoon, mascota Joe, script cursive — todo eso era Little Joe v3 y quedó obsoleto.

---

## ✏️ Sistema tipográfico

| Rol | Familia | Peso | Aplicación |
|---|---|---|---|
| **Hero / DD / Card titles / Logo** | **Quicksand** rounded | 700 | Coherente con el wordmark "typhouse" del logo |
| **Sub hero / meta / pill / footer URL** | Quicksand | 600 | Tracking 2-3.5px uppercase para labels |

```
https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Fraunces:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Quicksand:wght@400;500;600;700&display=swap
```

(Caveat + Fraunces se mantienen en el fontsUrl por compat del theme; no se usan visualmente.)

---

## 🧱 Componentes — specs

### Header

- **Logo**: `width: 340px; height: 105px; object-fit: contain; object-position: left center; filter: drop-shadow(0 3px 10px rgba(31,179,232,0.18))`. Aspect-ratio del PNG (3.05:1) ≈ contenedor (3.24:1) → llena el ancho útil al ~94%.
- **Brand name** (`brandSmall` / `brandBig` del theme): **oculto** (`display: none`) — el logo PNG ya contiene todo.
- **Date pill**: chip rounded `border-radius: 999px`, background celeste sólido, color blanco, Quicksand 700 16px tracking 1.8px uppercase, padding `14px 28px`, box-shadow celeste suave. Alineado a la derecha (`margin-left: auto`).

### Hero

- **H1**: Quicksand 700 130px, letter-spacing -3px, line-height 0.95, color negro.
  - **Primera letra en celeste** (`::first-letter { color: var(--accent); }`) → firma visual (ej: "**E**sta semana" donde la E es celeste).
- **Sub**: Quicksand 600 13px tracking 3.5px uppercase color negro opacity 0.55. Margin-top 14px.
- **Divider**: línea celeste 3px ancho 80px border-radius 999px + dot celeste 10px box-shadow celeste glow.

### Cards (publicaciones reales)

- `background: #FFFFFF` (alterna con `#F4F9FC` para `.is-alt`).
- `border-radius: 14px` (medio, ni cuadrado severo ni pill).
- `border: 1px solid rgba(31,179,232,0.18)` (delicado).
- `border-left: 5px solid #1FB3E8` (acento estructural — firma).
- `box-shadow: 0 6px 22px rgba(10,10,10,0.06)` (sombra editorial sutil).
- `padding: 16px 26px`, `gap: 22px`.

**Date interno**:
- `.day`: Quicksand 700 54px celeste, letter-spacing -2px.
- `.month`: Quicksand 600 11px tracking 2.5px uppercase negro opacity 0.5.
- Texto alineado a la izquierda (no chip cuadrado — fluye con el card).

**Body**:
- `.title`: Quicksand 700 27px negro line-height 1.15.
- `.meta`: Quicksand 600 11px tracking 2.5px uppercase celeste.

**Icon**: 42×42 celeste opacity 0.65.

### Cards vacías ("Sin publicación programada")

- `background: rgba(255,255,255,0.55)`, `border: 1.5px dashed rgba(31,179,232,0.35)`.
- `.day` celeste opacity 0.5, `.title` negro opacity 0.5 italic 500 weight.

### Footer

- Logo Distinto agency centrado, `height: 64px max-width: 380px` con drop-shadow sutil.
- URL `typhouse.pe`: Quicksand 700 12px tracking 2.5px lowercase color celeste.
- Tagline oculta.

---

## 🚫 Reglas duras (NO hacer)

1. ❌ **NO** usar fondo cielo cartoon (era Little Joe v3, obsoleto).
2. ❌ **NO** mostrar el `brandBig` / `brandSmall` como texto — el logo PNG es la única identidad visible.
3. ❌ **NO** usar script cursive Caveat para hero (era v3 fucsia).
4. ❌ **NO** usar rosa fucsia / coral / rojo Joe — la paleta es **negro + celeste + blanco crema**.
5. ❌ **NO** subir un PNG cuadrado con whitespace masivo — el aspect del archivo debe coincidir (±15%) con el del contenedor CSS, o `object-fit:contain` desperdicia área.
6. ❌ **NO** usar mascota Joe ni corazones ni decoraciones cute italianas.
7. ❌ **NO** poner el logo pegado al borde sin padding — `object-position: left center` ya lo ancla; el padding del header da el aire.

---

## ✅ Cómo replicar este estilo

1. Theme `little-joe` en `app/lib/grilla/themes.ts` → `style: 'playful-italian'`, primary `#0A0A0A`, accent `#1FB3E8`, canvas `#FAFBFC`, fontDisplay/Sans Quicksand, brandBig `typhouse`, brandSmall `AGENCIA DE DISEÑO`, footerUrl `typhouse.pe`, heroTitle `Esta semana`.
2. PNG del logo en `app/public/marcas/little-joe/logo.png` debe ser **recortado al bbox útil** (no el cuadrado original 1080×1080). Aspect ~3:1.
3. Style builder en `app/lib/grilla/styles/playful-italian.ts` — usar el código actual como referencia.

---

## 📜 Histórico de iteraciones

- **v1 (5 may 2026)**: royal blue Italia matriz sólido — descartada por inconsistente con manual PE.
- **v2 (19 may 2026)**: fondo cielo cartoon + mascota Joe + Caveat fucsia — implementada y entregada en grilla 12-18 may.
- **v3 (21 may 2026)**: refuerzo del cute italiano + cards cute + ajustes de logo — entregada en grilla 19-25 may.
- **v4 REBRAND (22 may 2026)**: pivote completo a **Typhouse** agencia de diseño. Editorial limpio creativo. Logo TP celeste + wordmark sans bold. Es la versión actual y oficial.

---

## 🎓 Lecciones aprendidas

1. **Asset bitmap sin SVG → aspect debe matchear el contenedor**: PNG 1080×1080 cuadrado con logo útil 3.68:1 hacía que `object-fit:contain` lo dejara minúsculo (~30% del ancho disponible). Cropping con Python PIL al bbox real (Pillow `Image.getbbox()` sobre alpha channel) resuelve sin necesidad de SVG.
2. **`getBBox()` runtime > regex sobre `d=`**: para SVGs Illustrator, la única forma confiable de obtener el bbox útil es renderizarlos y leer DOM. Las curvas Bezier tienen control points fuera del visible que rompen regex.
3. **Verificar visualmente en browser antes de declarar listo**: Pedro lo pidió explícitamente. Las specs CSS pueden estar correctas pero el resultado renderizado puede diferir (CDN cache, deploy reciente, fonts loading). Chrome MCP `javascript_tool` con `getBoundingClientRect()` + `naturalWidth` da evidencia objetiva del estado real desplegado.
4. **Rebrands completos justifican refactor full**: cuando la dirección cambia (cute italiano → editorial agencia), no se conservan elementos del estilo previo. Forzar coherencia con la versión anterior empeora el resultado.
