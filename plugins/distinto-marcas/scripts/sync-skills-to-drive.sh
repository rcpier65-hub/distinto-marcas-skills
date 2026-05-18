#!/bin/bash
# sync-skills-to-drive.sh
# ─────────────────────────────────────────────────────────
# Sincroniza cada carpeta de skill (marca-X-cliente/) al
# subfolder _SKILL/ dentro de la carpeta de marca correspondiente
# en Google Drive (team@agenciadistinto.com).
#
# Diseño: el repo es la fuente de verdad. Drive es réplica de lectura.
# Usa rsync --delete: si borras un archivo del repo, también desaparece del Drive.
#
# Uso:
#   ./scripts/sync-skills-to-drive.sh         # sync todo
#   ./scripts/sync-skills-to-drive.sh --dry   # ver qué cambiaría sin hacerlo
# ─────────────────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="/Users/pedroreyescalderon/Downloads/1. DISTINTO AGENCIA/distinto-marcas-skills"
DRIVE_ROOT="/Users/pedroreyescalderon/Library/CloudStorage/GoogleDrive-team@agenciadistinto.com/Mi unidad/1. GESTIÓN/CUENTAS"
SKILL_SUBFOLDER="00 - SKILL"

# Modo dry-run: simula sin escribir
DRY_FLAG=""
if [[ "${1:-}" == "--dry" ]] || [[ "${1:-}" == "-n" ]]; then
  DRY_FLAG="--dry-run"
  echo "🔍 DRY RUN — no se escribirán archivos"
  echo ""
fi

# Mapeo: carpeta-skill-en-repo  →  carpeta-marca-en-drive
declare -a MAPPING=(
  "marca-1-muebles-lozano|1. Muebles Lozano"
  "marca-2-manrique|2. Centro Psicológico Manrique ABA"
  "marca-3-distribuidora-fitness|3. Distribuidora Fitness Marketing"
  "marca-4-little-joe|4. Little Joe"
  "marca-5-mil-ideas|5. Mil Ideas"
  "marca-6-kintu|6. Kintu"
  "marca-7-novalamps|7. NovaLamps"
  "marca-8-la-victoria|8. La Victoria"
  "marca-9-oral-beauty|9. Oral Beauty"
)

echo "🔄 Sincronizando 9 skills → Drive ($SKILL_SUBFOLDER/ en cada marca)"
echo ""

SUCCESS=0
WARNINGS=0

for entry in "${MAPPING[@]}"; do
  SKILL_DIR="${entry%%|*}"
  DRIVE_DIR="${entry##*|}"

  SRC="$REPO_ROOT/$SKILL_DIR/"
  DEST="$DRIVE_ROOT/$DRIVE_DIR/$SKILL_SUBFOLDER/"

  if [[ ! -d "$REPO_ROOT/$SKILL_DIR" ]]; then
    echo "⚠️  Skill no existe en repo: $SKILL_DIR — skip"
    WARNINGS=$((WARNINGS+1))
    continue
  fi

  if [[ ! -d "$DRIVE_ROOT/$DRIVE_DIR" ]]; then
    echo "⚠️  Carpeta no existe en Drive: $DRIVE_DIR — skip"
    WARNINGS=$((WARNINGS+1))
    continue
  fi

  # Crear _SKILL/ si no existe (solo si no es dry-run)
  if [[ -z "$DRY_FLAG" ]]; then
    mkdir -p "$DEST"
  fi

  # rsync con excludes para evitar basura y loops
  rsync -a $DRY_FLAG --delete \
    --exclude='.git/' \
    --exclude='.gitignore' \
    --exclude='.DS_Store' \
    --exclude='marca-template/' \
    --exclude="$SKILL_DIR/" \
    "$SRC" "$DEST"

  # Generar README de "no editar aquí" (excepto en dry-run)
  if [[ -z "$DRY_FLAG" ]]; then
    cat > "$DEST/README.md" <<EOF
# ⚠️ NO EDITES NADA EN ESTA CARPETA

Esta carpeta \`$SKILL_SUBFOLDER/\` es una **réplica automática** del repo de skills de marca de Agencia Distinto.
Cualquier cambio que hagas aquí **se sobreescribe** en la próxima sincronización.

---

## 📚 ¿Qué hay acá?

Este es el **contexto de marca** de **$DRIVE_DIR**: voz, audiencia, oferta, pilares de contenido, sensibilidades, competencia, objetivos del mes.
Todo lo que necesitás para producir trabajo agencia-grade sin re-explicar nada.

**Empezá por**:
- \`SKILL.md\` — entry point con tabla de "qué archivo leer para qué tarea"
- \`01-marca.md\` — voz, posicionamiento, identidad
- \`06-objetivos-mes.md\` — tema y KPIs del mes en curso

## ✏️ ¿Necesitás cambiar algo?

| Tipo de cambio | Qué hacer |
|---|---|
| Texto del SKILL (voz, audiencia, oferta, sensibilidades, etc.) | Hablá con Pedro — se edita en el repo |
| Objetivos del mes | Pedro lo regenera el día 1 de cada mes desde Notion |
| Errores, datos desactualizados | Avisá en el grupo de Distinto |
| Ejemplos nuevos on-tone | Compartilos con Pedro para que los agregue al repo |

## 👀 ¿Querés solo leer?

- Cualquier \`.md\` se abre desde Drive (Google Docs lo renderiza bien)
- PDFs y assets de marca están en \`assets/\` y \`documentos/\`
- Calendario de fechas y hashtags en \`calendario/\`

---

🤖 _Última sincronización: $(date '+%Y-%m-%d %H:%M:%S')_
🔗 _Fuente: distinto-marcas-skills/$SKILL_DIR/_
EOF
  fi

  echo "✅ $SKILL_DIR → $DRIVE_DIR/$SKILL_SUBFOLDER/"
  SUCCESS=$((SUCCESS+1))
done

echo ""
echo "─────────────────────────────────────"
echo "✨ Sync completo: $SUCCESS exitosas, $WARNINGS warnings"

if [[ -n "$DRY_FLAG" ]]; then
  echo ""
  echo "💡 Esto fue un dry run. Para aplicar los cambios:"
  echo "   ./scripts/sync-skills-to-drive.sh"
fi
