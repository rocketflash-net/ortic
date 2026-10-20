#!/usr/bin/env bash
# Uji restore: pulihkan file backup ke database sementara, cek isinya, lalu hapus database sementara itu.
# Jalankan minimal sebulan sekali (atau setelah mengubah script backup). Database produksi tidak disentuh.
#
#   deploy/scripts/restore-test.sh /var/backups/ortic/ortic-20261020-020000.sql.gz
#   deploy/scripts/restore-test.sh            # pakai backup terbaru di BACKUP_DIR
#
# User DB di env perlu hak CREATE/DROP database (atau set RESTORE_DB_USERNAME/RESTORE_DB_PASSWORD terpisah).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/apps/api/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ortic}"

env_value() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

DB_HOST="$(env_value DB_HOST)"
DB_PORT="$(env_value DB_PORT)"
DB_USERNAME="${RESTORE_DB_USERNAME:-$(env_value DB_USERNAME)}"
DB_PASSWORD="${RESTORE_DB_PASSWORD:-$(env_value DB_PASSWORD)}"
DB_DATABASE="$(env_value DB_DATABASE)"

FILE="${1:-$(ls -1t "$BACKUP_DIR"/"$DB_DATABASE"-*.sql.gz 2>/dev/null | head -n 1)}"
[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "[restore-test] backup file not found" >&2; exit 1; }

TEST_DB="${DB_DATABASE}_restore_test"
OPTIONS_FILE="$(mktemp)"
cleanup() {
  mysql --defaults-extra-file="$OPTIONS_FILE" -e "DROP DATABASE IF EXISTS \`$TEST_DB\`" || true
  rm -f "$OPTIONS_FILE"
}
trap cleanup EXIT
chmod 600 "$OPTIONS_FILE"
printf '[client]\nhost=%s\nport=%s\nuser=%s\npassword=%s\n' "${DB_HOST:-127.0.0.1}" "${DB_PORT:-3306}" "$DB_USERNAME" "$DB_PASSWORD" > "$OPTIONS_FILE"

echo "[restore-test] restoring $FILE -> $TEST_DB"
mysql --defaults-extra-file="$OPTIONS_FILE" -e "DROP DATABASE IF EXISTS \`$TEST_DB\`; CREATE DATABASE \`$TEST_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
gunzip -c "$FILE" | mysql --defaults-extra-file="$OPTIONS_FILE" "$TEST_DB"

# Pemeriksaan: tabel inti ada dan migrasi tercatat.
echo "[restore-test] row counts:"
mysql --defaults-extra-file="$OPTIONS_FILE" "$TEST_DB" -t -e "
  SELECT 'users' AS tabel, COUNT(*) AS baris FROM users
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants
  UNION ALL SELECT 'warehouse_stocks', COUNT(*) FROM warehouse_stocks
  UNION ALL SELECT 'orders', COUNT(*) FROM orders
  UNION ALL SELECT 'stock_movements', COUNT(*) FROM stock_movements
  UNION ALL SELECT '__drizzle_migrations', COUNT(*) FROM __drizzle_migrations"
echo "[restore-test] OK: backup can be restored"
