# responder-tiktok — Skill operativa

> Automatiza la lectura y respuesta de comentarios TikTok de las 9 marcas de Distinto Agencia
> usando Playwright + sesión persistente. Sin Metricool, sin pagar agregadores, sin re-login constante.

---

## 🎯 Para qué sirve

Cuando Metricool no llega (su API de TikTok está incompleta), esta skill resuelve:

- ✅ Leer comentarios pendientes del inbox TikTok Studio
- ✅ Generar borradores on-tone usando el manual de la marca
- ✅ Postear respuestas aprobadas
- ✅ Operar 9 cuentas distintas sin estarse logueando/deslogueando
- ✅ Notificar al cliente por WhatsApp con resumen

## 💸 Costo: $0

100% gratis después del setup inicial. No requiere API keys ni suscripciones.

---

## 🚀 Setup (1 sola vez, ~20 min para las 9 marcas)

### 1. Instalar Playwright

```bash
cd skills/responder-tiktok
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

### 2. Capturar sesión de cada marca

Por cada marca, corres una vez:

```bash
python scripts/primer_login.py --marca manrique
```

Lo que pasa:
1. Se abre Chrome visible
2. Tú haces login normal en TikTok con la cuenta de esa marca (user + pass + 2FA si aplica)
3. Cuando estés dentro de TikTok Studio, vuelves a la terminal y presionas Enter
4. Se guarda `auth/manrique.json` con todas las cookies
5. La marca queda marcada como `activo: true` en `marcas.json`

Repetir para las 9 marcas:
```bash
python scripts/primer_login.py --marca manrique          # (ya tiene handle)
python scripts/primer_login.py --marca lozano --handle <handle_tiktok>
python scripts/primer_login.py --marca distribuidora-fitness --handle <handle>
python scripts/primer_login.py --marca little-joe --handle <handle>
python scripts/primer_login.py --marca mil-ideas --handle <handle>
python scripts/primer_login.py --marca kintu --handle <handle>
python scripts/primer_login.py --marca novalamps --handle <handle>
python scripts/primer_login.py --marca la-victoria --handle <handle>
python scripts/primer_login.py --marca oral-beauty --handle <handle>
```

**Después de esto, las cookies sirven ~30-60 días sin volver a tocar nada.**

---

## 📖 Uso del día a día

### Opción A: Vía Claude Code (recomendado)

Solo decirme cosas como:

- *"Revisa comentarios TikTok de Manrique"*
- *"Cuántos comentarios pendientes hay en TikTok de todas las marcas"*
- *"Responde TikTok de Lozano (mostrar borradores antes)"*
- *"Modera TikTok de Manrique"*

Yo orquesto los scripts y muestro borradores para tu aprobación.

### Opción B: CLI directo

```bash
# Leer inbox de una marca
python scripts/leer_comentarios.py --marca manrique

# Leer inbox de todas las marcas activas
python scripts/responder_lote.py --modo leer

# Postear una respuesta puntual
python scripts/responder.py --marca manrique \
    --video-url "https://www.tiktok.com/@centro_psic_manrique/video/7..." \
    --comentario-texto "texto original del comentario" \
    --respuesta "gracias por tus palabras 🌿"

# Postear un lote desde JSON
python scripts/responder.py --marca manrique --batch respuestas_aprobadas.json
```

---

## 📁 Estructura

```
responder-tiktok/
├── SKILL.md              ← Activador + reglas para Claude
├── README.md             ← Este archivo
├── marcas.json           ← Config por marca (handle, contacto, etc.)
├── requirements.txt      ← Solo necesita playwright
├── .gitignore            ← Excluye auth/*.json (NUNCA subir cookies)
│
├── scripts/
│   ├── primer_login.py        ← Captura sesión (interactivo, 1 vez)
│   ├── leer_comentarios.py    ← Lee inbox (headless)
│   ├── responder.py           ← Postea respuestas (headless)
│   └── responder_lote.py      ← Orquesta varias marcas en paralelo
│
├── auth/                 ← Cookies guardadas (gitignored)
│   └── manrique.json
│
├── tonos/                ← Patrones on-brand por marca
│   ├── _template.md
│   └── manrique.md
│
└── logs/                 ← Ejecuciones registradas (gitignored)
    └── manrique_leer_20260515_220000.json
```

---

## 🔐 Seguridad

- ❌ **NUNCA hacer `git add auth/`** — son cookies de sesión, equivalen a credenciales
- El `.gitignore` ya las excluye, pero **revisar antes de cada commit**
- Si una marca tiene cookies comprometidas → eliminar `auth/<marca>.json` y volver a hacer `primer_login.py`

---

## 🩹 Troubleshooting

### "session_expired" en el output
→ Las cookies caducaron. Volver a correr `python scripts/primer_login.py --marca <marca>`.

### "no_selectors_matched"
→ TikTok cambió el DOM. Revisar `logs/<marca>_inbox_snapshot.html`, actualizar selectores en `leer_comentarios.py` (constantes `SELECTOR_*`).

### Captcha aparece
→ TikTok detectó automatización. Pausar uso ese día, aumentar delays en los scripts, considerar usar Chrome MCP esa sesión.

### "comment_not_found" al responder
→ El comentario quizá fue borrado o el texto cambió. Re-leer inbox.

### El script abre Chrome y se queda colgado
→ Probable que TikTok esté mostrando un modal de "verifica tu cuenta". Correr con `--no-headless` para ver qué pasa.

---

## 📊 Mantenimiento sugerido

- **Cada 7 días**: revisar `logs/` para detectar marcas con errores recurrentes
- **Cada 30 días**: refrescar tonos con respuestas reales del cliente (alimentar `tonos/<marca>.md`)
- **Cada 60 días**: re-loguear marcas (preventivo, antes de que expiren)

---

## 🤝 Roadmap

- [ ] Implementar modo `--completo` en `responder_lote.py` (lectura + respuesta en un solo comando)
- [ ] Auto-generar borradores con LLM usando `tonos/<marca>.md` como contexto (actualmente Claude lo hace)
- [ ] Webhook que ejecute `leer_comentarios.py` cada 4h y mande resumen WhatsApp
- [ ] Soporte para responder DMs (no solo comentarios públicos)
- [ ] Detección automática de comentarios spam usando heurísticas

---

Versión: 1.0.0 · Creada por Agencia Distinto · 2026-05-15
