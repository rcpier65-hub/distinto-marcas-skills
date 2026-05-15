#!/usr/bin/env python3
"""
responder.py — Postea respuestas a comentarios de TikTok de una marca.

Uso (1 respuesta):
    python responder.py --marca manrique \\
        --video-url "https://www.tiktok.com/@centro_psic_manrique/video/7..." \\
        --comentario-texto "texto original del comentario" \\
        --respuesta "respuesta on-tone"

Uso (batch desde JSON):
    python responder.py --marca manrique --batch respuestas.json

Formato de respuestas.json:
[
  {
    "video_url": "https://www.tiktok.com/@.../video/7...",
    "comentario_texto": "comentario original (para localizarlo)",
    "username": "@usuario (opcional, ayuda a desambiguar)",
    "respuesta": "texto a postear"
  },
  ...
]

Comportamiento:
- Carga auth/<marca>.json
- Por cada respuesta: abre el video → busca el comentario por texto/usuario → click "Responder" → escribe → click "Publicar"
- Delays humanos 5-8s entre acciones, 8-15s entre respuestas
- Detecta sesión expirada y avisa
- Logea TODO en logs/<marca>_responder_<fecha>.json

IMPORTANTE: Este script NO genera el texto de la respuesta. Ese es trabajo de
Claude usando tonos/<marca>.md. Aquí solo se publica lo que ya viene aprobado.
"""

import argparse
import json
import random
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    print(json.dumps({"error": "Playwright no instalado"}))
    sys.exit(1)


SKILL_DIR = Path(__file__).resolve().parent.parent
MARCAS_FILE = SKILL_DIR / "marcas.json"
AUTH_DIR = SKILL_DIR / "auth"
LOGS_DIR = SKILL_DIR / "logs"

# Selectores TikTok (actualizar si TikTok cambia el DOM)
SELECTOR_COMMENT_INPUT = 'div[contenteditable="true"][data-e2e="comment-input"], textarea[placeholder*="comentario"], div[contenteditable="true"][placeholder*="omenta"]'
SELECTOR_REPLY_BUTTON = 'button[data-e2e="comment-reply-btn"], button:has-text("Responder"), span:has-text("Reply")'
SELECTOR_POST_BUTTON = 'button[data-e2e="comment-post"], button:has-text("Publicar"), button:has-text("Post")'
SELECTOR_COMMENT_LIST_ITEM = '[data-e2e="comment-level-1"], div[class*="DivCommentItemContainer"]'


def human_delay(min_s=5, max_s=9):
    time.sleep(random.uniform(min_s, max_s))


def cargar_marcas():
    with open(MARCAS_FILE, encoding="utf-8") as f:
        return json.load(f)


