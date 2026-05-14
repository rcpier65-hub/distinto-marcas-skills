# 🧠 Distinto Marcas — Plugin de Claude Code

> Sistema operativo de marca para Agencia Distinto.
> **Plugin oficial** con las 9 skills de los clientes activos: voz, audiencia,
> oferta, KPIs, sensibilidades, competencia y objetivos del mes.

---

## ⚡ Instalación rápida (1 comando)

Cualquier miembro del equipo, en su Claude Code:

```bash
/plugin marketplace add https://github.com/rcpier65-hub/distinto-marcas-skills
/plugin install distinto-marcas
```

Eso es todo. Las 9 skills de marca quedan disponibles automáticamente en cualquier sesión de Claude.

Cuando se actualice algo (paleta, objetivos del mes, voz), el dueño del repo hace `git push` y cada miembro corre `/plugin update distinto-marcas`.

---

## 📚 ¿Qué incluye?

Un plugin Claude Code con **9 skills de marca**, una por cliente activo:

| # | Skill | Cliente | Sector |
|---|---|---|---|
| 1 | `marca-1-muebles-lozano` | Muebles Lozano SAC | Mobiliario / Hogar |
| 2 | `marca-2-manrique` | Centro Psicológico Manrique ABA | Salud mental / Neurodesarrollo |
| 3 | `marca-3-distribuidora-fitness` | Distribuidora Fitness Mayorista | Suplementos / Deporte |
| 4 | `marca-4-little-joe` | Little Joe Perú | Aromatizantes italianos |
| 5 | `marca-5-mil-ideas` | Mil Ideas Perú | Decoración premium |
| 6 | `marca-6-kintu` | Kintu Essential Oils | Wellness / Aromaterapia |
| 7 | `marca-7-novalamps` | Novalamps Eléctrika | Iluminación LED |
| 8 | `marca-8-la-victoria` | La Victoria | Distribuidora de pino |
| 9 | `marca-9-oral-beauty` | Oral Beauty | Salud dental / Belleza |

Cada skill carga automáticamente cuando el equipo trabaja contenido, copy, estrategia, atención al cliente o paid media para ese cliente.

### Cada skill contiene

- **`01-marca.md`** — Posicionamiento, voz, identidad visual oficial
- **`02-audiencia.md`** — Personas, journey, lenguaje real
- **`03-oferta-presencia.md`** — Productos, precios, URLs, handles
- **`04-contenido.md`** — Pilares, series, calendario, reglas
- **`05-cliente.md`** — Decisor, sensibilidades, proceso de aprobación
- **`06-objetivos-mes.md`** — Vivo, se regenera el día 1 de cada mes
- **`07-rubric.md`** — Criterios on-brand / off-brand
- **`08-competencia.md`** — Top 10 competidores + diferenciación
- **`assets/`** — Logos, paleta de colores, fuentes, brand book
- **`documentos/`** — PDFs, Excels, manuales originales del cliente
- **`ejemplos/`** — Piezas on-tone documentadas (few-shot)
- **`referencias/`** — Paid media, partners, AI assets, respuesta de comunidad
- **`calendario/`** — Fechas de marca, sector, nacionales + hashtag bank

---

## 🛠️ Cómo usar las skills

Una vez instalado el plugin, las skills se activan automáticamente cuando Claude detecta que estás trabajando con esa marca. Por ejemplo:

```
> Armame un reel de 30s para Manrique sobre la importancia del ADOS-2
```

Claude detecta "Manrique" → carga la skill `marca-2-manrique` → produce un reel con la voz, sensibilidades y formato correcto del cliente.

También podés invocarlas explícitamente si querés forzar el contexto:

```
> Usá la skill marca-3-distribuidora-fitness para escribir el copy del lanzamiento de proteínas
```

---

## 📅 Mantenimiento del plugin

### Día 1 de cada mes — actualizar objetivos

El owner del repo edita `skills/marca-X/06-objetivos-mes.md` de cada cliente:

