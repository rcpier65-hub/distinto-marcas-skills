# Inventario de Drive — Novalamps

> Mapa de assets de Drive + Notion + datos comerciales.

---

## 📁 Carpetas Drive principales

> ⚠️ **Pendiente registrar IDs de carpetas Drive principales** — pedir a coordinación.

Estructura esperada (replicar de otras marcas Distinto):
- Drive Oficial Gestión
- Drive Oficial Tomas Crudas
- Carpeta de fotografías compartidas
- Carpeta showroom (referencias visuales)

---

## 🗂️ Estructura interna estándar

```
7. Novalamps/
├── 02 - ESTRATEGIA Y PLANIFICACION/
├── 03 - GUIONES Y COPYS/
├── 06 - CARRUSELES/
├── 08 - PORTADAS Y MINIATURAS/
├── 09 - ANUNCIOS (ADS)/
├── 10 - FOTOGRAFIA/
├── 11 - RECURSOS DE EDICION/
├── 12 - INFORMES/
├── 13 - GESTION COMERCIAL/
├── 14 - WEB/
└── 15 - MATERIAL DE VIDEO/
```

---

## 📄 Documentos canon

### Brand book formal
- **Estado**: ⚠️ NO localizado todavía — pedir al cliente

### Brief inicial
- **Notion (proyecto)**: `2f69187320008093adaaed84cb5a24b9` — "7. NovaLamps"
- **Estado**: activo desde enero 2026

### Catálogo línea MAX (tríptico)
- **Estado**: ⚠️ Pendiente adjuntar al sistema (mencionado en propuesta colab)
- **Líneas MAX**: aluminio, vidrio, mármol, clásico, madera

### Catálogo de productos
- **Web oficial**: https://novalamps.com.pe/
- **Sección /fixture**: catálogo de luminarias

---

## 🎨 Logos oficiales — paths confirmados (Drive)

> ✅ Validado 18 May 2026 al generar la primera grilla semanal automatizada.

**Carpeta raíz Drive del cliente** (cwd típico al trabajar Novalamps):
```
Mi unidad/1. GESTIÓN/CUENTAS/7. NovaLamps/
```

### Archivos oficiales del logo principal

| Versión | Path desde la raíz Novalamps | Uso |
|---|---|---|
| **Negro-verde** (sobre fondo claro) | `01 - IDENTIDAD DE MARCA/LOGO/PNG/logo-novalamps-negro-verde.png.png` | Piezas con fondo blanco/claro. Contiene wordmark "novaLamps" + tagline "En iluminación lo tenemos todo" + símbolo lima dentro de la "o". |
| **Blanco-verde** (sobre fondo oscuro) | `01 - IDENTIDAD DE MARCA/LOGO/PNG/logo-novalamps-blanco-verde.png.png` | Piezas con fondo grafito/oscuro. Versión negativa con texto blanco. **Usado en la grilla semanal canónica.** |

> ⚠️ Ambos archivos tienen **doble extensión `.png.png`** — no es typo, está así en Drive. Respetar el nombre exacto.

> ⚠️ Dimensiones nativas: **1081 × 1081 px** con mucho whitespace alrededor del wordmark. Para usar en composición, recortar al área útil con:
> ```bash
> sips -c 280 880 logo-novalamps-blanco-verde.png.png --out logo-cropped.png
> ```

### 🪤 Trampa documentada — PNG blanco transparente

El archivo `logo-novalamps-blanco-verde.png.png` tiene el wordmark en **blanco sobre fondo transparente**. Al previsualizarlo en herramientas con fondo claro (como `Read` de Claude Code, Preview en macOS sin tema oscuro, GitHub PR diffs), **solo se ve el isotipo lima** y el wordmark blanco queda invisible — lo que puede llevar a descartarlo creyendo que es solo el símbolo.

**Verificación correcta**: componerlo sobre un fondo grafito antes de descartar. Ejemplo rápido:
```html
<body style="background:#262726;"><img src="logo-novalamps-blanco-verde.png.png" width="600"></body>
```

### ⛔ Archivos que NO son el logo principal

