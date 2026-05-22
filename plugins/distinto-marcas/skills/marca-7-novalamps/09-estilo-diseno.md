# 09 · ESTILO DE DISEÑO — Novalamps

> 🎨 **Referencia visual canónica para piezas de Novalamps**.
> Definido el 22 may 2026 a partir del post "Día de la Madre 2026" + manual oficial.
> 📌 Esta guía reemplaza cualquier inferencia previa (la v1 era Inter sans plano).

---

## 🖼️ Referencias visuales aprobadas

1. **Post Día de la Madre 2026 NovaLamps** (CANÓNICA)
   Path: `05 - POSTS/MAYO 2026/dia-madre-2026/post-dia-madre-v1.jpg`
   Lo que define: **canvas dark + serif moderna Playfair-like ALL CAPS blanco gigante** ("HACEN DEL ESPACIO UN HOGAR") + **"A las que" en serif italic** + **logo "novaLamps eléctrika"** con sub-marca + **"Día" en script italic + underline verde lima** (firma visual) + 15 años respaldo + dirección showroom + URL.

2. **Portadas VIDEO FRASE 2026** (mood neón showroom)
   Path: `08 - PORTADAS Y MINIATURAS/PORTADAS VIDEOS 2026/Portadas Marzo/`
   Lo que define: showroom real con productos line-up + verde lima neón saturado en labels ("ARES", "SOLUM", "URBAN", "NOBIS").

3. **Manual de Identidad** (17 págs)
   Path: `assets/manual-pdf/NOVALAMPS-MANUAL-BASICO.pdf`
   Lo que define: paleta (`#D2DD00` lima + `#262726` grafito + blanco), Arial Regular/Bold base, regla "verde lima debe predominar".

**Implementación referencia**: `app/lib/grilla/styles/led-technical.ts`.

---

## 🎯 Filosofía del estilo

**Editorial Dark Luxury — Iluminación Premium Aspiracional**

- **Mood**: pieza editorial de magazine de interiorismo iluminación. Sage+Creator+Ruler. Aspiracional pero técnica.
- **No es**: sci-fi cyberpunk, casual meme, Mercado Libre, retail mass market, ofertón.
- **Cliente arquetípico**: arquitectas/interioristas + B2C premium hogar + B2B comercial. Busca diseño + garantía + showroom.
- **Es similar a Lozano** en estructura (dark editorial + color marca acento) pero distinto: verde lima en vez de amarillo + Playfair semibold ALL CAPS en vez de italic delgada.

> 💡 **Evolución del manual base**: el manual oficial dice Arial Regular/Bold. PERO el equipo del cliente ya evolucionó hacia **serif moderna editorial premium**. La v2 sigue el post DM real, no el manual base — esta es decisión documentada del cliente que prima.

---

## 🌑 Sistema visual canónico

### Background — DARK con glow lima

| Capa | Tratamiento |
|---|---|
| **Color base** | Radial gradient `radial-gradient(ellipse at 50% 30%, #262726 0%, #1A1A1A 60%, #0D0D0D 100%)` |
| **Glow lima central** | `radial-gradient(ellipse 1000px 700px at 50% 40%, rgba(210,221,0,0.08) 0%, transparent 70%)` — firma marca sin saturar |
| **Barras lima top/bottom** | 2px alto + glow lima — acentos estructurales |

### Paleta canónica

| Color | Hex | Pantone | Rol |
|---|---|---|---|
| **Verde lima Novalamps** | **`#D2DD00`** | 389 C | Acento PROTAGONISTA (manual: "debe predominar") |
| Lima brillante | `#E4F000` | — | Variación highlight |
| **Grafito Novalamps** | **`#262726`** | 419 C | Canvas base + chips card-date |
| Grafito profundo | `#1A1A1A` | — | Centro gradient |
| Grafito negro | `#0D0D0D` | — | Bordes gradient |
| **Blanco** | `#FFFFFF` | — | Cards + texto sobre dark |

> ⚠️ **Regla dura del manual**: NUNCA negro puro `#000000` (es `#262726` con tinte verdoso). NUNCA escribir "NOVALAMPS" mayúsculas (es "Novalamps").

---

## ✏️ Sistema tipográfico

