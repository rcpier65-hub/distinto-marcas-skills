#!/usr/bin/env python3
"""
leer_comentarios.py — Lee comentarios pendientes del inbox TikTok de una marca.

Uso:
    python leer_comentarios.py --marca manrique
    python leer_comentarios.py --marca manrique --limite 20 --solo-no-respondidos

Output: JSON por stdout con los comentarios encontrados.

Estructura del JSON:
{
  "marca": "manrique",
  "timestamp": "2026-05-15T22:00:00",
  "total_leidos": 12,
  "comentarios": [
    {
      "id": "7..." ,
      "video_id": "7...",
      "video_url": "https://www.tiktok.com/@centro_psic_manrique/video/...",
      "username": "@usuario",
      "texto": "...",
      "timestamp": "hace 3 h",
      "respondido": false,
      "es_propio": false
    }
  ],
  "errores": []
}

NOTA sobre los selectores: TikTok cambia el DOM cada 2-3 meses. Si el script
deja de encontrar comentarios, revisar manualmente https://www.tiktok.com/tiktokstudio/inbox
y actualizar los selectores marcados como SELECTOR_*.
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
    print(json.dumps({"error": "Playwright no instalado. pip install playwright && playwright install chromium"}))
    sys.exit(1)


SKILL_DIR = Path(__file__).resolve().parent.parent
MARCAS_FILE = SKILL_DIR / "marcas.json"
AUTH_DIR = SKILL_DIR / "auth"
LOGS_DIR = SKILL_DIR / "logs"

# Selectores TikTok Studio (actualizar si TikTok cambia el DOM)
SELECTOR_COMMENT_CARDS = '[data-e2e="comment-item"], div[class*="CommentItem"], div[class*="comment-item"]'
SELECTOR_COMMENT_TEXT = 'p[class*="Text"], span[class*="text"], div[class*="content"]'
SELECTOR_USERNAME = 'a[class*="user"], span[class*="user-name"], a[href*="/@"]'
SELECTOR_VIDEO_LINK = 'a[href*="/video/"]'
SELECTOR_REPLIED_BADGE = '[data-e2e="replied-badge"], span[class*="Replied"], span[class*="replied"]'


def human_delay(min_s=2, max_s=5):
    """Delay aleatorio humano para evitar detección."""
    time.sleep(random.uniform(min_s, max_s))


def cargar_marcas():
    with open(MARCAS_FILE, encoding="utf-8") as f:
        return json.load(f)


def leer_comentarios(marca_slug: str, limite: int = 50, solo_no_respondidos: bool = False, headless: bool = True):
    data = cargar_marcas()
    if marca_slug not in data["marcas"]:
        return {"error": f"Marca '{marca_slug}' no existe", "marcas_validas": list(data["marcas"].keys())}

    cfg = data["marcas"][marca_slug]
    if not cfg.get("activo"):
        return {"error": f"Marca '{marca_slug}' está marcada como inactiva", "hint": f"Corre: python primer_login.py --marca {marca_slug}"}

    auth_file = AUTH_DIR / f"{marca_slug}.json"
    if not auth_file.exists():
        return {"error": f"No existe auth/{marca_slug}.json", "hint": f"Corre: python primer_login.py --marca {marca_slug}"}

    inbox_url = cfg.get("studio_inbox_url", "https://www.tiktok.com/tiktokstudio/inbox?lang=es")

    resultado = {
        "marca": marca_slug,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "total_leidos": 0,
        "comentarios": [],
        "errores": [],
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
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

        try:
            page.goto(inbox_url, timeout=45000, wait_until="domcontentloaded")
            human_delay(3, 5)

            # Detectar redirect a login = sesión expirada
            if "login" in page.url.lower():
                resultado["errores"].append("session_expired")
                resultado["hint"] = f"Corre: python primer_login.py --marca {marca_slug}"
                browser.close()
                return resultado

            # Hacer scroll un par de veces para cargar comentarios
            for _ in range(3):
                page.mouse.wheel(0, 800)
                human_delay(1, 2)

            # Capturar HTML del inbox para análisis posterior si algo falla
            html_snapshot = page.content()
            (LOGS_DIR / f"{marca_slug}_inbox_snapshot.html").write_text(html_snapshot, encoding="utf-8")

            # Buscar comment cards
            cards = page.locator(SELECTOR_COMMENT_CARDS).all()
            if not cards:
                resultado["errores"].append("no_selectors_matched")
                resultado["hint"] = f"Revisar selectores. Snapshot guardado en logs/{marca_slug}_inbox_snapshot.html"

            for i, card in enumerate(cards[:limite]):
                try:
                    texto = ""
                    username = ""
                    video_url = ""
                    respondido = False

                    try:
                        texto = card.locator(SELECTOR_COMMENT_TEXT).first.inner_text(timeout=2000).strip()
                    except PWTimeout:
                        pass

                    try:
                        username = card.locator(SELECTOR_USERNAME).first.inner_text(timeout=2000).strip()
                    except PWTimeout:
                        pass

                    try:
                        video_url = card.locator(SELECTOR_VIDEO_LINK).first.get_attribute("href", timeout=2000) or ""
                        if video_url and not video_url.startswith("http"):
                            video_url = "https://www.tiktok.com" + video_url
                    except PWTimeout:
                        pass

                    try:
                        respondido = card.locator(SELECTOR_REPLIED_BADGE).count() > 0
                    except Exception:
                        pass

                    if solo_no_respondidos and respondido:
                        continue

                    # Extraer IDs del video y comentario desde la URL
                    video_id = ""
                    comment_id = f"{marca_slug}_{i}_{int(time.time())}"  # fallback ID
                    if "/video/" in video_url:
                        video_id = video_url.split("/video/")[-1].split("?")[0]

                    if texto:  # solo agregar si capturamos texto
                        resultado["comentarios"].append({
                            "id": comment_id,
                            "video_id": video_id,
                            "video_url": video_url,
                            "username": username,
                            "texto": texto,
                            "respondido": respondido,
                            "es_propio": False,
                            "posicion_en_inbox": i,
                        })
                except Exception as e:
                    resultado["errores"].append(f"card_{i}: {type(e).__name__}: {e}")

            resultado["total_leidos"] = len(resultado["comentarios"])

        except PWTimeout as e:
            resultado["errores"].append(f"timeout: {e}")
        except Exception as e:
            resultado["errores"].append(f"{type(e).__name__}: {e}")
        finally:
            browser.close()

    return resultado


def main():
    parser = argparse.ArgumentParser(description="Lee inbox TikTok de una marca")
    parser.add_argument("--marca", required=True)
    parser.add_argument("--limite", type=int, default=50)
    parser.add_argument("--solo-no-respondidos", action="store_true")
    parser.add_argument("--no-headless", action="store_true", help="Para debug visual")
    parser.add_argument("--guardar", help="Guardar resultado en archivo JSON")
    args = parser.parse_args()

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    resultado = leer_comentarios(
        marca_slug=args.marca,
        limite=args.limite,
        solo_no_respondidos=args.solo_no_respondidos,
        headless=not args.no_headless,
    )

    salida = json.dumps(resultado, indent=2, ensure_ascii=False)
    print(salida)

    if args.guardar:
        Path(args.guardar).write_text(salida, encoding="utf-8")
    else:
        log_file = LOGS_DIR / f"{args.marca}_leer_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        log_file.write_text(salida, encoding="utf-8")


if __name__ == "__main__":
    main()
