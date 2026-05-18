#!/usr/bin/env python3
"""
importar_cookies_chrome.py — Importa cookies de TikTok directamente del Chrome real de Pedro.

Uso:
    python importar_cookies_chrome.py --marca manrique

Requisitos:
    - Chrome (no Chromium de Playwright) instalado
    - Estar logueado a TikTok en SU Chrome con la cuenta de esa marca
    - macOS pedirá permiso para acceder al Keychain (donde Chrome guarda la clave de cifrado de cookies)

Lo que hace:
1. Lee el archivo Cookies SQLite de Chrome
2. Filtra cookies del dominio tiktok.com
3. Las convierte al formato storage_state de Playwright
4. Guarda en auth/<marca>.json
5. Actualiza marcas.json marcando la marca como activa

Si Pedro tiene varios perfiles Chrome, pasar --profile "Profile 1" o el nombre exacto.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

try:
    import browser_cookie3
except ImportError:
    print("❌ Falta browser_cookie3. Instalalo con:")
    print("   pip install browser_cookie3")
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


def cookies_a_storage_state(cookies):
    """Convierte cookies de browser_cookie3 a formato Playwright storage_state."""
    pw_cookies = []
    for c in cookies:
        # browser_cookie3 devuelve http.cookiejar.Cookie
        try:
            same_site = "Lax"
            if hasattr(c, "_rest") and c._rest:
                ss = c._rest.get("SameSite") or c._rest.get("samesite") or ""
                if ss.lower() == "strict":
                    same_site = "Strict"
                elif ss.lower() == "none":
                    same_site = "None"

            pw_cookies.append({
                "name": c.name,
                "value": c.value or "",
                "domain": c.domain,
                "path": c.path or "/",
                "expires": float(c.expires) if c.expires else -1,
                "httpOnly": bool(getattr(c, "_rest", {}).get("HttpOnly")) if hasattr(c, "_rest") else False,
                "secure": bool(c.secure),
                "sameSite": same_site,
            })
        except Exception as e:
            print(f"   ⚠️ Skip cookie '{c.name}': {e}")

    return {
        "cookies": pw_cookies,
        "origins": [],  # localStorage no es accesible desde la DB de Chrome
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--marca", required=True)
    parser.add_argument("--profile", help="Nombre del perfil Chrome (ej. 'Default', 'Profile 1')")
    parser.add_argument("--dominio", default=".tiktok.com", help="Dominio a importar (default: .tiktok.com)")
    parser.add_argument("--handle", help="Handle TikTok (opcional)")
    args = parser.parse_args()

    data = cargar_marcas()
    if args.marca not in data["marcas"]:
        print(f"❌ Marca '{args.marca}' no existe en marcas.json")
        print(f"   Marcas válidas: {', '.join(data['marcas'].keys())}")
        sys.exit(1)

    cfg = data["marcas"][args.marca]
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    auth_file = AUTH_DIR / f"{args.marca}.json"

    print("=" * 60)
    print(f"📥 Importando cookies Chrome → marca '{args.marca}'")
    print("=" * 60)
    print()

    # Construir kwargs para browser_cookie3.chrome()
    chrome_kwargs = {"domain_name": "tiktok.com"}
    if args.profile:
        # browser_cookie3 acepta cookie_file con path completo
        chrome_dir = Path.home() / "Library/Application Support/Google/Chrome" / args.profile / "Cookies"
        if chrome_dir.exists():
            chrome_kwargs["cookie_file"] = str(chrome_dir)
        else:
            print(f"⚠️  Perfil '{args.profile}' no encontrado en {chrome_dir.parent}")

    print(f"🔐 Leyendo cookies de Chrome (puede pedirte la contraseña del Mac)...")
    print(f"   Dominio: tiktok.com")
    if args.profile:
        print(f"   Perfil: {args.profile}")
    print()

    try:
        cj = browser_cookie3.chrome(**chrome_kwargs)
    except Exception as e:
        print(f"❌ Error leyendo cookies de Chrome: {e}")
        print()
        print("Posibles causas:")
        print("   1. Chrome no está instalado")
        print("   2. No le diste permiso de Keychain a la app que corre Python (Terminal/Claude)")
        print("   3. El perfil indicado no existe — prueba sin --profile")
        sys.exit(2)

    cookies = list(cj)
    print(f"✓ Encontradas {len(cookies)} cookies de tiktok.com")

    # Verificar que hay sessionid (señal de que está logueado)
    nombres = {c.name for c in cookies}
    tiene_session = bool({"sessionid", "sid_tt", "sid_guard"} & nombres)
    print(f"   Cookies de sesión presentes: {nombres & {'sessionid', 'sid_tt', 'sid_guard', 'sid_ucp_v1'}}")

    if not tiene_session:
        print()
        print("⚠️  No detecto cookies de sesión (sessionid, sid_tt, sid_guard).")
        print("   Esto significa que probablemente NO estás logueado a TikTok en Chrome.")
        print()
        print("Hacé esto:")
        print("   1. Abrí Chrome (el de siempre, no el de Playwright)")
        print("   2. Andá a https://www.tiktok.com")
        print("   3. Logueate con la cuenta de esa marca")
        print("   4. Volvé a correr este script")
        sys.exit(3)

    # Convertir y guardar
    storage_state = cookies_a_storage_state(cookies)
    auth_file.write_text(json.dumps(storage_state, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✅ storage_state guardado en: {auth_file}")
    print(f"   {len(storage_state['cookies'])} cookies migradas")

    # Update marcas.json
    cfg["auth_last_login"] = datetime.now().isoformat(timespec="seconds")
    if args.handle and not cfg.get("tiktok_handle"):
        cfg["tiktok_handle"] = args.handle
        cfg["tiktok_url"] = f"https://www.tiktok.com/@{args.handle}"
    cfg["activo"] = True
    guardar_marcas(data)
    print(f"✅ marcas.json: marca='{args.marca}' marcada como activa")
    print()
    print("🎯 Próximo paso:")
    print(f"   python scripts/leer_comentarios.py --marca {args.marca}")


if __name__ == "__main__":
    main()