| Rol | Familia | Peso | Aplicación |
|---|---|---|---|
| **Hero / Display** | **Playfair Display** | 600 | "Esta semana" 116px ALL CAPS blanco — espejo "HACEN DEL ESPACIO UN HOGAR" |
| **Card titles** | Playfair Display | 600 | Uppercase 26px dark sobre card blanca |
| **DD en card** | Playfair Display | 700 | 48px verde lima sobre chip grafito |
| **Date pill / labels** | Inter | 600 | Tracking 3px uppercase lima + underline 2px lima |
| **Sub hero** | Inter | 500 | Tracking 4px uppercase lima |
| **Card meta** | Inter | 600 | Tracking 2.5px uppercase gris |
| **Card month (LUN/MAR)** | Inter | 600 | Tracking 3px uppercase blanco |
| **URL footer** | Inter | 500 | Tracking 3px lowercase lima |
| **Word destacada (script)** | Caveat | 500-600 | Para "Día" o palabra clave con underline lima (uso opcional) |

```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&family=Caveat:wght@500;600&display=swap
```

---

## 🎨 Componentes / patrones visuales

### 🟢 FIRMA VISUAL — Underline verde lima

Espejo del "DÍA" subrayado en el post DM. Se usa en:
- Date pill (underline 2px lima en sans uppercase)
- Divider del hero
- Palabra destacada con Caveat script italic

```css
.label-firma {
  background: transparent;
  color: #D2DD00;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 8px 0;
  border-bottom: 2px solid #D2DD00;
  box-shadow: 0 0 10px rgba(210,221,0,0.5);  /* glow sutil */
}
```

### Hero editorial (espejo "HACEN DEL ESPACIO UN HOGAR")

```css
.hero h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 600;
  font-size: 116px;
  letter-spacing: -1px;
  line-height: 0.95;
  text-transform: uppercase;
  color: #FFFFFF;
}
```

### Cards blancas con DD en chip grafito

```css
.card {
  background: #FFFFFF;
  border-radius: 4px;
  border-left: 5px solid #D2DD00;
  box-shadow: 0 8px 28px rgba(0,0,0,0.55);
}
.card .date {
  background: #1A1A1A;
  color: #D2DD00;
  padding: 12px 18px;
  border-radius: 3px;
}
.card .date .day {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: 48px;
  color: #D2DD00;
}
.card .date .month {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  letter-spacing: 3px;
  color: #FFFFFF;
  font-size: 11px;
}
.card .body .title {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 600;
  font-size: 26px;
  text-transform: uppercase;
  color: #1A1A1A;
}
```

### Logos

#### Logo Novalamps (header)

- **Asset**: `app/public/marcas/novalamps/logo.svg`
- **viewBox tight**: `"268 477 544 126"` (bbox real: x=280 y=489 w=520 h=102).
- **Aspect real**: 4.32:1 (banner MUY horizontal — wordmark "novaLamps" + ícono casa pequeño + sub "eléctrika").
- **Filter**:
  ```css
  filter: brightness(0) invert(1) sepia(0.3) saturate(2) hue-rotate(35deg);
  ```
  Convierte negro→blanco, conservando lima sutil.
- **Dimensiones**: `width: 280px; height: 65px`.
- **Sin wrapper**: `logoBg: transparent; logoPad: 0`.

#### Logo Distinto Agencia (footer)

- **En NEGATIVO** con drop-shadow lima sutil:
  ```css
  filter: drop-shadow(0 3px 14px rgba(210,221,0,0.15)) brightness(0) invert(1);
  ```
- **Dimensiones**: `height: 72px; max-width: 420px`.

### Footer

- **NO tagline** frase comercial
- **URL `novalamps.com.pe`** Inter lowercase tracking lima
- **Logo Distinto** en negativo

---

## 🚫 Reglas duras (lo que NO va)

- ❌ Inter ALL CAPS plano como base hero (mi v1 — era Inter sans plano, ahora es Playfair editorial)
- ❌ Orbitron / JetBrains Mono (sci-fi cyberpunk — NO encaja autoridad técnica)
- ❌ Negro puro `#000000` (manual: grafito `#262726`)
- ❌ Escribir "NOVALAMPS" mayúsculas o "novalamps" minúscula (manual: "Novalamps")
- ❌ Tono casual / meme / humor (autoridad técnica)
- ❌ Ofertón "DESDE S/5", "REMATE" (rompe premium)
- ❌ Lima sin glow (debe vibrar sutilmente como un LED)
- ❌ Tagline frase comercial en footer

