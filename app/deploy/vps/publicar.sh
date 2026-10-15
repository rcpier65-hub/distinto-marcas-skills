#!/bin/bash
# Publica la versión actual (HEAD) en el VPS: sube el código, compila la imagen
# en el VPS y reemplaza el contenedor. Uso (desde la raíz del repo):
#   app/deploy/vps/publicar.sh
set -euo pipefail
VPS=root@2.25.198.241
DIR=/docker/distinto-agencia
SHA=$(git rev-parse --short HEAD)
echo "→ Subiendo código ($SHA)…"
git archive HEAD app | ssh $VPS "rm -rf $DIR/src && mkdir -p $DIR/src && tar -x -C $DIR/src --strip-components=1"
ssh $VPS "cp $DIR/src/deploy/vps/docker-compose.yml $DIR/ && cp $DIR/src/deploy/vps/cron.sh $DIR/ && chmod +x $DIR/cron.sh"
echo "→ Compilando en el VPS…"
ssh $VPS "set -o pipefail; cd $DIR/src && nice -n 10 docker build --secret id=appenv,src=$DIR/app.env --build-arg APP_BUILD_ID=$SHA -t distinto-agencia:prod -t distinto-agencia:$SHA . 2>&1 | tail -5"
echo "→ Reemplazando contenedor…"
ssh $VPS "cd $DIR && docker compose -p distinto-agencia up -d --remove-orphans && sleep 8 && curl -fsS -o /dev/null -w 'salud: %{http_code}\n' http://127.0.0.1:8120/login"
echo "✓ Publicado $SHA en https://app.distintostudio.com"
