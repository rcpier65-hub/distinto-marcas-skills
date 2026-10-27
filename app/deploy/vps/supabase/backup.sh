#!/usr/bin/env bash
# Respaldo de la instancia de la agencia; no toca otros proyectos del VPS.
set -euo pipefail
umask 077
base=/docker/distinto-agencia-supabase
app=/docker/distinto-agencia
exec 9>"$base/.backup.lock"
flock -n 9 || exit 0
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dest="$base/backups/daily/$stamp"
mkdir -p "$dest"
docker exec distinto-agencia-sb-db pg_dump -U supabase_admin -d postgres -Fc > "$dest/database.dump"
docker exec -i distinto-agencia-sb-db pg_restore --list < "$dest/database.dump" > "$dest/database.list"
tar -czf "$dest/storage-config.tar.gz" -C "$base" .env docker-compose.yml kong.yml volumes/storage volumes/db/tls
cp -p "$app/app.env" "$dest/app.env"
cp -p "$app/docker-compose.yml" "$dest/app-compose.yml"
docker cp distinto-agencia-sb-db:/etc/postgresql-custom "$dest/db-config" >/dev/null
chmod -R go-rwx "$dest"
sha256sum "$dest/database.dump" "$dest/storage-config.tar.gz" > "$dest/SHA256SUMS"
touch "$dest/COMPLETE"
# Conservar siete respaldos terminados. Nunca elimina el respaldo de Cloud.
mapfile -t completed < <(find "$base/backups/daily" -mindepth 2 -maxdepth 2 -name COMPLETE -printf '%h\n' | sort -r)
for old in "${completed[@]:7}"; do
  [[ "$old" == "$base/backups/daily/"* ]] && rm -rf -- "$old"
done
printf '%s respaldo completo: %s\n' "$(date -u +%FT%TZ)" "$dest"
