#!/usr/bin/env bash
# setup.sh — Instala todo lo necesario para correr responder-tiktok
# Uso: bash setup.sh

set -e

cd "$(dirname "$0")"

echo "════════════════════════════════════════════════"
echo "  Setup · responder-tiktok"
echo "════════════════════════════════════════════════"
echo ""

# 1. Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no instalado. Instalalo desde https://www.python.org/downloads/"
    exit 1
fi
PYVER=$(python3 --version | awk '{print $2}')
echo "✅ Python detectado: $PYVER"

# 2. Crear venv si no existe
if [ ! -d ".venv" ]; then
    echo "📦 Creando virtualenv en .venv ..."
    python3 -m venv .venv
fi
echo "✅ Virtualenv listo"

# 3. Activar venv + instalar deps
echo "📦 Instalando dependencias..."
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "✅ Playwright instalado"

# 4. Instalar Chromium si no está
echo "📦 Instalando Chromium para Playwright (puede tardar 1-2 min la primera vez)..."
playwright install chromium
echo "✅ Chromium listo"

echo ""
echo "════════════════════════════════════════════════"
echo "  ✨ Setup completo"
echo "════════════════════════════════════════════════"
echo ""
echo "Próximos pasos:"
echo ""
echo "  1. Activa el entorno cuando trabajes:"
echo "     source .venv/bin/activate"
echo ""
echo "  2. Captura sesión de Manrique (la única que ya tiene handle):"
echo "     python scripts/primer_login.py --marca manrique"
echo ""
echo "  3. Para las otras marcas, pasa el handle:"
echo "     python scripts/primer_login.py --marca lozano --handle <handle_real>"
echo ""
echo "  4. Para leer comentarios:"
echo "     python scripts/leer_comentarios.py --marca manrique"
echo ""
echo "  5. Para correr el lote sobre todas las marcas activas:"
echo "     python scripts/responder_lote.py --modo leer"
echo ""
