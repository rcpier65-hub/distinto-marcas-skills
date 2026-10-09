#!/bin/sh
# Llama a un cron de la app (antes los corría Vercel). Uso: cron.sh /api/cron/xxx
CRON_SECRET=$(grep '^CRON_SECRET=' /docker/distinto-agencia/app.env | cut -d= -f2-)
curl -fsS -m 300 -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:8120$1" >> /docker/distinto-agencia/cron.log 2>&1
echo " $(date -Is) $1" >> /docker/distinto-agencia/cron.log
