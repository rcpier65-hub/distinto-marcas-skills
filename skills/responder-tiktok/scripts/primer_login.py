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
        print("🌐 Abriendo TikTok login (modo QR directo)...")

        # Ir directo a la página de QR de TikTok
        try:
            page.goto("https://www.tiktok.com/login/qrcode", timeout=60000)
        except Exception:
            # Fallback: si la URL directa no funciona, ir al login normal
            page.goto("https://www.tiktok.com/login", timeout=60000)

        # Traer la ventana al frente para que Pedro la vea
        try:
            page.bring_to_front()
        except Exception:
            pass

        page.wait_for_timeout(2500)

        # Intentar clickear "Use QR code" si la página muestra el selector de método
        qr_selectors = [
            'a[href*="qrcode"]',
            'div:has-text("Usar código QR")',
            'div:has-text("Use QR code")',
            'div:has-text("código QR")',
            '[data-e2e="channel-item"]:has-text("QR")',
        ]
        for sel in qr_selectors:
            try:
                elem = page.locator(sel).first
                if elem.count() > 0 and elem.is_visible(timeout=1500):
                    elem.click(timeout=3000)
                    print(f"   ✓ Click en selector de QR: {sel}")
                    page.wait_for_timeout(2000)
                    break
            except Exception:
                continue

        print()
        print("👉 INSTRUCCIONES:")
        print(f"   1. Verás un código QR en el Chromium. Si NO ves el QR aún, presiona Cmd+Tab para encontrar la ventana.")
        print(f"   2. Abre TikTok en tu celu → Perfil → menú ☰ → Escanear QR.")
        print(f"   3. Escanea el código y confirma en el celu.")
        print(f"   4. El script detecta el login automáticamente y guarda las cookies.")
        print()
        print("⏳ Esperando login... (timeout 5 min)")

        # Detectar login automáticamente: monitorea URL + cookie de sesión
        login_detectado = False
        timeout_total = 300  # 5 min
        intervalo = 3
        intentos = timeout_total // intervalo

        for i in range(intentos):
            try:
                current_url = page.url
                cookies = context.cookies()
                tiene_session = any(c.get("name") in ("sessionid", "sid_tt", "sid_guard") and c.get("value") for c in cookies)
                fuera_de_login = "login" not in current_url.lower() and "signup" not in current_url.lower()

                if tiene_session and fuera_de_login:
                    # Espera 4 seg adicionales para asegurar que TikTok terminó de setear cookies
                    print(f"   ✓ Login detectado en URL: {current_url[:80]}")
                    page.wait_for_timeout(4000)
                    login_detectado = True
                    break

                if i % 5 == 0:  # cada 15s un heartbeat
                    print(f"   ... ({i * intervalo}s) URL actual: {current_url[:60]}")

                page.wait_for_timeout(intervalo * 1000)
            except KeyboardInterrupt:
                print("\n❌ Cancelado por el usuario")
                browser.close()
                sys.exit(1)
            except Exception as e:
                print(f"   ⚠️ Error monitoreando ({i*intervalo}s): {e}")
                page.wait_for_timeout(intervalo * 1000)

        if not login_detectado:
            print("⏱️  Timeout de 5 min sin detectar login. Abortando.")
            browser.close()
            sys.exit(2)

        # Verificar yendo a Studio
        try:
            page.goto("https://www.tiktok.com/tiktokstudio", timeout=30000, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            current_url = page.url
            print(f"📍 URL final: {current_url[:80]}")

            if "login" in current_url.lower():
                print("⚠️  TikTok te re-redirigió a login. Las cookies quedaron débiles.")
                print("    Guardo igual; si falla en lectura, vuelve a correr este script.")
        except Exception as e:
            print(f"⚠️  No pude verificar Studio: {e}")

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
