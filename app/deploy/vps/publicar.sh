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
# Builder propio con límite total (incluye todos los procesos de compilación).
# No modifica el builder predeterminado ni los contenedores de otras aplicaciones.
ssh $VPS bash -s -- "$DIR" "$SHA" <<'REMOTE'
set -euo pipefail
app_dir=$1
build_sha=$2
builder=distinto-agencia-limitado
if ! docker buildx inspect "$builder" >/dev/null 2>&1; then
  docker buildx create --name "$builder" --driver docker-container \
    --driver-opt memory=2g,memory-swap=2g,cpu-period=100000,cpu-quota=150000,restart-policy=no
fi
trap 'docker buildx stop "$builder" >/dev/null 2>&1 || true' EXIT
cd "$app_dir/src"
nice -n 10 docker buildx build --builder "$builder" --load --progress plain \
  --secret "id=appenv,src=$app_dir/app.env" --build-arg "APP_BUILD_ID=$build_sha" \
  -t distinto-agencia:prod -t "distinto-agencia:$build_sha" . 2>&1 \
  | tee "$app_dir/build-$build_sha.log" | tail -5
REMOTE
echo "→ Reemplazando contenedor…"
ssh $VPS "cd $DIR && docker compose -p distinto-agencia up -d --remove-orphans && sleep 8 && curl -fsS -o /dev/null -w 'salud: %{http_code}\n' http://127.0.0.1:8120/login"
echo "✓ Publicado $SHA en https://app.distintostudio.com"
