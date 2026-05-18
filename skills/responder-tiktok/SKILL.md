---
name: responder-tiktok
description: Lee comentarios pendientes de TikTok de cualquier marca de Distinto Agencia y genera un Excel en Drive con borradores on-brand listos para que Pedro responda manualmente. Activar cuando el usuario diga "revisa comentarios y generame la hoja de [marca]", "revisa tiktok de [marca]", "saca los comentarios de [marca]", "actualiza el inbox tiktok de [marca]", o variaciones. Genera/actualiza el archivo "Inbox TikTok - [Marca].xlsx" en `Drive/GESTIÓN/CUENTAS/[Marca]/Inbox TikTok/` con una hoja nueva por cada revisión.
---

# Responder TikTok — Workflow Excel-en-Drive

> Skill que automatiza la **lectura + clasificación + generación de borradores** on-brand para los comentarios de TikTok de cualquier marca. **NO postea automáticamente** (TikTok bloquea silenciosamente toda automatización). El resultado se guarda como hoja de Excel dentro del Drive en la carpeta de cada marca, y Pedro la abre para responder uno por uno manualmente.

## 🚨 LIMITACIÓN TÉCNICA CONFIRMADA (mayo 2026)

TikTok aplica **bloqueo silencioso a nivel backend** para cualquier intento de postear automático — incluso desde Chrome con sesión real del usuario. El frontend muestra "Comentario publicado" pero el POST request es descartado. Esto fue verificado con:

- ❌ Playwright headless con storage_state
- ❌ Patchright (Playwright undetectable)
- ❌ Chrome MCP click manual paso a paso (Chrome real del usuario)
- ❌ TikTok Business API (solo permite responder ads, no comentarios orgánicos)

**Conclusión**: La automatización TikTok se limita a **leer** y **generar borradores**. Postear es manual.

## ⚡ Cuándo activar

Activar **siempre** que el usuario pida:

- "Revisa los comentarios de TikTok de [marca]"
- "Generame la hoja para responder TikTok de [marca]"
- "Revisa comentarios y generame la hoja de [marca]"
- "Saca los comentarios de [marca]"
- "Actualiza el inbox TikTok de [marca]"
- "TikTok inbox: [marca]"

Donde `[marca]` puede ser: Manrique, Lozano, Distribuidora Fitness, Kintu, Novalamps, La Victoria, Mil Ideas, Little Joe, Oral Beauty.

## 📋 Reglas absolutas

1. **NUNCA postear automático** — TikTok bloquea silenciosamente. El trabajo termina cuando el Excel está en Drive.
2. **NUNCA inventar borradores off-tone** — cada marca tiene su archivo en `tonos/<marca>.md` y su skill `marca-X-<cliente>`. Si no hay tono definido, avisar al usuario y NO operar.
3. **SIEMPRE leer la skill de marca** (`marca-X-cliente`) para voz, sensibilidades y datos clave (WhatsApp, dirección, productos) antes de generar borradores.
4. **NUNCA enviar mensajes al WhatsApp del cliente** sin aprobación explícita de Pedro en el chat. Esta regla es **innegociable** (ver `memory/user_pedro_distinto.md`).
5. **Marca columna "Acción"** en el Excel con uno de: `responder` / `escalar` / `skip`.
6. **Para "escalar"**: dejar en la columna "Borrador" la razón entre corchetes `[ESCALAR — razón]`.
7. **Cada respuesta debe respetar el límite TikTok de 150 caracteres**.
8. **Para comentarios sin match (nuevos / inesperados)**: marcar como `skip` con borrador `[Sin borrador asignado — clasificar manual]`.

---

## 🗺️ Workflow completo

### Paso 1 — Identificar la marca

Extraer del mensaje del usuario qué marca. Validar contra `marcas.json`:

```bash
cat skills/responder-tiktok/marcas.json
```

Verificar:
- `activo: true` (si no, avisar y pedir cookies frescas)
- `auth_file` existe (`auth/<marca>.json`)
- `drive_folder_name` configurada (nombre exacto de la carpeta en Drive)

### Paso 2 — Leer comentarios pendientes con Patchright

