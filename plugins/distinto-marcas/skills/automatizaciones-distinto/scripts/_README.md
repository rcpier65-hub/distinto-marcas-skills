# Scripts de Automatizaciones Distinto

Esta carpeta tiene los scripts ejecutables de los flows automatizados.

## Estado actual

🟢 **Activo** — escuchar_rubi.py + router_comandos.py listos para probar.

## Estructura actual

```
scripts/
├── escuchar_rubi.py                  ✅ Polling de Rubi (cron cada 60s)
├── router_comandos.py                ✅ Parser canónico de comandos >>
├── test_escuchar.sh                  ✅ Validación manual
├── com.distinto.escuchar-rubi.plist  ✅ launchd config
├── _README.md                        ← este archivo
│
├── prompts/
│   └── poll_rubi.md                  ✅ Prompt para Claude CLI
│
├── lib/                              ⏳ (vacío — helpers compartidos)
├── logs/                             ⏳ (logs locales del workspace)
└── state/                            ⏳ (estado runtime)
```

## Estructura prevista (Fase 1+)

```
├── aviso_publicacion.py     # D.2 + A.8
├── copies_grilla.py         # B.1-3
├── trends_semanal.py        # C.1
├── saludos_fechas.py        # D.3 (cuando recopilemos fechas)
│
└── lib/
    ├── notion_helpers.py
    ├── rubi_helpers.py
    ├── metricool_helpers.py
    └── chrome_helpers.py    # Patchright wrappers
```

## Setup común

```bash
cd skills/automatizaciones-distinto/scripts

# Probar parser (rápido, no toca nada externo)
./test_escuchar.sh parser

# Probar 1 ciclo real (invoca claude CLI ~30-60s)
./test_escuchar.sh once

# Si todo OK → instalar launchd
cp com.distinto.escuchar-rubi.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.distinto.escuchar-rubi.plist
```

`requirements.txt` (cuando creemos sub-scripts):
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

**Limitación clave**: los MCPs (Rubi WhatsApp, Notion, Metricool, etc.) solo son accesibles desde dentro de una sesión Claude — NO desde un script Python standalone.

**Solución**: los scripts hacen una de dos cosas:

1. **Trabajo local "duro"** (scraping con Patchright, edición Excel, etc.) y dejan resultado en `~/.distinto/<resultado>.json`. Luego Claude (o un wrapper como `escuchar_rubi.py`) lee ese JSON y llama a los MCPs necesarios.

2. **Wrapper de claude CLI**: el script spawn `claude --print --dangerously-skip-permissions <prompt>` y la sesión efímera de Claude llama los MCPs. Patrón usado por `escuchar_rubi.py`.

## Cron / launchd config

Plist: `com.distinto.escuchar-rubi.plist`
Instalación: `cp ... ~/Library/LaunchAgents/ && launchctl load ...`
Intervalo: 60s (configurable en `StartInterval`)
Logs launchd: `~/.distinto/launchd_{out,err}.log`
Log interno script: `~/.distinto/rubi.log`

Versión: 0.2.0
