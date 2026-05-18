#!/usr/bin/env python3
"""
leer_comentarios.py — Lee comentarios pendientes del inbox TikTok Studio de una marca.

Uso:
    python leer_comentarios.py --marca manrique
    python leer_comentarios.py --marca manrique --limite 20

Output: JSON por stdout con los comentarios encontrados.

Estructura del JSON:
{
  "marca": "manrique",
  "timestamp": "2026-05-15T22:00:00",
  "total_leidos": 12,
  "comentarios": [
    {
      "id": "manrique_0_1234567890",
      "video_id": "7...",
      "video_url": "https://www.tiktok.com/@.../video/...",
      "video_titulo": "¿El colegio te pidió...",
      "username": "@usuario",
      "texto": "...",
      "tiempo_relativo": "hace 3 h",
      "respondido": false,
      "posicion_en_inbox": 0
    }
  ],
  "errores": []
}

Selectores TikTok Studio (mayo 2026):
- Container del inbox: [data-tt="components_CommentList_Container"]
- Card individual: [data-tt="components_CommentCell_FlexColumn"]
- TikTok cambia el DOM cada 2-3 meses; si deja de funcionar revisar
  logs/<marca>_inbox_snapshot.html y actualizar el JS de extraerComentarios()
"""

import argparse
import json
import random
import sys
import time
from datetime import datetime
from pathlib import Path

# Usamos Patchright (Playwright parcheado para evadir detección TikTok).
# Misma API, comportamiento idéntico, pero indetectable.
try:
    from patchright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        print(json.dumps({"error": "Playwright no instalado. Instala: pip install patchright"}))
        sys.exit(1)


SKILL_DIR = Path(__file__).resolve().parent.parent
MARCAS_FILE = SKILL_DIR / "marcas.json"
AUTH_DIR = SKILL_DIR / "auth"
LOGS_DIR = SKILL_DIR / "logs"

INBOX_URL_FALLBACK = "https://www.tiktok.com/tiktokstudio/comment"


# JavaScript que corre dentro de la página para extraer comentarios estructurados.
# Más fácil mantener un solo bloque JS que muchos locators encadenados.
EXTRACT_JS = """
() => {
    const cards = Array.from(document.querySelectorAll('[data-tt="components_CommentCell_FlexColumn"]'));
    const out = [];

    cards.forEach((card, i) => {
        try {
            // USERNAME: <a data-tt="components_MessageCell_a" href="/@username">username</a>
            const userLink = card.querySelector('a[data-tt="components_MessageCell_a"][href^="/@"]');
            const username = userLink ? userLink.textContent.trim() : '';
            const username_href = userLink ? userLink.getAttribute('href') : '';

            // TIEMPO: <span data-tt="components_MessageCell_span_20">7h ago</span>
            const tiempoEl = card.querySelector('span[data-tt="components_MessageCell_span_20"]');
            const tiempo_relativo = tiempoEl ? tiempoEl.textContent.trim() : '';

            // TEXTO COMENTARIO: <span data-tt="components_TUXTextWithMention_TUXText">...</span>
            const textoEl = card.querySelector('span[data-tt="components_TUXTextWithMention_TUXText"]')
                         || card.querySelector('span[data-tt="components_MessageCell_TruncateText"]');
            const texto = textoEl ? textoEl.textContent.trim() : '';

            // VIDEO: buscar en el row padre (subir hasta MessageCell_FlexRow_3)
            let row = card.parentElement;
            for (let k = 0; k < 8 && row; k++) {
                if (row.getAttribute('data-tt') === 'components_MessageCell_FlexRow_3') break;
                row = row.parentElement;
            }

            let video_url = '';
            let video_titulo = '';
            if (row) {
                // El video link está dentro del row, no del card
                const videoLink = row.querySelector('a[href*="/video/"]');
                if (videoLink) {
                    video_url = videoLink.href;
                }
                // Título del video: TruncateText fuera del card
                const titEl = row.querySelector('[data-tt="components_MessageCell_TruncateText"]:not(:has(*))');
                if (titEl && !card.contains(titEl)) {
                    video_titulo = titEl.textContent.trim();
                }
            }

            // ID del video
            let video_id = '';
            if (video_url) {
                const m = video_url.match(/\\/video\\/(\\d+)/);
                if (m) video_id = m[1];
            }

            // Detectar respondido: hay botón "Reply" o el comment ya tiene respuesta
            const cellText = card.textContent || '';
            const respondido = card.querySelector('[data-tt*="Replied"]') !== null
                            || /Respondido/i.test(cellText);

            // Solo agregar si capturamos texto + username
            if (texto && username) {
                out.push({
                    posicion: i,
                    username: username,
                    username_href: username_href,
                    texto: texto,
                    tiempo_relativo: tiempo_relativo,
                    video_url: video_url,
                    video_id: video_id,
                    video_titulo: video_titulo.substring(0, 200),
                    respondido: respondido,
                });
            }
        } catch (e) {
            out.push({posicion: i, error: e.message});
        }
    });

    return out;
}
"""


