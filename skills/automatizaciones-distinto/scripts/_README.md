# Scripts de Automatizaciones Distinto

Esta carpeta tiene los scripts ejecutables de los flows automatizados.

## Estado actual

🟡 **Vacía** — pendiente armar en Fase 1.

## Estructura prevista

```
scripts/
├── cron_runner.py           # Orquesta todos los flows según hora actual
├── escuchar_rubi.py         # Polling WhatsApp para comandos de Pedro
├── router_comandos.py       # Mapeo comando → acción
├── webhook_server.py        # FastAPI para Shortcuts iOS
│
├── aviso_publicacion.py     # D.2 + A.8
├── copies_grilla.py         # B.1-3
├── trends_semanal.py        # C.1
├── saludos_fechas.py        # D.3
│
└── lib/
    ├── notion_helpers.py
    ├── rubi_helpers.py
    ├── metricool_helpers.py
    └── chrome_helpers.py    # Patchright wrappers
```

## Setup común

```bash
cd skills/automatizaciones-distinto
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` (a crear cuando armemos):
```
notion-client
openpyxl
patchright
playwright
fastapi
uvicorn
python-dotenv
```

## Cómo se conectan los scripts a los MCPs

Los MCPs (Notion, Drive, Metricool, Rubi WhatsApp) se acceden vía Claude — no directamente desde estos scripts. Los scripts:

1. Hacen el trabajo "duro" local (scraping con Patchright, edición Excel, etc.)
2. Reportan resultados a Claude (vía archivo JSON en `logs/` o stdout)
3. Claude lee el resultado y llama a los MCPs necesarios

Alternativa: para flows simples, todo se hace en una sesión Claude (sin scripts intermedios).

## Cron config

Ver `/Users/pedroreyescalderon/Library/LaunchAgents/com.distinto.automations.plist` (a crear).

Versión: 0.1.0
