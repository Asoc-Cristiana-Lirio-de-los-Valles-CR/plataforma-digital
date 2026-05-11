#!/bin/bash
# backup.sh — Backup PostgreSQL + uploads a Azure Blob Storage
# Cron: 0 2 * * * /opt/lirio/app/scripts/backup.sh >> /opt/lirio/logs/backup.log 2>&1
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/lirio_backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Cargar variables de entorno
source /opt/lirio/app/.env

echo "[${TIMESTAMP}] === Iniciando backup ==="

echo "[${TIMESTAMP}] Backup PostgreSQL..."
docker exec lirio_postgres pg_dump \
  -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > "$BACKUP_DIR/postgres_${TIMESTAMP}.sql"

echo "[${TIMESTAMP}] Backup uploads Directus..."
docker run --rm \
  -v lirio_directus_uploads:/uploads:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/uploads_${TIMESTAMP}.tar.gz" /uploads

echo "[${TIMESTAMP}] Subiendo a Azure Blob Storage..."
az storage blob upload-batch \
  --destination "$AZURE_BACKUP_CONTAINER" \
  --source "$BACKUP_DIR" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --account-key "$AZURE_STORAGE_KEY" \
  --overwrite true

echo "[${TIMESTAMP}] Limpiando archivos temporales..."
rm -rf "$BACKUP_DIR"

echo "[${TIMESTAMP}] === Backup completado ==="

# Limpiar backups de Azure con más de 30 días
CUTOFF=$(date -d "30 days ago" +%Y-%m-%dT%H:%M:%SZ)
az storage blob list \
  --container-name "$AZURE_BACKUP_CONTAINER" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --account-key "$AZURE_STORAGE_KEY" \
  --query "[?properties.lastModified < '${CUTOFF}'].name" \
  -o tsv | while read blob; do
    az storage blob delete \
      --container-name "$AZURE_BACKUP_CONTAINER" \
      --name "$blob" \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --account-key "$AZURE_STORAGE_KEY"
    echo "[${TIMESTAMP}] Eliminado backup antiguo: $blob"
done
