#!/usr/bin/env bash
# ============================================================
#  build.sh — renderiza la grilla semanal Novalamps a PNG
# ============================================================
#  Uso:
#     bash build.sh <html-file> [output-png-name]
#
#  Ejemplo:
#     bash build.sh grilla-2026-W21.html grilla-novalamps-18-24-may.png
#
#  Output:
#     PNG 1080×1620 en /tmp/distinto-grilla/
#
#  Requisitos:
#     - macOS con Chrome instalado en la ruta estándar
#     - `sips` (incluido en macOS)
# ============================================================
set -euo pipefail

HTML_FILE="${1:-}"
OUT_NAME="${2:-grilla-novalamps.png}"

if [[ -z "$HTML_FILE" ]]; then
  echo "❌ Falta el HTML. Uso: bash build.sh <html-file> [output.png]"
  exit 1
fi

if [[ ! -f "$HTML_FILE" ]]; then
  echo "❌ No existe: $HTML_FILE"
  exit 1
fi

# Rutas
HTML_ABS="$(cd "$(dirname "$HTML_FILE")" && pwd)/$(basename "$HTML_FILE")"
WORK_DIR="/tmp/distinto-grilla"
mkdir -p "$WORK_DIR"

# Ruta del logo (en Drive del cliente — path absoluto fijo)
LOGO_SOURCE="/Users/pedroreyescalderon/Library/CloudStorage/GoogleDrive-team@agenciadistinto.com/Mi unidad/1. GESTIÓN/CUENTAS/7. NovaLamps/01 - IDENTIDAD DE MARCA/LOGO/PNG/logo-novalamps-blanco-verde.png.png"

if [[ ! -f "$LOGO_SOURCE" ]]; then
  echo "❌ No se encontró el logo en Drive: $LOGO_SOURCE"
  echo "   Verificá que Google Drive esté sincronizado y la carpeta exista."
  exit 1
fi

# Copiar + recortar logo al área útil (880×280)
cp "$LOGO_SOURCE" "$WORK_DIR/logo-novalamps-source.png"
sips -c 280 880 "$WORK_DIR/logo-novalamps-source.png" \
  --out "$WORK_DIR/logo-novalamps-blanco-cropped.png" >/dev/null

# Copiar el HTML al work dir (para que el <img> resuelva al mismo nivel)
cp "$HTML_ABS" "$WORK_DIR/grilla.html"

# Render con Chrome headless a 2x para tipografía crisp
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -f "$CHROME" ]]; then
  echo "❌ Chrome no instalado en la ruta estándar."
  echo "   Ajustá la variable CHROME en este script."
  exit 1
fi

echo "→ Renderizando con Chrome headless (2x)..."
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 \
  --window-size=1080,1620 \
  --virtual-time-budget=8000 \
  --default-background-color=00000000 \
  --screenshot="$WORK_DIR/render-2x.png" \
  "file://$WORK_DIR/grilla.html" 2>/dev/null

# Downscale 2x → 1x para tipografía limpia
echo "→ Downscaling a 1080×1620..."
sips -z 1620 1080 "$WORK_DIR/render-2x.png" \
  --out "$WORK_DIR/$OUT_NAME" >/dev/null

# Verificar dimensiones
DIM=$(sips -g pixelWidth -g pixelHeight "$WORK_DIR/$OUT_NAME" | grep pixel | tr -d ' ')
SIZE=$(ls -la "$WORK_DIR/$OUT_NAME" | awk '{print $5}')

echo ""
echo "✅ Listo: $WORK_DIR/$OUT_NAME"
echo "   $DIM"
echo "   Tamaño: $SIZE bytes"
echo ""
echo "→ Para previsualizar: open $WORK_DIR/$OUT_NAME"