---

## 🔁 Cómo replicar este estilo en otras piezas

1. **Background**: grafito radial dark `#262726 → #1A1A1A → #0D0D0D` + glow lima central
2. **Barras lima top/bottom** estructurales 2px con glow
3. **Hero**: Playfair Display 600 ALL CAPS blanco — espejo "HACEN DEL ESPACIO"
4. **Sub label**: Inter uppercase tracking lima
5. **Date/labels**: Inter uppercase con underline lima 2px (firma)
6. **Caveat script italic** opcional para palabra destacada ("Día", "MAX", etc.)
7. **Cards blancas** con border-left lima + DD en chip grafito + texto lima
8. **Logo Novalamps** con filter brightness-invert-sepia-hue-rotate(35deg)
9. **Logo Distinto** en negativo blanco con drop-shadow lima
10. **Footer URL = novalamps.com.pe** lima lowercase tracking

---

## 📝 Histórico de iteraciones

| Versión | Cambio | Aprendizaje |
|---|---|---|
| v1 (sesión previa) | Inter 900 ALL CAPS blanco como hero + bloques lima + dot grid + chips | OFF-BRAND. El equipo cliente ya usa Playfair serif editorial, no Inter sans plano. |
| **v2 (22 may 2026)** | **Playfair Display 600 ALL CAPS + serif editorial dark + underline lima como firma + cards blancas con DD en chip grafito** | El post DM 2026 mostró la evolución real del cliente: editorial dark luxury con serif moderna. Replicar fielmente. |

## 🎓 Lecciones aprendidas (para futuras piezas NovaLamps)

1. **El equipo del cliente evolucionó del manual base**. El manual dice Arial sans plano, pero el post DM 2026 usa **Playfair serif moderna editorial**. Cuando hay desfase entre manual y pieza real aplicada, **prima la pieza real** (es la dirección actual del equipo del cliente).

2. **Verde lima `#D2DD00` debe predominar** (manual) pero no como fondo full — como **acento que vibra** (underlines, borders, DD en cards, glow sutil del canvas). Si llena fondo se pierde el premium.

3. **Glow lima en lima** (`box-shadow: 0 0 14px rgba(210,221,0,0.5)`) recrea el efecto LED de las piezas reales del showroom sin necesidad de assets externos. Es la "tecnología LED de vanguardia" del posicionamiento traducida a CSS.

4. **NO Orbitron NO JetBrains Mono** — esas fuentes son sci-fi cyberpunk. Novalamps es premium aspiracional, no futurista. Playfair + Inter = elegancia técnica editorial.

5. **Cards blancas con DD en chip GRAFITO** (no en lima). Si el DD fuera en chip lima, el lima se quemaría visualmente. Chip grafito + DD verde lima es el balance correcto.

6. **Filter `brightness(0) invert(1) sepia(0.3) saturate(2) hue-rotate(35deg)`** convierte el logo negro+lima a blanco con tinte sutil. Si necesitamos más lima en el ícono casa, ajustar `hue-rotate` o usar PNG con canal lima preservado.

7. **Tagline frase comercial OFF**: el footer institucional NovaLamps no necesita "Convierte cada espacio en diseño". El logo + URL alcanzan.

8. **"Novalamps" en texto corrido** (manual: capitalización tipo nombre propio). NUNCA "NOVALAMPS" ni "novalamps". Eso afecta brand-big del header (display:none igual, pero queda en el HTML para SEO/lectores).

9. **Sub-marca "eléctrika"** aparece en el logo oficial como línea premium MAX. Aparece como sub-label en piezas — referenciada en docs `01-marca.md`.

10. **Editorial Luxury Cluster**: NovaLamps, Lozano y La Victoria comparten estructura "dark + color marca + serif editorial + cards claras". Cada una con identidad propia. La Victoria = verde bosque + crema + em-dashes. Lozano = negro azulado + amarillo dorado + barras finas. NovaLamps = grafito + verde lima + underlines.
