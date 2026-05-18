#!/usr/bin/env python3
"""
login_asistido.py — Abre Chromium en TikTok login. Espera señal externa para guardar cookies.

Uso:
    python login_asistido.py --marca manrique

Cómo funciona:
1. Lanza Chromium VISIBLE en https://www.tiktok.com/login (página estándar, sin forzar método)
2. Pedro hace login como quiera (email, QR, Google, lo que sea)
3. El script chequea cada 3 seg:
   - ¿Hay cookies de sesión válidas? → guarda y cierra
   - ¿Existe el archivo señal auth/<marca>.GUARDAR? → guarda forzado y cierra
   - ¿Existe el archivo señal auth/<marca>.CANCELAR? → cierra sin guardar
4. Timeout 15 min total

Para forzar guardado desde otra terminal:
    touch auth/manrique.GUARDAR

Para cancelar:
    touch auth/manrique.CANCELAR
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("❌ Falta Playwright. pip install playwright && playwright install chromium")
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--marca", required=True)
    parser.add_argument("--handle", help="Handle TikTok (opcional)")
    parser.add_argument("--url", default="https://www.tiktok.com/login",
                        help="URL inicial (default: login estándar con todas las opciones)")
    parser.add_argument("--timeout-min", type=int, default=15,
                        help="Timeout total en minutos (default: 15)")
    args = parser.parse_args()

    data = cargar_marcas()
    if args.marca not in data["marcas"]:
        print(f"❌ Marca '{args.marca}' no existe")
        sys.exit(1)

    cfg = data["marcas"][args.marca]
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    auth_file = AUTH_DIR / f"{args.marca}.json"
    signal_guardar = AUTH_DIR / f"{args.marca}.GUARDAR"
    signal_cancelar = AUTH_DIR / f"{args.marca}.CANCELAR"

    # Limpiar señales viejas
    for s in (signal_guardar, signal_cancelar):
        if s.exists():
            s.unlink()

    print("=" * 60)
    print(f"🎬 Login asistido — Marca: {args.marca}")
    print("=" * 60)
    print(f"   URL inicial: {args.url}")
    print(f"   Timeout: {args.timeout_min} min")
    print()
    print("💡 Para forzar guardado desde otra terminal:")
    print(f"   touch {signal_guardar}")
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-default-browser-check",
                "--start-maximized",
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
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = context.new_page()
        print(f"🌐 Abriendo {args.url}...")
        try:
            page.goto(args.url, timeout=60000)
        except Exception as e:
            print(f"⚠️  No pudo cargar URL inicial: {e}")

        try:
            page.bring_to_front()
        except Exception:
            pass

        print()
        print("👉 INSTRUCCIONES:")
        print(f"   1. El Chromium está abierto. Hace login con la cuenta de '{args.marca}'.")
        print("   2. Usa el método que quieras: correo + pass, QR, Google, Apple, etc.")
        print("   3. Cuando estés DENTRO de TikTok, el script lo detecta y guarda solo.")
        print(f"   4. O cuando termines, decile al asistente 'listo' y él dispara el guardado.")
        print()
        print("⏳ Esperando... (Ctrl+C para cancelar)")

        timeout_seg = args.timeout_min * 60
        intervalo = 3
        intentos = timeout_seg // intervalo
        guardado = False
        cancelado = False

        for i in range(intentos):
            try:
                # Check 1: ¿señal manual?
                if signal_guardar.exists():
                    print("   📨 Señal GUARDAR detectada — capturando cookies AHORA")
                    signal_guardar.unlink()
                    guardado = True
                    break

                if signal_cancelar.exists():
                    print("   ❌ Señal CANCELAR detectada — abortando")
                    signal_cancelar.unlink()
                    cancelado = True
                    break

                # Check 2: ¿navegador todavía vivo?
                try:
                    cookies = context.cookies()
                    current_url = page.url
                except Exception as e:
                    print(f"   ⚠️ Navegador cerrado por usuario o crasheó: {e}")
                    # Intentar guardar cookies acumuladas si el contexto aún responde
                    try:
                        cookies = context.cookies()
                        if any(c.get("name") == "sessionid" for c in cookies):
                            guardado = True
                    except Exception:
                        pass
                    cancelado = True
                    break

                # Check 3: ¿cookies de sesión válidas?
                tiene_session = any(
                    c.get("name") in ("sessionid", "sid_tt", "sid_guard")
                    and c.get("value") and len(c.get("value", "")) > 5
                    for c in cookies
                )
                fuera_de_login = "/login" not in current_url and "/signup" not in current_url

                if tiene_session and fuera_de_login:
                    print(f"   ✓ Login auto-detectado en URL: {current_url[:80]}")
                    page.wait_for_timeout(3000)
                    guardado = True
                    break

                # Heartbeat
                if i % 10 == 0:
                    estado = "✓ sessionid presente" if tiene_session else "esperando sessionid"
                    print(f"   ... ({i * intervalo}s) {current_url[:50]} | {estado}")

                page.wait_for_timeout(intervalo * 1000)

            except KeyboardInterrupt:
                print("\n❌ Cancelado por Ctrl+C")
                cancelado = True
                break
            except Exception as e:
                print(f"   ⚠️ Error: {e}")
                page.wait_for_timeout(intervalo * 1000)

        if guardado:
            try:
                context.storage_state(path=str(auth_file))
                print(f"\n✅ Cookies guardadas: {auth_file}")
                cfg["auth_last_login"] = datetime.now().isoformat(timespec="seconds")
                if args.handle and not cfg.get("tiktok_handle"):
                    cfg["tiktok_handle"] = args.handle
                    cfg["tiktok_url"] = f"https://www.tiktok.com/@{args.handle}"
                cfg["activo"] = True
                guardar_marcas(data)
                print(f"✅ marcas.json actualizado (activo=true)")
            except Exception as e:
                print(f"❌ No pude guardar storage_state: {e}")
                sys.exit(3)
        elif cancelado:
            print("\n⏭️  Saliendo sin guardar.")
        else:
            print(f"\n⏱️  Timeout {args.timeout_min} min sin detectar login.")

        try:
            browser.close()
        except Exception:
            pass

    sys.exit(0 if guardado else 2)


if __name__ == "__main__":
    main()