def human_delay(min_s=2, max_s=5):
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
        return {"error": f"Marca '{marca_slug}' inactiva", "hint": f"Corre: python scripts/importar_cookies_chrome.py --marca {marca_slug} --profile Default"}

    auth_file = AUTH_DIR / f"{marca_slug}.json"
    if not auth_file.exists():
        return {"error": f"Falta auth/{marca_slug}.json"}

    # Default a la URL real del inbox de comentarios
    inbox_url = cfg.get("studio_inbox_url") or INBOX_URL_FALLBACK
    if "/inbox" in inbox_url and "/comment" not in inbox_url:
        inbox_url = INBOX_URL_FALLBACK  # corregir URLs viejas

    resultado = {
        "marca": marca_slug,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "url_visitada": inbox_url,
        "total_leidos": 0,
        "comentarios": [],
        "errores": [],
    }

    # Patchright maneja anti-detección internamente — NO pasar args ni
    # init_scripts personalizados (los romperían). Mantener launch básico.
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            storage_state=str(auth_file),
            viewport={"width": 1400, "height": 900},
            locale="es-ES",
        )
        page = context.new_page()

        try:
            page.goto(inbox_url, timeout=45000, wait_until="domcontentloaded")
            human_delay(4, 6)

            if "/login" in page.url:
                resultado["errores"].append("session_expired")
                resultado["hint"] = f"Corre: python scripts/importar_cookies_chrome.py --marca {marca_slug} --profile Default"
                browser.close()
                return resultado

            # Aplicar filtro "Sin respuesta" si está pedido (default cuando solo_no_respondidos=True)
            if solo_no_respondidos:
                aplicado = page.evaluate("""() => {
                    // El filtro está en el botón con texto "Todos los comentarios" o similar
                    const buttons = Array.from(document.querySelectorAll('div, button')).filter(
                        el => /Todos los comentarios|Sin respuesta|Con respuesta/.test(el.textContent || '')
                              && el.offsetParent !== null
                    );
                    // Buscar el filtro de tipo (no el dropdown abierto)
                    const filterBtn = buttons.find(el => el.getAttribute('data-tt') === 'components_FilterButton_FlexCenter'
                                                     || el.className?.toString().includes('FilterButton'));
                    if (filterBtn) {
                        filterBtn.click();
                        return {clicked: 'filter button', text: filterBtn.textContent?.substring(0, 50)};
                    }
                    return {clicked: null};
                }""")
                resultado["filtro_paso1"] = aplicado
                page.wait_for_timeout(1500)

                # Ahora clickear "Sin respuesta" en el dropdown
                aplicado2 = page.evaluate("""() => {
                    const opts = Array.from(document.querySelectorAll('div, span, li')).filter(
                        el => el.textContent?.trim() === 'Sin respuesta' && el.offsetParent !== null
                    );
                    if (opts.length > 0) {
                        opts[0].click();
                        return {clicked: 'Sin respuesta'};
                    }
                    return {clicked: null};
                }""")
                resultado["filtro_paso2"] = aplicado2
                human_delay(3, 5)

            # Scroll progresivo + extracción acumulativa.
            # TikTok virtualiza la lista (solo renderiza ~13 cards), entonces
            # necesitamos extraer DURANTE el scroll y acumular únicos por (username, texto).
            acumulador = {}  # clave: f"{username}|{texto[:50]}" → comentario
            prev_count = 0
            scroll_estable = 0
            max_scrolls = 80
            for s in range(max_scrolls):
                # Extraer comentarios visibles en este momento
                visibles = page.evaluate(EXTRACT_JS)
                for c in visibles:
                    if c.get("error"):
                        continue
                    if solo_no_respondidos and c.get("respondido"):
                        continue
                    key = f"{c.get('username','')}|{c.get('texto','')[:80]}"
                    if key not in acumulador and c.get("username") and c.get("texto"):
                        acumulador[key] = c

                # Scrollear el container interno
                page.evaluate("""() => {
                    const candidatos = [
                        document.querySelector('[data-tt="components_CommentList_Container"]'),
                        document.querySelector('[data-tt="components_CommentList_Absolute"]'),
                        document.querySelector('[data-tt="PageContainer_NewPageContainer_FlexColumn"]'),
                        document.querySelector('[data-tt="PageContainer_NewPageContainer_SubPageContainer"]'),
                    ].filter(Boolean);
                    candidatos.forEach(el => {
                        let target = el;
                        for (let i = 0; i < 10 && target; i++) {
                            const overflow = getComputedStyle(target).overflowY;
                            if (overflow === 'auto' || overflow === 'scroll') {
                                // Scroll incremental, no salto al final (para no skip cards)
                                target.scrollTop += 600;
                                return;
                            }
                            target = target.parentElement;
                        }
                    });
                    window.scrollBy(0, 600);
                }""")
                page.mouse.wheel(0, 600)
                human_delay(0.8, 1.4)

                # Verificar si el conteo acumulado se estabilizó
                if len(acumulador) == prev_count:
                    scroll_estable += 1
                    if scroll_estable >= 5:
                        break
                else:
                    scroll_estable = 0
                prev_count = len(acumulador)

            resultado["scrolls_realizados"] = s + 1
            resultado["cards_visibles_dom"] = len(acumulador)
            raw = list(acumulador.values())

            # Capturar HTML para debug
            LOGS_DIR.mkdir(parents=True, exist_ok=True)
            (LOGS_DIR / f"{marca_slug}_inbox_snapshot.html").write_text(page.content(), encoding="utf-8")

            # `raw` ya viene del acumulador (extracción durante scroll, evita virtualización)
            for i, c in enumerate(raw[:limite]):
                if c.get("error"):
                    resultado["errores"].append(f"card_{c.get('posicion', i)}: {c['error']}")
                    continue

                if solo_no_respondidos and c.get("respondido"):
                    continue

                resultado["comentarios"].append({
                    "id": f"{marca_slug}_{c.get('video_id') or i}_{int(time.time())}",
                    "video_id": c.get("video_id", ""),
                    "video_url": c.get("video_url", ""),
                    "video_titulo": c.get("video_titulo", ""),
                    "username": c.get("username", ""),
                    "username_href": c.get("username_href", ""),
                    "texto": c.get("texto", ""),
                    "tiempo_relativo": c.get("tiempo_relativo", ""),
                    "respondido": c.get("respondido", False),
                    "posicion_en_inbox": c.get("posicion", i),
                })

            resultado["total_leidos"] = len(resultado["comentarios"])

            if not resultado["comentarios"] and not resultado["errores"]:
                resultado["errores"].append("no_comments_extracted")
                resultado["hint"] = f"Revisar snapshot: logs/{marca_slug}_inbox_snapshot.html"

        except PWTimeout as e:
            resultado["errores"].append(f"timeout: {e}")
        except Exception as e:
            resultado["errores"].append(f"{type(e).__name__}: {e}")
        finally:
            browser.close()

    return resultado


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--marca", required=True)
    parser.add_argument("--limite", type=int, default=50)
    parser.add_argument("--solo-no-respondidos", action="store_true")
    parser.add_argument("--no-headless", action="store_true")
    parser.add_argument("--guardar", help="Path para guardar JSON")
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
