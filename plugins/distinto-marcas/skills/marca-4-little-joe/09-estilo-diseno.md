# 09 · ESTILO DE DISEÑO — Little Joe Perú

> 🎨 **Referencia visual canónica para piezas de Little Joe**.
> Definido el 22 may 2026 a partir del FONDO CIELO oficial Kit 2026 + post DM 2026 real.
> 📌 Esta guía reemplaza cualquier inferencia previa (v1 era azul royal sólido).

---

## 🖼️ Referencias visuales aprobadas

1. **FONDO CIELO LITTLE JOE-100** (CANVAS OFICIAL del cliente)
   Path: `01 - IDENTIDAD DE MARCA/KIT DE MARCA 2026/FONDO CIELO LITTLE JOE-100.jpg`
   Lo que define: **fondo cielo cartoon italiano** (azul medio + nubes blancas estilo cartoon dulce). Es el canvas oficial — replicar como background.

2. **Post Día de la Madre 2026 Little Joe** (CANÓNICA tipográfica)
   Path: `05 - POSTS/MAYO 2026/DIA DE LA MADRE/1.png`
   Lo que define: foto lifestyle de muñecos Joe (lila + rojo) abrazándose en jardín primaveral + chip rosa fucsia con texto blanco + **"Feliz / día de la / madre" en script cursive rosa + corazón rojo** + logo "Little Joe®" cursive negro.

3. **Historia destacada Mascota Joe** (Kit 2026)
   Path: `01 - IDENTIDAD DE MARCA/KIT DE MARCA 2026/HISTORIAS DESTACADAS 2026/Mesa de trabajo 4-100.jpg`
   Lo que define: **mascota Joe ROJA oficial peruana** (no azul como matriz italiana) sobre fondo cielo + wordmark "Little Joe®" cursive blanco en la barriga.

**Implementación referencia**: `app/lib/grilla/styles/playful-italian.ts`.

---

## 🎯 Filosofía del estilo

**Cute Charming Italiano · Cielo Cartoon Dulce + Mascota Joe Roja**

- **Mood**: pieza emocional cute italiana, "pon una sonrisa en el aire". Lover + Innocent + Caregiver.
- **No es**: dark luxury, sci-fi, industrial, masculinizado, hardcore, ofertón comercial.
- **Cliente arquetípico**: persona que regala a sus seres queridos. Mujeres jóvenes que aman detalles. Fans fútbol Perú que conectan con co-branding U/Alianza/Cristal.
- **Es la única marca CLARA WARM CUTE** del set Distinto. DF/LV/Lozano/NovaLamps son dark luxury. Kintu es claro orgánico. Manrique es clinical. Little Joe es **cute warm italiano playful**.

---

## ☁️ Sistema visual canónico

### Background — CIELO CARTOON oficial

| Capa | Tratamiento |
|---|---|
| **Asset oficial** | `app/public/marcas/little-joe/fondo-cielo.jpg` (300KB, copia del Kit 2026 oficial) |
| **CSS** | `background-image: url('/marcas/little-joe/fondo-cielo.jpg'); background-size: cover; background-position: center;` |
| **Fallback color** | `#9DCEEC` (azul cielo medio si no carga la foto) |
| **Overlay sutil** | `linear-gradient(180deg, rgba(157,206,236,0.10) 0%, rgba(255,255,255,0.10) 100%)` — mejora legibilidad |
| **Nubes decorativas** | SVG paths white opacity 0.78-0.96 en 3 posiciones (refuerzan el cielo) |

### Paleta canónica

| Color | Hex | Rol |
|---|---|---|
| **Navy Little Joe** | **`#1A3A6E`** | Texto principal sobre cielo claro |
| Azul cielo | `#9DCEEC` | Fallback canvas |
| **Rosa fucsia / coral** | **`#E63D6A`** | Acento PROTAGONISTA — firma visual (chips, DD, divider, hero) |
| **Rojo Joe** | **`#E63946`** | Color de la mascota peruana — acentos secundarios |
| Dorado estrella | `#EAB308` | Estrellas decorativas |
| **Blanco** | `#FFFFFF` | Cards + nubes + text shadows |
| Crema sutil | `#F4F9FE` | Cards alternas |

> ⚠️ **NO usar** azul royal Italia matriz como background (la marca PE evolucionó hacia rosa+rojo+cielo). El azul royal queda en la mascota italiana de comparación.

---

## ✏️ Sistema tipográfico

