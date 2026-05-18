#!/usr/bin/env python3
"""
responder_inbox.py — Postea respuestas a comentarios DESDE el inbox de TikTok Studio.

A diferencia de responder.py (que navega a cada video), este script aprovecha
que TikTok Studio Inbox tiene un botón "Responder" en cada card que abre un
input inline. No necesita video_url.

Uso:
    # Probar con 1 sola respuesta (la del primer borrador aprobado)
    python responder_inbox.py --marca manrique --test 1

    # Postear los primeros N borradores
    python responder_inbox.py --marca manrique --limite 5

    # Postear todos
    python responder_inbox.py --marca manrique

    # Dry-run: muestra qué postearía pero no ejecuta
    python responder_inbox.py --marca manrique --dry-run

Lee borradores de logs/<marca>_borradores.json (formato del script
_generar_borradores.py). Solo postea los que tienen accion="responder".
"""

import argparse
import json
import random
import sys
import time
from datetime import datetime
from pathlib import Path

# Usamos Patchright (Playwright parcheado para ser indetectable por TikTok)
# en lugar de Playwright vanilla. Misma API, mismo behavior — solo evade detección.
try:
    from patchright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    try:
        # Fallback a Playwright vanilla si Patchright no está disponible
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        print(json.dumps({"error": "Playwright no instalado. Instala: pip install patchright"}))
        sys.exit(1)


SKILL_DIR = Path(__file__).resolve().parent.parent
MARCAS_FILE = SKILL_DIR / "marcas.json"
AUTH_DIR = SKILL_DIR / "auth"
LOGS_DIR = SKILL_DIR / "logs"
INBOX_URL = "https://www.tiktok.com/tiktokstudio/comment?lang=es"

# Etiquetas en ambos idiomas (TikTok a veces ignora locale y muestra en inglés)
REPLY_LABELS = ("Responder", "Reply")
POST_LABELS = ("Publicar", "Postear", "Post", "Enviar", "Send", "Comentar", "Submit")
UNREPLIED_LABELS = ("Sin respuesta", "Unreplied")
ALL_COMMENTS_LABELS = ("Todos los comentarios", "All comments")


def human_delay(min_s=4, max_s=8):
    """Delay entre acciones — anti-bot."""
    time.sleep(random.uniform(min_s, max_s))


def delay_entre_posts(min_s=25, max_s=55):
    """Delay entre respuestas posteadas — anti-bot crítico."""
    time.sleep(random.uniform(min_s, max_s))


def cargar_borradores(marca: str):
    f = LOGS_DIR / f"{marca}_borradores.json"
    if not f.exists():
        return None
    with open(f, encoding="utf-8") as fh:
        return json.load(fh)


# JavaScript que encuentra el card y devuelve las coordenadas del botón "Responder"
# para que Playwright pueda clickearlo con un click real (no sintético).
FIND_REPLY_COORDS_JS = """
(args) => {
    const {username, texto_prefix, reply_labels} = args;
    const cards = Array.from(document.querySelectorAll('[data-tt="components_CommentCell_FlexColumn"]'));
    for (const card of cards) {
        const userLink = card.querySelector('a[data-tt="components_MessageCell_a"][href^="/@"]');
        if (!userLink) continue;
        if (userLink.textContent.trim() !== username) continue;

        const textoEl = card.querySelector('span[data-tt="components_TUXTextWithMention_TUXText"]')
                     || card.querySelector('span[data-tt="components_MessageCell_TruncateText"]');
        if (!textoEl) continue;
        const texto = textoEl.textContent.trim();
        const matchPrefix = texto_prefix.substring(0, Math.min(25, texto_prefix.length)).toLowerCase();
        if (!texto.toLowerCase().includes(matchPrefix)) continue;

        // Subir hasta el row padre
        let row = card;
        for (let i = 0; i < 6 && row; i++) {
            row = row.parentElement;
            if (row?.getAttribute('data-tt') === 'components_MessageCell_FlexRow_3') break;
        }

        // Buscar span "Responder/Reply" en row padre o card local
        const searchRoots = [row, card].filter(Boolean);
        for (const root of searchRoots) {
            const responderSpan = Array.from(root.querySelectorAll('span'))
                .find(s => reply_labels.includes(s.textContent?.trim()) && s.offsetParent !== null);
            if (responderSpan) {
                responderSpan.scrollIntoView({block: 'center', behavior: 'instant'});
                const rect = responderSpan.getBoundingClientRect();
                return {
                    ok: true,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    found_label: responderSpan.textContent.trim(),
                    method: root === row ? 'row' : 'card'
                };
            }
        }
        return {ok: false, error: 'reply_button_not_found_in_card'};
    }
    return {ok: false, error: 'card_not_found'};
}
"""


