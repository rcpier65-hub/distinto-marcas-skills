# 🧠 Distinto Marcas Skills

> Sistema operativo de marca para Agencia Distinto.
> Skills de Claude Code que cargan el contexto completo de cada cliente para producir
> contenido, estrategia, copy y atención al cliente con consistencia agencia-grade.

---

## 📚 ¿Qué es esto?

Cada cliente activo de Agencia Distinto tiene su propia **skill de Claude Code** que contiene:

- **Voz de marca** documentada (posicionamiento, tono, vocabulario)
- **Audiencia detallada** (personas, journey, lenguaje real)
- **Catálogo de oferta** completo con precios
- **Estrategia de contenido** (pilares, series, calendario)
- **Análisis competitivo**
- **Sensibilidades del cliente**
- **Objetivos del mes** (vivos, se actualizan día 1)
- **Rubric de auto-evaluación** (on-brand vs off-brand)

Cuando el equipo invoca la skill (ej. `/marca-manrique`), Claude carga TODO ese contexto
y produce output consistente sin necesidad de re-explicar nada.

---

## 🎯 Marcas activas (9)

| # | Carpeta | Cliente | Estado |
|---|---|---|---|
| 1 | `marca-1-muebles-lozano/` | Muebles Lozano | 🚧 Pendiente |
| 2 | `marca-2-manrique/` | Centro Psicológico Manrique ABA | ✅ Operativa |
| 3 | `marca-3-distribuidora-fitness/` | Distribuidora Fitness Marketing | 🚧 Pendiente |
| 4 | `marca-4-little-joe/` | Little Joe | 🚧 Pendiente |
| 5 | `marca-5-mil-ideas/` | Mil Ideas | 🚧 Pendiente |
| 6 | `marca-6-kintu/` | Kintu | 🚧 Pendiente |
| 7 | `marca-7-novalamps/` | NovaLamps | 🚧 Pendiente |
| 8 | `marca-8-la-victoria/` | La Victoria | 🚧 Pendiente |
| 9 | `marca-9-oral-beauty/` | Oral Beauty | 🚧 Pendiente |

Plus:
- `marca-template/` — plantilla maestra (35 archivos) usada para instanciar cada cliente nuevo

---

## 🚀 Instalación (para cada miembro del equipo)

### Pre-requisito
Tener Claude Code instalado en tu Mac.

### Paso 1 — Clonar el repo
```bash
mkdir -p ~/dev
cd ~/dev
git clone git@github.com:rcpier65-hub/distinto-marcas-skills.git
```

### Paso 2 — Linkear las skills a Claude Code
```bash
cd ~/dev/distinto-marcas-skills

# Symlink cada marca activa al directorio que Claude lee
for dir in marca-*; do
  # Extraer el nombre "marca-X" sin el número del medio
  # ej. marca-2-manrique → marca-manrique
  short_name=$(echo "$dir" | sed -E 's/marca-[0-9]+-/marca-/')
  ln -s "$(pwd)/$dir" ~/.claude/skills/"$short_name"
done

# También linkear el template
ln -s "$(pwd)/marca-template" ~/.claude/skills/marca-template
```

### Paso 3 — Verificar
Abrir una sesión nueva de Claude Code. Las skills `marca-manrique`, `marca-template`, etc.
deberían aparecer en el listado de skills disponibles.

Probar invocando: `/marca-manrique` y pedir "armame un reel de 30s sobre la importancia del ADOS-2".

---

## 📅 Mantenimiento mensual

### El día 1 de cada mes

Para cada cliente activo, actualizar `06-objetivos-mes.md` con:
- Tema unificador del mes
- Campañas activas
- KPIs con metas numéricas
- Lanzamientos / eventos del mes
- Presupuesto disponible

```bash
cd ~/dev/distinto-marcas-skills
# Editar marca-X-cliente/06-objetivos-mes.md de cada cliente
git add .
git commit -m "Mes mayo 2026: actualización objetivos mensuales"
git push
```

Cada miembro del equipo hace `git pull` y tiene los objetivos al día.

---

## ➕ Cómo agregar una marca nueva

```bash
cd ~/dev/distinto-marcas-skills

# 1. Copiar template
cp -r marca-template marca-X-nuevo-cliente

# 2. Reemplazar placeholders
cd marca-X-nuevo-cliente
find . -type f \( -name "*.md" -o -name "*.txt" \) -exec sed -i '' \
  's/{{cliente}}/nuevo-cliente/g; s/{{Cliente}}/Nombre Completo del Cliente/g' {} +

# 3. Llenar los TODOs con datos reales (Notion + Drive + cliente)
# Empezar por: 01-marca, 02-audiencia, 03-oferta-presencia, 05-cliente

# 4. Symlinkear a Claude Code
ln -s "$(pwd)" ~/.claude/skills/marca-nuevo-cliente

# 5. Commit y push
cd ..
git add marca-X-nuevo-cliente
git commit -m "Add: marca-nuevo-cliente"
git push
```

---

## 🏗️ Estructura interna de cada skill

Cada `marca-X-cliente/` contiene:

```
marca-X-cliente/
├── SKILL.md                ← entry point (frontmatter + tabla de tareas)
├── INTAKE.md               ← cuestionario de levantamiento
│
├── 01-marca.md             ← posicionamiento + voz + identidad
├── 02-audiencia.md         ← personas + journey + lenguaje
├── 03-oferta-presencia.md  ← productos + URLs + handles
├── 04-contenido.md         ← pilares + series + calendario
├── 05-cliente.md           ← decisor + sensibilidades
├── 06-objetivos-mes.md     ← VIVO (cambia día 1)
├── 07-rubric.md            ← criterios on/off-brand
├── 08-competencia.md       ← top 10 competidores
│
├── ejemplos/               ← few-shot prompting
├── referencias/            ← consulta on-demand (paid, partners, legal, AI...)
├── documentos/             ← canon pesado (PDFs/Excels)
├── calendario/             ← fechas + hashtags
└── assets/                 ← visuales + extracts
```

---

## 🤝 Contribución

1. **No hacer push directo a main** sin revisar al menos un par
2. **Cada cambio en voz/posicionamiento** requiere validación con Daniel Manrique (o decisor del cliente respectivo)
3. **Actualizaciones de objetivos mensuales** las puede hacer cualquier CM/account manager
4. **Cambios estructurales al template** requieren consenso del equipo

---

## 📞 Contacto

**Agencia Distinto S.A.C.**
- Web: [agenciadistinto.com](https://agenciadistinto.com)
- WhatsApp: 983 852 191
- Owner del repo: rcpier65-hub