| Rol | Familia | Peso | Aplicación |
|---|---|---|---|
| **Hero / palabras destacadas** | **Caveat** cursive | 700 | "Esta semana" 156px rosa fucsia con shadow blanco |
| **DD en card** | Caveat cursive | 700 | 72px rosa fucsia |
| **Card titles** | **Fraunces** | 600 italic | "POV Unboxing ASMR" 26px italic navy |
| **Date pill** | **Quicksand** rounded | 700 | "♥ 18 — 24 MAY · 2026" uppercase tracking blanco sobre fucsia |
| **Sub hero / labels** | Quicksand | 600-700 | Tracking 2-2.5px uppercase |
| **Card meta** | Quicksand | 600 | Plataformas uppercase rosa |
| **URL footer** | Quicksand | 700 | `littlejoe.pe` lowercase rosa |

```
https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Fraunces:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=Quicksand:wght@400;500;600;700&display=swap
```

> 💡 **Caveat** es el OSS más cercano al estilo "Feliz / madre" script del post DM. Sacramento / Lemon Tuesday son alternativas viables. Quicksand es rounded friendly (no Inter). Fraunces tiene curvas italic emotivas (no Playfair recta).

---

## 🎨 Componentes / patrones visuales

### 💗 FIRMA VISUAL — Chip rosa fucsia con corazón

Espejo del chip "A las mamás que llenan cada camino de amor." del post DM:

```css
.pill-firma {
  background: #E63D6A;
  color: #FFFFFF;
  font-family: 'Quicksand', sans-serif;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 12px 26px;
  border-radius: 999px;
  box-shadow: 0 8px 22px rgba(230,61,106,0.4);
}
.pill-firma::before { content: '♥ '; }
```

### Hero text cursive (espejo "Feliz / madre")

```css
.hero h1 {
  font-family: 'Caveat', cursive;
  font-weight: 700;
  font-size: 156px;
  letter-spacing: -1px;
  line-height: 0.9;
  color: #E63D6A;
  text-shadow: 3px 3px 0 rgba(255,255,255,0.8);
}
```

### Cards blancas redondeadas

```css
.card {
  background: #FFFFFF;
  border-radius: 22px;
  border: 2px solid rgba(230,61,106,0.18);
  box-shadow: 0 8px 26px rgba(26,58,110,0.12);
}
.card .date .day {
  font-family: 'Caveat', cursive;
  font-weight: 700;
  font-size: 72px;
  color: #E63D6A;
}
.card .body .title {
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-weight: 600;
  font-size: 26px;
  color: #1A3A6E;
}
```

### Decoraciones (corazones + estrellas + nubes)

3 corazones rosa fucsia dispersos + 2 estrellas doradas + 3 nubes blancas adicionales sobre el fondo cielo. Cada uno con `filter: drop-shadow` para presencia sutil.

### Logos

#### Logo Little Joe (header)

- **Asset**: `app/public/marcas/little-joe/logo.png` (LOGO BLANCO PNG del Kit 2025)
- **Filter**: el PNG es blanco. Sobre cielo claro necesita invertir a navy oscuro:
  ```css
  filter: drop-shadow(0 3px 10px rgba(255,255,255,0.5)) brightness(0) invert(0.16);
  ```
  `brightness(0)` colapsa a negro, `invert(0.16)` deja un navy oscuro visible.
- **Dimensiones**: `width: 160px; height: 60px`.
- **Sin wrapper**: `logoBg: transparent; logoPad: 0`.

#### Logo Distinto Agencia (footer)

- **Color ORIGINAL** (morado + amarillo + negro). Sobre cielo claro NO necesita filter.
- **Drop-shadow** sutil para presencia:
  ```css
  filter: drop-shadow(0 3px 12px rgba(26,58,110,0.15));
  ```
- **Dimensiones**: `height: 64px; max-width: 380px`.

### Date pill

Chip rosa fucsia con corazón + tracking + rounded — la firma cute aplicada al header.

### Footer

- **NO tagline** frase comercial
- **URL `littlejoe.pe`** Quicksand rosa lowercase tracking
- **Logo Distinto color original**

---

## 🚫 Reglas duras (lo que NO va)

- ❌ Azul royal italiano sólido como background (v1 — la marca PE usa cielo cartoon)
- ❌ Playfair Display serif elegante (eso es Lozano/LV/NL — Little Joe usa Caveat/Fraunces curvy)
- ❌ Inter sans plano (no transmite el cute italiano)
- ❌ Dark/oscuro (Little Joe es CLARO WARM)
- ❌ Verde / lima / amarillo neón (paleta cerrada en rosa+rojo+cielo+blanco)
- ❌ Tono masculinizado / hardcore (NO es esa audiencia)
- ❌ Memes ofensivos / sexualizados
- ❌ Tagline frase comercial en footer (mantener minimalista cute)
- ❌ Border-radius < 14px en cards (rompe el feel rounded charming)
- ❌ Tecnicismos químicos en piezas

