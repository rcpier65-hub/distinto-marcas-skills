#!/usr/bin/env python3
"""
primer_login.py — Captura sesión TikTok de una marca y la guarda como storage_state.

Uso:
    python primer_login.py --marca manrique
    python primer_login.py --marca lozano

Lo que hace:
1. Abre Chrome visible (no headless) en tiktok.com/login
2. Pedro hace login normal con user/pass/2FA de la cuenta de esa marca
3. Cuando Pedro presiona Enter en terminal, guarda cookies+localStorage en auth/<marca>.json
4. Cierra el navegador

Después de esto, el script puede operar TikTok de esa marca de forma headless
durante ~30-60 días sin volver a pedir login.

Requisitos:
    pip install playwright
    playwright install chromium
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("❌ Falta Playwright. Instala con:")
    print("   pip install playwright && playwright install chromium")
    sys.exit(1)


SKILL_DIR = Path(__file__).resolve().parent.parent
MARCAS_FILE = SKILL_DIR / "marcas.json"
AUTH_DIR = SKILL_DIR / "auth"


def cargar_marcas():
    with open(MARCAS_FILE, encoding="utf-8") as f:
        return json.load(f)


def guardar_marcas(data):
    with open(MARCAS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description="Captura sesión TikTok de una marca")
    parser.add_argument("--marca", required=True, help="Slug de la marca (ej. manrique, lozano)")
    parser.add_argument("--handle", help="Handle TikTok si no está en marcas.json (ej. centro_psic_manrique)")
    args = parser.parse_args()

    data = cargar_marcas()
    if args.marca not in data["marcas"]:
        print(f"❌ Marca '{args.marca}' no existe en marcas.json")
        print(f"   Marcas válidas: {', '.join(data['marcas'].keys())}")
        sys.exit(1)

    marca_cfg = data["marcas"][args.marca]
    handle = args.handle or marca_cfg.get("tiktok_handle")

    print("\n" + "=" * 60)
    print(f"🎬 Captura de sesión TikTok — Marca: {args.marca}")
    print("=" * 60)
    if handle:
        print(f"   Handle esperado: @{handle}")
    else:
        print("   ⚠️  Handle no configurado en marcas.json — lo capturamos del login")
    print()

    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    auth_file = AUTH_DIR / f"{args.marca}.json"

    with sync_playwright() as p:
        # Lanzar Chrome visible (no headless) para que Pedro pueda interactuar
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-default-browser-check",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="es-ES",
        )

        # Pequeño truco anti-detección: ocultar webdriver flag
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = context.new_page()
        print("🌐 Abriendo TikTok login...")
        page.goto("https://www.tiktok.com/login", timeout=60000)

        print()
        print("👉 INSTRUCCIONES:")
        print(f"   1. En el Chrome que se abrió, haz login con la cuenta TikTok de '{args.marca}'.")
        print("   2. Si tiene 2FA, completalo.")
        print("   3. Espera a que estés DENTRO de TikTok (ya logueado, viendo el feed o studio).")
        print("   4. NO cierres el navegador.")
        print("   5. Vuelve a esta terminal y presiona Enter.")
        print()

        try:
            input("⌨️  Presiona Enter cuando hayas terminado el login... ")
        except KeyboardInterrupt:
            print("\n❌ Cancelado por el usuario")
            browser.close()
            sys.exit(1)

        # Intentar detectar el handle real desde la URL o el DOM
        try:
            page.goto("https://www.tiktok.com/tiktokstudio", timeout=30000, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            current_url = page.url
            print(f"📍 URL actual: {current_url}")

            if "login" in current_url.lower():
                print("⚠️  Parece que aún no estás logueado. ¿Completaste el login?")
                resp = input("¿Continuar y guardar igual? [s/N]: ").strip().lower()
                if resp != "s":
                    print("❌ Abortando, no se guardó nada.")
                    browser.close()
                    sys.exit(1)
        except Exception as e:
            print(f"⚠️  No pude verificar el login: {e}")
            print("    Guardo cookies igual; si no funciona, vuelve a correr este script.")

        # Guardar storage_state
        context.storage_state(path=str(auth_file))
        print(f"\n✅ Cookies guardadas en: {auth_file}")

        # Update marcas.json con timestamp y handle si lo capturamos
        marca_cfg["auth_last_login"] = datetime.now().isoformat(timespec="seconds")
        if not marca_cfg.get("tiktok_handle") and args.handle:
            marca_cfg["tiktok_handle"] = args.handle
            marca_cfg["tiktok_url"] = f"https://www.tiktok.com/@{args.handle}"
        marca_cfg["activo"] = True
        guardar_marcas(data)
        print(f"✅ marcas.json actualizado (activo=true, last_login={marca_cfg['auth_last_login']})")

        browser.close()

    print()
    print("🎉 Listo. La sesión está guardada.")
    print(f"   Próximos ~60 días puedes operar TikTok de '{args.marca}' sin re-login.")
    print(f"   Cuando expire, vuelve a correr: python primer_login.py --marca {args.marca}")
    print()


if __name__ == "__main__":
    main()
