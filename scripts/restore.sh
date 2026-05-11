#!/bin/bash
# restore.sh — Restaurar backup desde Azure Blob Storage
# Uso: ./scripts/restore.sh 20260511_020000
set -e

TIMESTAMP=${1:?"Usar: $0 YYYYMMDD_HHMMSS"}
source /opt/lirio/.env

echo "=== Restaurando backup ${TIMESTAMP} ==="

# Descargar desde Azure
az storage blob download \
  --container-name "$AZURE_BACKUP_CONTAINER" \
  --name "postgres_${TIMESTAMP}.sql" \
  --file "/tmp/postgres_${TIMESTAMP}.sql" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --account-key "$AZURE_STORAGE_KEY"

az storage blob download \
  --container-name "$AZURE_BACKUP_CONTAINER" \
  --name "uploads_${TIMESTAMP}.tar.gz" \
  --file "/tmp/uploads_${TIMESTAMP}.tar.gz" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --account-key "$AZURE_STORAGE_KEY"

echo "=== Restaurando PostgreSQL ==="
docker exec -i lirio_postgres psql \
  -U "$POSTGRES_USER" "$POSTGRES_DB" \
  < "/tmp/postgres_${TIMESTAMP}.sql"

echo "=== Restaurando uploads ==="
docker run --rm \
  -v lirio_directus_uploads:/uploads \
  -v /tmp:/backup \
  alpine tar xzf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /

echo "=== Limpiando temp ==="
rm -f "/tmp/postgres_${TIMESTAMP}.sql" "/tmp/uploads_${TIMESTAMP}.tar.gz"

echo "=== Restauración completada ==="
