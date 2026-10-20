#!/usr/bin/env bash
# Backup harian database Ortic (mysqldump + gzip), simpan BACKUP_KEEP_DAYS hari, opsional salin ke object storage.
#
# Pemakaian di server (cron, tiap hari 02.00 WIB):
#   0 2 * * * /srv/ortic/deploy/scripts/backup-db.sh >> /var/log/ortic-backup.log 2>&1
#
# Kredensial dibaca dari file env API (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE).
# Variabel opsional:
#   ENV_FILE          default: apps/api/.env (relatif ke root repo)
#   BACKUP_DIR        default: /var/backups/ortic
#   BACKUP_KEEP_DAYS  default: 14
#   BACKUP_RCLONE_REMOTE  mis. "r2:ortic-backups" -> salinan offsite lewat rclone (kosong = tidak disalin)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/apps/api/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ortic}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

# Ambil satu nilai dari file env tanpa mengeksekusinya (nilai boleh berisi karakter apa pun).
env_value() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

[ -f "$ENV_FILE" ] || { echo "[backup] env file not found: $ENV_FILE" >&2; exit 1; }
DB_HOST="$(env_value DB_HOST)"
DB_PORT="$(env_value DB_PORT)"
DB_USERNAME="$(env_value DB_USERNAME)"
DB_PASSWORD="$(env_value DB_PASSWORD)"
DB_DATABASE="$(env_value DB_DATABASE)"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${DB_DATABASE}-${STAMP}.sql.gz"

# Password lewat file opsi sementara (tidak terlihat di daftar proses).
OPTIONS_FILE="$(mktemp)"
trap 'rm -f "$OPTIONS_FILE"' EXIT
chmod 600 "$OPTIONS_FILE"
printf '[client]\nhost=%s\nport=%s\nuser=%s\npassword=%s\n' "${DB_HOST:-127.0.0.1}" "${DB_PORT:-3306}" "$DB_USERNAME" "$DB_PASSWORD" > "$OPTIONS_FILE"

echo "[backup] $(date -Iseconds) dumping $DB_DATABASE -> $FILE"
# --single-transaction: snapshot konsisten InnoDB tanpa mengunci tabel (toko tetap bisa transaksi).
mysqldump --defaults-extra-file="$OPTIONS_FILE" --single-transaction --quick --routines --triggers --no-tablespaces \
  --set-gtid-purged=OFF "$DB_DATABASE" | gzip -9 > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
gzip -t "$FILE"
echo "[backup] ok ($(du -h "$FILE" | cut -f1))"

if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  rclone copy "$FILE" "$BACKUP_RCLONE_REMOTE/" && echo "[backup] copied to $BACKUP_RCLONE_REMOTE"
fi

find "$BACKUP_DIR" -name "${DB_DATABASE}-*.sql.gz" -type f -mtime +"$BACKUP_KEEP_DAYS" -print -delete | sed 's/^/[backup] removed old /'