def postear_respuesta(page, video_url, comentario_texto, respuesta, username=""):
    """Abre el video, encuentra el comentario, responde."""
    resultado = {
        "video_url": video_url,
        "comentario_texto": comentario_texto[:80],
        "respuesta": respuesta,
        "status": "pending",
        "error": None,
    }

    try:
        page.goto(video_url, timeout=45000, wait_until="domcontentloaded")
        human_delay(4, 7)

        # Scroll para que carguen comentarios
        page.mouse.wheel(0, 500)
        human_delay(2, 4)

        # Buscar el comentario por texto (match parcial)
        snippet = comentario_texto[:40].strip()
        all_comments = page.locator(SELECTOR_COMMENT_LIST_ITEM).all()

        target = None
        for c in all_comments:
            try:
                txt = c.inner_text(timeout=2000)
                if snippet.lower() in txt.lower():
                    if username and username.replace("@", "").lower() not in txt.lower():
                        continue
                    target = c
                    break
            except Exception:
                continue

        if not target:
            resultado["status"] = "comment_not_found"
            resultado["error"] = f"No encontré el comentario que empieza con: '{snippet[:30]}...'"
            return resultado

        # Hover/click en el comentario para revelar botón "Responder"
        target.scroll_into_view_if_needed(timeout=5000)
        human_delay(1, 2)
        target.hover()
        human_delay(1, 2)

        # Click "Responder" dentro del card del comentario
        try:
            reply_btn = target.locator(SELECTOR_REPLY_BUTTON).first
            reply_btn.click(timeout=5000)
        except PWTimeout:
            # Fallback: buscar globalmente
            page.locator(SELECTOR_REPLY_BUTTON).first.click(timeout=5000)

        human_delay(2, 4)

        # Escribir la respuesta
        comment_input = page.locator(SELECTOR_COMMENT_INPUT).first
        comment_input.click()
        human_delay(0.5, 1.5)
        # Type letra por letra (más humano)
        for char in respuesta:
            comment_input.type(char, delay=random.uniform(40, 110))
        human_delay(1, 2)

        # Click "Publicar"
        page.locator(SELECTOR_POST_BUTTON).first.click(timeout=5000)
        human_delay(3, 5)

        resultado["status"] = "ok"
    except PWTimeout as e:
        resultado["status"] = "timeout"
        resultado["error"] = str(e)
    except Exception as e:
        resultado["status"] = "error"
        resultado["error"] = f"{type(e).__name__}: {e}"

    return resultado


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--marca", required=True)
    parser.add_argument("--video-url")
    parser.add_argument("--comentario-texto")
    parser.add_argument("--respuesta")
    parser.add_argument("--username", default="")
    parser.add_argument("--batch", help="Path a JSON con lista de respuestas")
    parser.add_argument("--dry-run", action="store_true", help="Cargar todo pero NO publicar")
    parser.add_argument("--no-headless", action="store_true")
    args = parser.parse_args()

    data = cargar_marcas()
    if args.marca not in data["marcas"]:
        print(json.dumps({"error": f"Marca '{args.marca}' inválida"}))
        sys.exit(1)

    cfg = data["marcas"][args.marca]
    auth_file = AUTH_DIR / f"{args.marca}.json"
    if not auth_file.exists():
        print(json.dumps({"error": f"Falta auth/{args.marca}.json", "hint": f"Corre primer_login.py --marca {args.marca}"}))
        sys.exit(1)

    # Construir lista de respuestas a postear
    respuestas = []
    if args.batch:
        with open(args.batch, encoding="utf-8") as f:
            respuestas = json.load(f)
    elif args.video_url and args.comentario_texto and args.respuesta:
        respuestas = [{
            "video_url": args.video_url,
            "comentario_texto": args.comentario_texto,
            "respuesta": args.respuesta,
            "username": args.username,
        }]
    else:
        print(json.dumps({"error": "Pasa --batch o (--video-url + --comentario-texto + --respuesta)"}))
        sys.exit(1)

    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    log = {
        "marca": args.marca,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "dry_run": args.dry_run,
        "total": len(respuestas),
        "ok": 0,
        "errores": 0,
        "resultados": [],
    }

    if args.dry_run:
        log["resultados"] = [{"status": "dry_run", **r} for r in respuestas]
        log["ok"] = len(respuestas)
        print(json.dumps(log, indent=2, ensure_ascii=False))
        return

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=not args.no_headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            storage_state=str(auth_file),
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="es-ES",
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = context.new_page()

        # Verificar sesión válida
        page.goto("https://www.tiktok.com/tiktokstudio", timeout=30000, wait_until="domcontentloaded")
        human_delay(2, 4)
        if "login" in page.url.lower():
            log["errores"] = len(respuestas)
            log["resultados"] = [{"status": "session_expired", "hint": f"python primer_login.py --marca {args.marca}"}]
            browser.close()
            print(json.dumps(log, indent=2, ensure_ascii=False))
            sys.exit(2)

        # Postear cada respuesta
        for i, r in enumerate(respuestas, 1):
            print(f"[{i}/{len(respuestas)}] Respondiendo en {r.get('video_url', 'unknown')[:60]}...", file=sys.stderr)
            res = postear_respuesta(
                page,
                r["video_url"],
                r["comentario_texto"],
                r["respuesta"],
                r.get("username", ""),
            )
            log["resultados"].append(res)
            if res["status"] == "ok":
                log["ok"] += 1
            else:
                log["errores"] += 1

            # Pausa entre respuestas (importante anti-bot)
            if i < len(respuestas):
                human_delay(8, 15)

        browser.close()

    log_file = LOGS_DIR / f"{args.marca}_responder_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    log_file.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(log, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