---

## 🔁 Cómo replicar este estilo en otras piezas

1. **Background**: `fondo-cielo.jpg` oficial Kit 2026 (cielo cartoon)
2. **Nubes blancas** SVG adicionales para refuerzo
3. **Corazones rosa fucsia + estrellas doradas** dispersos como decoraciones cute
4. **Tipografía hero**: Caveat cursive — espejo del "Feliz / madre" del post DM
5. **Tipografía body**: Fraunces italic curvy navy
6. **Tipografía labels**: Quicksand rounded friendly
7. **Chips rosa fucsia con ♥** como firma visual aplicada en CTAs
8. **Cards radius 22px** con border-left fucsia + DD Caveat cursive rosa
9. **Logo Little Joe** con filter invert(0.16) → navy oscuro sobre cielo
10. **Logo Distinto color original** sobre cielo claro (no negativo)

---

## 📝 Histórico de iteraciones

| Versión | Cambio | Aprendizaje |
|---|---|---|
| v1 (sesión previa) | Azul royal Italia + Fraunces curvy + nubes + estrellas + corazón en pill | Off-brand. La marca PE evolucionó a cielo cartoon + mascota roja, no azul royal sólido. |
| v2 (correcciones intermedias) | Cielo cálido warm gradient + Caveat opcional + acento dorado | Aún no usaba el FONDO CIELO oficial del cliente. |
| **v3 (22 may 2026)** | **Fondo cielo cartoon oficial Kit 2026 + Caveat cursive ROSA + chip rosa fucsia con corazón + cards radius 22px + decoraciones (corazones+estrellas+nubes) + logo navy con invert(0.16)** | El FONDO CIELO oficial del cliente es CANÓNICO. La mascota roja Joe + rosa fucsia + script cursive son la identidad real de Little Joe Perú. |

## 🎓 Lecciones aprendidas (para futuras piezas Little Joe)

1. **El fondo cielo cartoon es OFICIAL del cliente** (Kit 2026). Es el canvas canónico — replicarlo es obligatorio para identidad inmediata. Sin él, la pieza pierde el alma italiana cute.

2. **Rosa fucsia `#E63D6A` es la firma visual** (no rojo, no azul). Es lo que vi en el post DM como acento dominante en chip + script cursive "Feliz". Rojo `#E63946` queda como color de la mascota Joe.

3. **Caveat cursive** es la fuente clave para hero + DD. Espejo del "Feliz / madre" del post DM. Sacramento / Lemon Tuesday son alternativas válidas pero Caveat es la más rounded friendly.

4. **Cards radius 22px** (alto). Refuerza el feel "marshmallow" rounded cute. Si usás radius bajo (< 14px) la pieza se ve corporativa/dura, rompe el alma Little Joe.

5. **Filter `brightness(0) invert(0.16)`** para el logo blanco PNG: `brightness(0)` colapsa a negro, `invert(0.16)` da navy oscuro (no blanco puro). Visible sobre cielo claro. Si fuera invert(1) se volvería blanco e invisible.

6. **Logo Distinto en color original sobre cielo claro** (no negativo). El morado + amarillo del logo Distinto contrasta bien sobre el cielo azul claro — no necesita filter.

7. **3 corazones rosa + 2 estrellas doradas + 3 nubes blancas** = densidad correcta de decoraciones. Más es ruido, menos pierde el mood. Espolvorear con sentido emotivo (no aleatorio).

8. **Esta es la única marca con script cursive** del set Distinto. DF usa Saira italic. LV/NL/Lozano usan Playfair. Kintu Montserrat. Manrique Poppins. Little Joe es el ÚNICO con Caveat — diferencia clara del cluster.

9. **NO tagline frase comercial**. El logo + URL alcanzan. Aprendizaje aplicado a las 7 marcas.

10. **Filosofía "pon una sonrisa en el aire"** se traduce visualmente como: cielo cartoon + corazones + script cursive emocional + mascota roja saludando. Cada elemento aporta a la sonrisa.

11. **Cluster Distinto completo** (post 22-may-2026):
    - **Dark Luxury Cluster**: DF (smoke naranja Anton italic), LV (verde bosque Playfair ALL CAPS + em-dashes), Lozano (negro azulado Playfair italic + amarillo dorado), NovaLamps (grafito Playfair ALL CAPS + verde lima underlines)
    - **Clean Warm Cluster**: Kintu (blanco Montserrat estricto + tarjeta verde profundo), Manrique (clinical Poppins + raspberry)
    - **Cute Warm Cluster**: Little Joe (cielo cartoon Caveat cursive + rosa fucsia)

    7 marcas, 7 identidades distintas pero coherentes. Sistema visual completo.