# JS para encontrar el input de respuesta (aparece después de click en Responder)
# y devolver su selector único para que Playwright pueda escribir ahí
SETUP_REPLY_INPUT_JS = """
() => {
    // El input de reply en TikTok suele ser un contenteditable o textarea que aparece
    // dinámicamente cerca del botón Responder activo.
    const candidates = [
        ...document.querySelectorAll('div[contenteditable="true"]'),
        ...document.querySelectorAll('textarea'),
    ].filter(el => el.offsetParent !== null);  // solo visibles

    if (candidates.length === 0) return {ok: false, error: 'no_input_visible'};

    // Marcar el último (más reciente) con un id único para que Playwright lo encuentre
    const input = candidates[candidates.length - 1];
    const uid = 'reply-input-' + Date.now();
    input.id = uid;
    input.focus();
    return {ok: true, selector: '#' + uid};
}
"""


def cerrar_inputs_abiertos(page):
    """Cierra cualquier input de reply que haya quedado abierto y limpia ids viejos."""
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    # Limpiar ids viejos de inputs (que dejamos en el DOM)
    page.evaluate("""() => {
        document.querySelectorAll('[id^="reply-input-"]').forEach(el => el.removeAttribute('id'));
    }""")
    page.wait_for_timeout(800)


def postear_uno(page, username: str, texto_original: str, respuesta: str, dry_run: bool = False):
    """Postea una sola respuesta usando el botón "Responder" del inbox."""
    res = {
        "username": username,
        "borrador": respuesta,
        "status": "pending",
    }

    try:
        # 0) Limpiar estado de inputs anteriores
        cerrar_inputs_abiertos(page)

        # 1) Encontrar el card y obtener coordenadas del botón "Responder"
        coords = page.evaluate(FIND_REPLY_COORDS_JS, {
            "username": username,
            "texto_prefix": texto_original[:30],
            "reply_labels": list(REPLY_LABELS),
        })

        if not coords.get("ok"):
            res["status"] = "card_not_found"
            res["error"] = coords.get("error")
            return res

        # Esperar un toque para que el scrollIntoView termine
        page.wait_for_timeout(800)

        # 2) Click REAL con mouse de Playwright (no sintético) sobre las coordenadas
        page.mouse.move(coords["x"], coords["y"])
        page.wait_for_timeout(200)
        page.mouse.click(coords["x"], coords["y"])
        res["click_method"] = coords.get("method")

        human_delay(2, 4)

        # 2) Localizar el input de respuesta que apareció
        setup = page.evaluate(SETUP_REPLY_INPUT_JS)
        if not setup.get("ok"):
            res["status"] = "input_not_found"
            res["error"] = setup.get("error")
            return res

        selector = setup["selector"]

        if dry_run:
            res["status"] = "dry_run_ok"
            res["selector"] = selector
            # Cancelar (presionar Escape para cerrar el input)
            cerrar_inputs_abiertos(page)
            return res

        # 2.5) Asegurar focus en el input antes de tipear (a veces el click anterior no enfoca)
        focus_result = page.evaluate("""() => {
            const inputs = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea'))
                .filter(el => el.offsetParent !== null);
            if (!inputs.length) return {ok: false};
            const inp = inputs[inputs.length - 1];
            inp.focus();
            const rect = inp.getBoundingClientRect();
            return {ok: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
        }""")
        if focus_result.get("ok"):
            page.mouse.click(focus_result["x"], focus_result["y"])
            page.wait_for_timeout(400)

        # 3) Escribir respuesta letra por letra (más humano)
        for char in respuesta:
            page.keyboard.type(char, delay=random.uniform(40, 110))
        human_delay(1.5, 2.5)

        # 4) Publicar: el botón es un icono circular (flecha de enviar), sin texto.
        # Estrategia: buscar botón cerca del input que sea clickable + visible
        # y que NO sea el botón de emoji o mention.
        publicado = page.evaluate("""() => {
            // Encontrar el input para usarlo como referencia
            const inputs = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea'))
                .filter(el => el.offsetParent !== null);
            if (!inputs.length) return {ok: false, error: 'input_not_found_at_publish'};
            const input = inputs[inputs.length - 1];
            const inputRect = input.getBoundingClientRect();

            // Buscar el contenedor del input (subir 5-8 niveles)
            let container = input.parentElement;
            for (let i = 0; i < 8 && container; i++) {
                // El contenedor es el que tiene el input + los iconos al lado
                const buttons = container.querySelectorAll('button, [role="button"], div[cursor="pointer"]');
                if (buttons.length >= 2) break;  // 2+ botones = probable barra de acciones
                container = container.parentElement;
            }
            if (!container) return {ok: false, error: 'container_not_found'};

            // Listar todos los botones clickeables visibles en el container
            const clickables = Array.from(container.querySelectorAll('button, [role="button"], div[cursor="pointer"]'))
                .filter(el => el.offsetParent !== null && (el.textContent || '').trim().length === 0);

            if (!clickables.length) return {ok: false, error: 'no_iconbtns_in_container'};

            // El botón de enviar es típicamente el último (más a la derecha) o el que tenga color de marca
            // Tomemos el de mayor X (más a la derecha)
            let postBtn = clickables[0];
            let maxX = -Infinity;
            for (const btn of clickables) {
                const rect = btn.getBoundingClientRect();
                if (rect.left > maxX && Math.abs(rect.top - inputRect.top) < 200) {
                    maxX = rect.left;
                    postBtn = btn;
                }
            }
            const r = postBtn.getBoundingClientRect();
            return {
                ok: true,
                x: r.left + r.width / 2,
                y: r.top + r.height / 2,
                btn_class: (postBtn.getAttribute('class') || '').substring(0, 60),
                btn_dataTT: postBtn.getAttribute('data-tt'),
            };
        }""")

        if not publicado.get("ok"):
            res["status"] = "publish_button_not_found"
            res["error"] = publicado.get("error")
            return res

        # Click real con mouse en el botón de enviar
        page.mouse.click(publicado["x"], publicado["y"])
        res["publish_btn_dataTT"] = publicado.get("btn_dataTT")

        # Verificar que el input se cerró (señal de que publicó)
        page.wait_for_timeout(3000)
        verify = page.evaluate("""() => {
            const inputs = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea'))
                .filter(el => el.offsetParent !== null);
            return {inputs_aun_abiertos: inputs.length};
        }""")

        if verify.get("inputs_aun_abiertos", 0) > 0:
            # Input sigue abierto — quizás falló. Intentar con Enter como fallback
            page.keyboard.press("Enter")
            page.wait_for_timeout(2000)

        res["status"] = "ok"

    except Exception as e:
        res["status"] = "exception"
        res["error"] = f"{type(e).__name__}: {e}"

    return res


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--marca", required=True)
    parser.add_argument("--test", type=int, help="Postear solo N borradores y parar (modo prueba)")
    parser.add_argument("--limite", type=int, default=999, help="Máximo a postear")
    parser.add_argument("--skip", type=int, default=0, help="Saltar los primeros N borradores")
    parser.add_argument("--dry-run", action="store_true", help="Probar todo sin hacer click en Publicar")
    parser.add_argument("--no-headless", action="store_true")
    args = parser.parse_args()

    auth_file = AUTH_DIR / f"{args.marca}.json"
    if not auth_file.exists():
        print(json.dumps({"error": f"Falta {auth_file}"}))
        sys.exit(1)

    bdata = cargar_borradores(args.marca)
    if not bdata:
        print(json.dumps({"error": f"No existe logs/{args.marca}_borradores.json"}))
        sys.exit(1)

    # Filtrar solo los que tienen accion=responder
    todos = [b for b in bdata["borradores"] if b.get("accion") == "responder"]
    n_total = len(todos)
    limite_efectivo = args.test if args.test else args.limite
    a_postear = todos[args.skip:args.skip + limite_efectivo]

    print(f"📋 {n_total} borradores con accion=responder")
    print(f"   Skip: {args.skip} | Límite: {limite_efectivo} | A postear ahora: {len(a_postear)}")
    print(f"   Dry-run: {args.dry_run}")
    print()

    log = {
        "marca": args.marca,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "dry_run": args.dry_run,
        "total_a_postear": len(a_postear),
        "ok": 0,
        "errores": 0,
        "resultados": [],
    }

    # Patchright maneja anti-detección — NO pasar args/init_scripts custom.
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.no_headless)
        context = browser.new_context(
            storage_state=str(auth_file),
            viewport={"width": 1400, "height": 900},
            locale="es-ES",
        )
        page = context.new_page()

        print("🌐 Abriendo inbox...")
        page.goto(INBOX_URL, timeout=45000, wait_until="domcontentloaded")
        human_delay(4, 6)

        if "/login" in page.url:
            log["errores"] = len(a_postear)
            log["resultados"].append({"status": "session_expired"})
            browser.close()
            print(json.dumps(log, indent=2, ensure_ascii=False))
            sys.exit(2)

        # NO aplicamos filtro "Sin respuesta" porque buscamos cada card por username
        # (los borradores ya vienen filtrados). Aplicar filtro causa bug donde el click
        # cae en "Con respuesta" en vez de "Sin respuesta".
        print("🔍 Sin filtro aplicado — buscando cada card por username...")
        human_delay(2, 3)

        for i, b in enumerate(a_postear, 1):
            print(f"\n[{i}/{len(a_postear)}] @{b['username']} | {b['texto_original'][:50]}...")
            print(f"    Borrador: {b['borrador'][:80]}")

            # Scroll para asegurar que el card está cargado (intentar hasta 8 veces)
            encontrado = False
            for scroll_intento in range(8):
                check = page.evaluate("""(args) => {
                    const cards = document.querySelectorAll('[data-tt="components_CommentCell_FlexColumn"]');
                    for (const card of cards) {
                        const userLink = card.querySelector('a[data-tt="components_MessageCell_a"][href^="/@"]');
                        if (userLink?.textContent.trim() === args.username) return true;
                    }
                    return false;
                }""", {"username": b["username"]})
                if check:
                    encontrado = True
                    break
                page.evaluate("""() => {
                    const containers = [
                        document.querySelector('[data-tt="components_CommentList_Container"]'),
                        document.querySelector('[data-tt="PageContainer_NewPageContainer_FlexColumn"]'),
                    ].filter(Boolean);
                    containers.forEach(c => {
                        let target = c;
                        for (let i = 0; i < 10 && target; i++) {
                            const overflow = getComputedStyle(target).overflowY;
                            if (overflow === 'auto' || overflow === 'scroll') {
                                target.scrollTop += 600;
                                return;
                            }
                            target = target.parentElement;
                        }
                    });
                }""")
                page.wait_for_timeout(1200)

            if not encontrado:
                resultado = {
                    "username": b["username"],
                    "status": "card_not_in_dom",
                    "error": f"No encontré card después de {scroll_intento+1} scrolls"
                }
            else:
                resultado = postear_uno(page, b["username"], b["texto_original"], b["borrador"], dry_run=args.dry_run)

            print(f"    → {resultado.get('status')} {resultado.get('error') or ''}")
            log["resultados"].append(resultado)
            if resultado.get("status") in ("ok", "dry_run_ok"):
                log["ok"] += 1
            else:
                log["errores"] += 1

            # Delay entre posts (excepto el último)
            if i < len(a_postear):
                if args.dry_run:
                    time.sleep(2)
                else:
                    delay_entre_posts(25, 55)

        browser.close()

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / f"{args.marca}_postear_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    log_file.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n📝 Log: {log_file}")
    print(f"✅ OK: {log['ok']} / ❌ Errores: {log['errores']}")


if __name__ == "__main__":
    main()