```bash
cd skills/responder-tiktok
source .venv/bin/activate
python scripts/leer_comentarios.py --marca <slug> --limite 200 --solo-no-respondidos
```

Esto genera `logs/<marca>_leer_<fecha>.json` y `logs/<marca>_actual.json` con los comentarios sin respuesta.

Características técnicas:
- Usa **Patchright** (Playwright parcheado para evadir detección DOM)
- Lee con cookies importadas previamente desde Chrome de Pedro
- Extracción acumulativa durante scroll (TikTok virtualiza la lista)
- Aplica filtro "Sin respuesta" del propio TikTok Studio
- Captura: username, texto, tiempo relativo, posición en inbox

### Paso 3 — Generar borradores on-brand

Cargar la skill de marca correspondiente (`marca-X-<cliente>`) para acceder a:
- `01-marca.md` (voz, posicionamiento, emojis on-brand)
- `02-audiencia.md` (perfil de quién comenta)
- `03-oferta-presencia.md` (productos, precios, WhatsApp, dirección)
- `05-cliente.md` (sensibilidades, palabras vetadas)

Aplicar las reglas y generar borradores estructurados. Cada marca tiene su propio generador en `scripts/_generar_borradores_<marca>.py` (modificar/extender según la marca).

El generador produce `logs/<marca>_borradores.json` (o `_v2.json`) con la estructura:

```json
{
  "marca": "manrique",
  "generado": "2026-05-16T20:00:00",
  "total_comentarios": 57,
  "resumen": {"responder": 54, "escalar": 1, "skip": 2, "sin_match": 0},
  "borradores": [
    {
      "username": "berisa060510",
      "texto_original": "Pues es lo más acertado lo que comenta...",
      "tiempo": "hace 2 d",
      "categoria": "aporte",
      "accion": "responder",
      "borrador": "Gracias por el aporte 🌱 Coincidimos en que..."
    }
  ]
}
```

Categorías estándar:
- `compliment` — agradecimiento corto
- `precio` — derivar a WhatsApp
- `ubicacion` — dirección + WhatsApp
- `info_corto` — derivar a WhatsApp
- `oferta` — pregunta específica (adultos, virtual, etc.)
- `clinico` — consulta sensible (Manrique) → validar + derivar
- `aporte` — opinión profesional del usuario → agradecer
- `respuesta_tecnica` — críticas técnicas → respuesta firme (Manrique)
- `queja` / `critica_*` → **ESCALAR**
- `etiqueta` — mención a otro user → SKIP

### Paso 4 — Crear/actualizar Excel en Drive

```bash
python scripts/generar_hoja_inbox.py --marca <slug>
```

Esto:
1. Busca el archivo `Inbox TikTok - [Marca].xlsx` en:
   ```
   ~/Library/CloudStorage/GoogleDrive-team@agenciadistinto.com/Mi unidad/1. GESTIÓN/CUENTAS/[N. Marca]/Inbox TikTok/
   ```
2. Si no existe: lo crea (con la carpeta padre si hace falta).
3. Agrega una hoja nueva con timestamp `YYYY-MM-DD HH-MM`.
4. Pobla 7 columnas:
   - **Usuario** (con @)
   - **Tiempo** (ej. "hace 2 d")
   - **Comentario** (texto original)
   - **Borrador** (respuesta lista para copiar)
   - **Acción** (responder/escalar/skip)
   - **Categoría**
   - **Video / Link** (vacío por ahora, futuro)
5. Aplica colores: verde (responder), rojo (escalar), gris (skip).
6. Freeze panes en header, anchos auto, wrap text.

### Paso 5 — Reportar a Pedro

Mensaje en el chat (NUNCA al WhatsApp del cliente):

```
✅ Inbox TikTok actualizado para [Marca]

📊 Total comentarios sin respuesta: N
   ✅ Responder: X
   🚨 Escalar (tu decisión): Y
   🚫 Skip: Z

📂 Ubicación:
   Drive/GESTIÓN/CUENTAS/[N. Marca]/Inbox TikTok/
   Inbox TikTok - [Marca].xlsx

🗓️ Hoja nueva: '2026-MM-DD HH-MM'

🚨 Para escalar (necesito tu decisión):
   • @usuario1: "comentario..." — Razón
   • @usuario2: "comentario..." — Razón
```

