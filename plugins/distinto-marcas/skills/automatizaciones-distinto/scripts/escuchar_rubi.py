#!/usr/bin/env python3
"""
escuchar_rubi.py — Polling de Rubi WhatsApp para comandos de Pedro

Arquitectura:
    Cron (cada minuto)
        ↓
    Este script
        ↓
    Spawn `claude --print` headless con prompt fijo (prompts/poll_rubi.md)
        ↓
    Claude session efímera:
        - llama whatsapp_get_recent_events
        - filtra por Pedro
        - parsea comandos >>
        - ejecuta acciones
        - responde a Pedro vía Rubi
        ↓
    Logs en ~/.distinto/rubi.log

NO se invoca el MCP de Rubi directamente — los MCPs solo son accesibles
desde dentro de una sesión Claude. Por eso este script es solo un
"despertador" que orquesta sesiones Claude breves.

Uso:
    python3 escuchar_rubi.py          # one-shot poll
    python3 escuchar_rubi.py --daemon # loop infinito (para debugging)

Versión: 0.1.0
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# ============================================================
# Configuración
# ============================================================

SKILL_DIR = Path(__file__).resolve().parent.parent
PROMPT_PATH = SKILL_DIR / "scripts" / "prompts" / "poll_rubi.md"

# Carpeta de estado/logs (persistencia entre invocaciones)
STATE_DIR = Path.home() / ".distinto"
STATE_DIR.mkdir(exist_ok=True)
LOG_FILE = STATE_DIR / "rubi.log"
LOCK_FILE = STATE_DIR / "rubi.lock"
LAST_POLL_FILE = STATE_DIR / "rubi_last_poll.txt"

# Carpeta privada usada como cwd al spawn de claude CLI.
# Adentro tiene el `.mcp.json` con el server Rubi (HTTP a distinto-mcp.fly.dev).
# La CLI carga `.mcp.json` solo si está en cwd — usar --mcp-config no funciona
# en modo --print. La carpeta tiene perms 700 y el JSON 600 (contiene token).
MCP_WORKDIR = STATE_DIR / "workdir"

# Path al binario claude (Cron usa PATH limitado, conviene hardcodear)
CLAUDE_BIN = "/usr/local/bin/claude"

# Timeout duro para no quedar colgado si Claude se atora
CLAUDE_TIMEOUT_SEC = 240  # 4 min

# Pedro's WhatsApp number
PEDRO_NUMBER = "51983852191"


# ============================================================
# Helpers
# ============================================================

def log(msg: str) -> None:
    """Append timestamped line to ~/.distinto/rubi.log."""
    ts = datetime.now().isoformat(timespec="seconds")
    line = f"[{ts}] {msg}\n"
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line)
    # también stdout para cuando se corre manualmente
    print(line, end="")


def acquire_lock() -> bool:
    """
    Lockfile simple para evitar dos invocaciones simultáneas.
    Retorna True si pudimos tomar el lock, False si ya hay otro corriendo.
    """
    if LOCK_FILE.exists():
        # Si el lock tiene más de 5min, asumir crash anterior y romperlo
        age = time.time() - LOCK_FILE.stat().st_mtime
        if age < 300:
            return False
        log(f"⚠️ Lock viejo ({age:.0f}s), rompiéndolo")
        LOCK_FILE.unlink()
    LOCK_FILE.write_text(str(os.getpid()))
    return True


def release_lock() -> None:
    if LOCK_FILE.exists():
        LOCK_FILE.unlink()


def build_prompt() -> str:
    """
    Lee el template y le agrega el timestamp actual para que
    Claude sepa qué considerar "reciente".
    """
    if not PROMPT_PATH.exists():
        raise FileNotFoundError(f"Falta prompt: {PROMPT_PATH}")
    base = PROMPT_PATH.read_text(encoding="utf-8")

    now = datetime.now().isoformat(timespec="seconds")
    header = (
        f"# Contexto de esta invocación\n\n"
        f"- Timestamp actual: {now}\n"
        f"- Número de Pedro: {PEDRO_NUMBER}@s.whatsapp.net\n"
        f"- Archivo de procesados: ~/.distinto/rubi_procesados.json\n"
        f"- Log file: ~/.distinto/rubi.log\n\n"
        f"---\n\n"
    )
    return header + base


def run_claude(prompt: str) -> tuple[int, str, str]:
    """
    Spawn `claude --print --dangerously-skip-permissions <prompt>` y captura output.

    Claude CLI carga MCPs desde el `.mcp.json` que encuentre en el cwd. Por eso
    ejecutamos con `cwd=MCP_WORKDIR`, que es una carpeta privada con el JSON
    del server Rubi adentro. Las flags --mcp-config y --strict-mcp-config NO
    funcionan en modo --print (testeado 2026-05-17).

    Retorna (exit_code, stdout, stderr).
    """
    mcp_file = MCP_WORKDIR / ".mcp.json"
    if not mcp_file.exists():
        return -3, "", (
            f"falta {mcp_file} — la carpeta debe tener un .mcp.json con "
            "el server Rubi (HTTP). Ver activacion/rubi-whatsapp.md."
        )

    # Pasamos el prompt por stdin para evitar límites de argv
    cmd = [
        CLAUDE_BIN,
        "--print",
        "--dangerously-skip-permissions",
        "--output-format", "text",
    ]
    try:
        proc = subprocess.run(
            cmd,
            input=prompt,
            capture_output=True,
            text=True,
            timeout=CLAUDE_TIMEOUT_SEC,
            cwd=str(MCP_WORKDIR),  # ← clave: cwd dicta qué MCP se carga
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"timeout after {CLAUDE_TIMEOUT_SEC}s"
    except FileNotFoundError:
        return -2, "", f"claude binary not found at {CLAUDE_BIN}"


# ============================================================
# Main poll
# ============================================================

def poll_once() -> int:
    """
    Una iteración de polling. Retorna 0 si OK, !=0 si hubo error.
    """
    if not acquire_lock():
        log("⏭️ Otro polling en curso, skip")
        return 0  # no es error, solo skip

    try:
        log("▶ Iniciando poll Rubi")
        prompt = build_prompt()

        start = time.monotonic()
        code, stdout, stderr = run_claude(prompt)
        elapsed = time.monotonic() - start

        LAST_POLL_FILE.write_text(datetime.now().isoformat(timespec="seconds"))

        # Capturar las primeras y últimas líneas del output (resumen útil)
        out_lines = (stdout or "").strip().splitlines()
        resumen = out_lines[-1] if out_lines else "(sin output)"
        log(f"◀ Poll terminado en {elapsed:.1f}s · exit={code} · {resumen}")

        if code != 0:
            # Guardar stderr en archivo aparte para debugging
            err_file = STATE_DIR / f"rubi_err_{int(time.time())}.log"
            err_file.write_text(
                f"=== STDOUT ===\n{stdout}\n\n=== STDERR ===\n{stderr}\n"
            )
            log(f"❌ Error guardado en {err_file}")
            return code

        return 0
    finally:
        release_lock()


def main() -> int:
    parser = argparse.ArgumentParser(description="Listener de Rubi WhatsApp para Pedro")
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Loop infinito en lugar de one-shot (útil para debug)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Segundos entre polls (solo si --daemon)",
    )
    args = parser.parse_args()

    if args.daemon:
        log(f"🌀 Modo daemon · interval={args.interval}s")
        try:
            while True:
                poll_once()
                time.sleep(args.interval)
        except KeyboardInterrupt:
            log("🛑 Interrumpido manualmente")
            return 0
    else:
        return poll_once()


if __name__ == "__main__":
    sys.exit(main())