```bash
cd ~/dev/distinto-marcas-skills
# editar los 9 archivos 06-objetivos-mes.md
git add -A
git commit -m "Mayo 2026: actualización objetivos mensuales"
git push
```

Cada miembro del equipo corre:

```bash
/plugin update distinto-marcas
```

y queda con los objetivos del mes al día.

### Cambios estructurales (voz, paleta, nuevos productos)

Mismo flujo: editar skill → commit → push. Actualizar el `version` en `.claude-plugin/plugin.json` (ej. 1.0.0 → 1.0.1) si es un cambio significativo.

---

## ➕ Cómo agregar una marca nueva

```bash
cd ~/dev/distinto-marcas-skills

# 1. Copiar el template
cp -r marca-template skills/marca-X-nuevo-cliente

# 2. Reemplazar placeholders
cd skills/marca-X-nuevo-cliente
find . -type f \( -name "*.md" -o -name "*.txt" \) -exec sed -i '' \
  's/{{cliente}}/nuevo-cliente/g; s/{{Cliente}}/Nombre del Cliente/g' {} +

# 3. Llenar los TODOs con datos reales (Notion + Drive + manual del cliente)
#    Mínimo necesario: 01-marca, 02-audiencia, 03-oferta-presencia, 05-cliente

# 4. Commit y push
cd ../..
git add .
git commit -m "Add: marca-X-nuevo-cliente"
git push
```

Equipo corre `/plugin update distinto-marcas` y la nueva marca está disponible.

---

## 🏗️ Estructura del repositorio

```
distinto-marcas-skills/
├── .claude-plugin/
│   ├── plugin.json          ← Manifest del plugin
│   └── marketplace.json     ← Marketplace (lista de plugins)
│
├── skills/                  ← Las 9 skills cargadas por Claude Code
│   ├── marca-1-muebles-lozano/
│   ├── marca-2-manrique/
│   ├── marca-3-distribuidora-fitness/
│   ├── marca-4-little-joe/
│   ├── marca-5-mil-ideas/
│   ├── marca-6-kintu/
│   ├── marca-7-novalamps/
│   ├── marca-8-la-victoria/
│   ├── marca-9-oral-beauty/
│   └── marca-template/      ← Plantilla para nuevos clientes
│
├── cowork-templates/        ← Templates auxiliares
├── scripts/                 ← Tooling de mantenimiento
└── README.md
```

---

## 🔧 Instalación alternativa (sin plugin)

Si por algún motivo no querés usar el sistema de plugins, podés clonar y symlinkear manualmente:

```bash
git clone https://github.com/rcpier65-hub/distinto-marcas-skills.git ~/dev/distinto-marcas-skills
cd ~/dev/distinto-marcas-skills/skills
for dir in marca-*; do
  ln -s "$(pwd)/$dir" ~/.claude/skills/"$dir"
done
```

Pero recomendamos el método del plugin — sincronización automática y más limpio.

---

## 🤝 Contribución

1. **No push directo a `main`** sin revisar con al menos un par
2. **Cambios en voz/posicionamiento** requieren validación con el decisor del cliente respectivo
3. **Actualizaciones de objetivos mensuales** las puede hacer cualquier CM/account manager
4. **Cambios al template** requieren consenso del equipo
5. **Bump de versión** en `plugin.json` cuando agregás features o reorganizás estructura

---

## 📞 Contacto

**Agencia Distinto S.A.C.**
- Web: [agenciadistinto.com](https://www.agenciadistinto.com)
- Email: team@agenciadistinto.com
- WhatsApp: 983 852 191
- Owner del repo: [rcpier65-hub](https://github.com/rcpier65-hub)

---

🧪 **Versión actual del plugin**: `1.0.0`
📦 **Status**: Las 9 skills operativas (Oral Beauty + Mil Ideas + Little Joe con paleta temporal hasta confirmación de manuales oficiales)
