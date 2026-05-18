#!/usr/bin/env bash
# test_escuchar.sh — Prueba manual del listener de Rubi
#
# Antes de instalar el launchd, corre esto para verificar que:
# 1. El claude CLI funciona en modo headless
# 2. Rubi MCP responde
# 3. El parser de comandos parsea bien
#
# Uso:
#   ./test_escuchar.sh                # prueba completa
#   ./test_escuchar.sh parser         # solo parser (rápido)
#   ./test_escuchar.sh once           # 1 polling real

set -euo pipefail

cd "$(dirname "$0")"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

modo="${1:-full}"

# ============================================================
# 1. Parser local (siempre)
# ============================================================
echo "▶ Probando router_comandos.py..."

casos=(
    ">> revisa tiktok manrique|revisar-tiktok|manrique"
    ">> ya respondi tiktok little joe|cerrar-tiktok|little-joe"
    ">> haz la grilla lozano|grilla|lozano"
    ">> pendientes|pendientes|"
    ">> help|help|"
    ">> status|status|"
    "/distinto saludos hoy|saludos-hoy|"
)

for caso in "${casos[@]}"; do
    IFS='|' read -r comando esperado_accion esperado_marca <<< "$caso"
    output=$(python3 router_comandos.py "$comando" 2>/dev/null || true)
    accion=$(echo "$output" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accion',''))")
    marca=$(echo "$output" | python3 -c "import sys,json; print(json.load(sys.stdin).get('marca','') or '')")

    if [ "$accion" = "$esperado_accion" ] && [ "$marca" = "$esperado_marca" ]; then
        ok "$comando → $accion${esperado_marca:+ ($marca)}"
    else
        fail "$comando → esperaba ($esperado_accion, $esperado_marca), got ($accion, $marca)"
    fi
done

[ "$modo" = "parser" ] && { ok "Parser OK"; exit 0; }

# ============================================================
# 2. Claude CLI disponible
# ============================================================
echo ""
echo "▶ Verificando claude CLI..."

if ! command -v claude >/dev/null 2>&1; then
    fail "claude no encontrado en PATH"
fi
ok "claude $(/usr/local/bin/claude --version 2>&1 | head -1)"

# ============================================================
# 3. Polling real (1 ciclo)
# ============================================================
if [ "$modo" = "once" ] || [ "$modo" = "full" ]; then
    echo ""
    echo "▶ Corriendo 1 polling real (puede tardar ~30-60s)..."
    warn "Esto invoca Claude CLI con permissions bypass — autoriza si te pregunta"

    if python3 escuchar_rubi.py; then
        ok "Polling completado"
        echo ""
        echo "Últimas líneas del log:"
        tail -10 ~/.distinto/rubi.log 2>/dev/null || echo "(sin log aún)"
    else
        fail "Polling falló — ver ~/.distinto/rubi_err_*.log"
    fi
fi

echo ""
ok "Listo. Si todo OK, instala el launchd con:"
echo "    cp com.distinto.escuchar-rubi.plist ~/Library/LaunchAgents/"
echo "    launchctl load ~/Library/LaunchAgents/com.distinto.escuchar-rubi.plist"