La carpeta `01 - IDENTIDAD DE MARCA/LOGOS MARCAS NOVALAMPS/PNG/` contiene archivos llamados **"Mesa de trabajo 1 copia X"** (nombres genéricos de Adobe Illustrator). Estos son logos de **sub-marcas y líneas de producto**, no del logo principal:

- `Mesa de trabajo 1.png` → logo "novaLamps eléctrika" (sub-marca, con símbolo naranja casita/wifi)
- `Mesa de trabajo 1 copia.png` → logo línea QUIMERA
- `Mesa de trabajo 1 copia 2.png` → logo línea AMBER PLUS
- (etc. — cada uno es una línea distinta)

⚠️ **Nunca usar archivos "Mesa de trabajo X" como logo principal.** Para el logo principal usar siempre los `logo-novalamps-*.png.png` documentados arriba.

### Paleta oficial complementaria

| Color | Hex | Pantone | Uso |
|---|---|---|---|
| Verde lima | `#D2DD00` | 389 C | Acentos, símbolo, predominar |
| Grafito | `#262726` | 419 C | Fondos oscuros, texto principal |
| Blanco | `#FFFFFF` | — | Fondos claros, versión negativa |

**Combinación canónica del manual** (la que usa la grilla semanal): verde lima `#D2DD00` sobre grafito `#262726` → "impacto de marca".

---

## 🎬 Producciones / series identificadas

### Programa colab arquitectas/diseñadoras (activo)
> **Henry (CM Distinto)** envía outreach personalizado.
> **Distinto se encarga de**: guiones, filmación, edición.
> **Locación**: showroom Surco.
> **Producto**: contenido para Novalamps + para la arquitecta colaboradora (win-win).

| Colaboradora | Estado | IG | TikTok |
|---|---|---|---|
| **Yanilet** (yaniletmilagrosarq.interior) | ✅ LISTO | https://instagram.com/yaniletmilagrosarq.interior | https://tiktok.com/@yaniletarq.interior |
| **Flavia Vega** (flaviavega.studio) | ✅ LISTO | https://instagram.com/flaviavega.studio | https://tiktok.com/@flaviavega.studio |
| **Kaori** (kao_interiorismo) | ✅ LISTO | https://instagram.com/kao_interiorismo | https://tiktok.com/@kaointeriorismo |
| **Coval Studio** (coval.studio) | 📋 Pipeline | https://instagram.com/coval.studio | https://tiktok.com/@coval.studio |

### Series internas
- Showcase línea MAX por acabado (5 acabados = 5 episodios)
- "Cómo elegir [producto]" educativo
- Tour showroom

---

## 🎨 Tono visual (de IG @novalamps.peru)

**Hashtags canon documentados**:
- #luxuryhomes
- #interruptores
- #iluminacion
- #élégante
- #moderno

**Frases canon documentadas (post línea MAX)**:
- "Convierte cada espacio en diseño."
- "La línea MAX combina estilo y funcionalidad con acabados que se adaptan a tu hogar."
- "Aluminio moderno, vidrio elegante, mármol sofisticado, clásico versátil y madera cálida."
- "Elige el detalle que transforma tu espacio."
- "Para consultas y asesorías en tus proyectos."

---

## 🎬 Top videos publicados

> Pendiente registrar 5-10 mejores por engagement.

**Reels publicados identificados**:
- Reel línea MAX (mencionado en colabs Notion): https://www.instagram.com/p/DWkQqI3D8s7/

---

## 🚫 Carpetas a NO tocar

- Carpetas marcadas como "INTERNO NOVAELEC SAC"
- Material no aprobado por director

---

## 📎 Acceso rápido

```
🌐 Web cliente:                 https://novalamps.com.pe/
📱 Instagram:                   https://www.instagram.com/novalamps.peru/
👥 Facebook:                    https://www.facebook.com/Novalamps/
📲 WhatsApp Línea MAX:         949 462 622
📞 WhatsApp Oficina:            +51 1 4300117
📧 Email ventas:                ventas@novalamps.com.pe
🏛️ Showroom:                   Av. Caminos del Inca 1457, Surco, Lima
🆔 Razón social:                NOVAELEC SAC
📄 Notion proyecto:             https://www.notion.so/2f69187320008093adaaed84cb5a24b9
✏️ CM Distinto / Outreach:      Henry
```