---

## 📂 Estructura final en Drive

```
Mi unidad/
└── 1. GESTIÓN/
    └── CUENTAS/
        ├── 1. Muebles Lozano/
        │   └── Inbox TikTok/
        │       └── Inbox TikTok - Muebles Lozano.xlsx
        │           ├── Hoja: 2026-05-16 09-00
        │           ├── Hoja: 2026-05-17 18-30
        │           └── ...
        ├── 2. Centro Psicológico Manrique ABA/
        │   └── Inbox TikTok/
        │       └── Inbox TikTok - Manrique.xlsx
        ├── 4. Little Joe/
        │   └── Inbox TikTok/
        │       └── Inbox TikTok - Little Joe.xlsx
        └── ... (las 9 marcas)
```

**Drive Desktop sincroniza automáticamente** — Pedro abre el archivo desde Drive web, Excel desktop, o Numbers indistintamente.

---

## ⚙️ Setup por marca (una vez)

Para activar una marca:

1. Pedro logea TikTok de esa marca en el perfil Chrome correspondiente
2. Importar cookies a `auth/<marca>.json`:
   ```bash
   python scripts/importar_cookies_chrome.py --marca <slug> --profile "<Chrome Profile>"
   ```
3. Marca queda `activo: true` en `marcas.json` automáticamente

Mapeo perfiles Chrome → marcas (validado):
| Perfil Chrome | Marca |
|---|---|
| `Default` (rcpier65@gmail.com) | Manrique |
| `Profile 6` (littlejoeperu) | Little Joe |
| `Profile 13` (kintuoils) | Kintu |
| `Profile 16` (novalamps.mkt) | Novalamps |
| `Profile 8` (magusminorista) | Mil Ideas (¿?) |
| `Profile 14` (diplocapsalud03) | Distribuidora Fitness (¿?) |
| (otros) | _por confirmar_ |

Cookies de TikTok duran ~60 días. Cuando expiren, reimportar con el mismo comando.

---

## 🚨 Manejo de errores

| Error | Acción |
|---|---|
| `auth/<marca>.json` no existe | Avisar a Pedro: necesita logear en Chrome + importar cookies |
| Cookies expiradas (redirect a /login) | Avisar a Pedro que reimporte cookies |
| Carpeta Drive no encontrada | Avisar a Pedro la ruta esperada |
| Borradores sin tono on-brand | NO operar. Avisar que falta `tonos/<marca>.md` |
| TikTok cambió el DOM (selectores rotos) | Logear screenshot, avisar para actualizar `leer_comentarios.py` |
| Skill de marca no existe | NO operar. Avisar a Pedro |

---

## 📎 Referencias

- ⚙️ Config marcas: `marcas.json`
- 🔑 Cookies guardadas: `auth/<marca>.json` (gitignored)
- 🧠 Tonos por marca: `tonos/<marca>.md` (referencia en skill marca-X)
- 📊 Borradores JSON: `logs/<marca>_borradores.json`
- 📝 Logs ejecución: `logs/<marca>_<fecha>.json`
- 📁 Excel destino: Drive sincronizado en `~/Library/CloudStorage/...`
- 🎨 Voz por marca: `../marca-X-<cliente>/01-marca.md`
- 💛 Memoria de Pedro: `~/.claude/projects/.../memory/user_pedro_distinto.md`

---

## ⚠️ Limitaciones honestas

1. **No se puede postear** automatizado. Solo lectura + borradores.
2. **TikTok cambia el DOM** cada 2-3 meses. Cuando los selectores en `leer_comentarios.py` se rompan, hay que actualizarlos (15-30 min de fix).
3. **Detección anti-bot**: Patchright es lo más robusto disponible (mayo 2026). Si en el futuro TikTok bloquea hasta la lectura, evaluar `playwright-stealth` o `rebrowser-playwright`.
4. **Multi-cuenta limitado a perfiles Chrome separados**: 1 cookie set por marca. Para operar 9 marcas, las 9 cuentas TikTok deben estar logueadas en perfiles Chrome separados.

---
Versión: 2.0.0 · Última actualización: 16 mayo 2026
