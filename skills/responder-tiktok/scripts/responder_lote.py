#!/usr/bin/env python3
"""
responder_lote.py — Orquesta lectura de inbox TikTok en paralelo para múltiples marcas.

Uso (todas las marcas activas):
    python responder_lote.py --modo leer

Uso (marcas específicas):
    python responder_lote.py --modo leer --marcas manrique lozano

Modos:
    leer       → solo lee inbox y consolida output (no responde)
    dry-run    → genera plan pero no ejecuta nada
    completo   → leer + responder (requiere borradores pre-aprobados por marca)

Estrategia:
- Procesa en lotes de N marcas concurrentes (default 3) para no fingerprintear IP
- Espera entre lotes
- Si una marca falla → continúa con las demás
- Output consolidado JSON

Output:
{
  "modo": "leer",
  "timestamp": "...",
  "marcas_procesadas": ["manrique", "lozano"],
  "marcas_skip": [{"marca": "kintu", "razon": "inactivo"}],
  "resumen": {
    "total_comentarios_pendientes": 23,
    "por_marca": {"manrique": 12, "lozano": 11}
  },
  "detalle": { "manrique": {...}, "lozano": {...} },
  "errores": []
}
"""

import argparse
import json
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
MARCAS_FILE = SKILL_DIR / "marcas.json"
LOGS_DIR = SKILL_DIR / "logs"


def cargar_marcas():
    with open(MARCAS_FILE, encoding="utf-8") as f:
        return json.load(f)


def correr_leer(marca: str) -> dict:
    """Spawn leer_comentarios.py para una marca y captura JSON output."""
    try:
        result = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "leer_comentarios.py"),
             "--marca", marca, "--limite", "30"],
            capture_output=True,
            text=True,
            timeout=180,
        )
        # leer_comentarios.py imprime JSON por stdout
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return {"marca": marca, "error": "json_parse_failed", "stdout": result.stdout[:500], "stderr": result.stderr[:500]}
    except subprocess.TimeoutExpired:
        return {"marca": marca, "error": "timeout_180s"}
    except Exception as e:
        return {"marca": marca, "error": f"{type(e).__name__}: {e}"}


def batched(iterable, n):
    """Yield successive batches of size n."""
    items = list(iterable)
    for i in range(0, len(items), n):
        yield items[i:i + n]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--modo", choices=["leer", "dry-run", "completo"], default="leer")
    parser.add_argument("--marcas", nargs="*", help="Slugs específicos. Default: todas las activas.")
    parser.add_argument("--batch-size", type=int, default=3, help="Marcas concurrentes por lote")
    parser.add_argument("--delay-entre-lotes", type=int, default=10, help="Segundos entre lotes")
    args = parser.parse_args()

    data = cargar_marcas()
    todas = data["marcas"]

    # Filtrar marcas a procesar
    if args.marcas:
        marcas_target = [m for m in args.marcas if m in todas]
        marcas_invalidas = [m for m in args.marcas if m not in todas]
    else:
        marcas_target = [m for m, cfg in todas.items() if cfg.get("activo")]
        marcas_invalidas = []

    skip = []
    for m in list(marcas_target):
        if not todas[m].get("activo"):
            skip.append({"marca": m, "razon": "inactivo (no se completó primer_login)"})
            marcas_target.remove(m)

    reporte = {
        "modo": args.modo,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "batch_size": args.batch_size,
        "marcas_procesadas": marcas_target,
        "marcas_skip": skip,
        "marcas_invalidas": marcas_invalidas,
        "detalle": {},
        "resumen": {"total_comentarios_pendientes": 0, "por_marca": {}},
        "errores": [],
    }

    if args.modo == "dry-run":
        reporte["plan"] = {
            "lotes": [list(b) for b in batched(marcas_target, args.batch_size)],
            "tiempo_estimado_segundos": len(list(batched(marcas_target, args.batch_size))) * (45 + args.delay_entre_lotes),
        }
        print(json.dumps(reporte, indent=2, ensure_ascii=False))
        return

    if args.modo == "leer":
        print(f"📋 Procesando {len(marcas_target)} marcas en lotes de {args.batch_size}...", file=sys.stderr)
        for i, lote in enumerate(batched(marcas_target, args.batch_size), 1):
            print(f"\n🔄 Lote {i}: {', '.join(lote)}", file=sys.stderr)
            with ThreadPoolExecutor(max_workers=args.batch_size) as pool:
                futures = {pool.submit(correr_leer, m): m for m in lote}
                for fut in as_completed(futures):
                    marca = futures[fut]
                    try:
                        res = fut.result()
                    except Exception as e:
                        res = {"marca": marca, "error": str(e)}
                    reporte["detalle"][marca] = res
                    total = res.get("total_leidos", 0)
                    reporte["resumen"]["por_marca"][marca] = total
                    reporte["resumen"]["total_comentarios_pendientes"] += total
                    if res.get("errores") or res.get("error"):
                        reporte["errores"].append({"marca": marca, "errores": res.get("errores", res.get("error"))})
                    print(f"   ✓ {marca}: {total} comentarios", file=sys.stderr)

            # Pausa entre lotes (excepto el último)
            if i * args.batch_size < len(marcas_target):
                print(f"   ⏸️  Pausa {args.delay_entre_lotes}s entre lotes...", file=sys.stderr)
                time.sleep(args.delay_entre_lotes)

    elif args.modo == "completo":
        reporte["errores"].append("modo=completo aún no implementado en lote — usar responder.py marca por marca con borradores aprobados")

    # Guardar reporte
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / f"lote_{args.modo}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    log_file.write_text(json.dumps(reporte, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(reporte, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
