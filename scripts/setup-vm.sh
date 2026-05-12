#!/bin/bash
# setup-vm.sh — Provisioning Azure VM Ubuntu 24.04 LTS
# Ejecutar como root en la VM recién creada:
# sudo bash setup-vm.sh

set -e

echo "=== [1/6] Actualizando sistema ==="
apt-get update && apt-get upgrade -y

echo "=== [2/6] Instalando Docker ==="
curl -fsSL https://get.docker.com | sh
usermod -aG docker ${SUDO_USER:-$USER}

echo "=== [3/6] Instalando utilidades ==="
apt-get install -y git curl wget unzip htop jq

echo "=== [4/6] Instalando Azure CLI (para backups) ==="
curl -sL https://aka.ms/InstallAzureCLIDeb | bash

echo "=== [5/6] Configurando firewall ==="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
# Puertos internos solo via Docker network — NO exponer
# 5432 (postgres), 8055 (directus), 6379 (redis) quedan cerrados
ufw --force enable
ufw status

echo "=== [6/6] Creando estructura de directorios ==="
mkdir -p /opt/lirio/{app,backups,uploads,logs}
if [ -n "$SUDO_USER" ]; then
  chown -R $SUDO_USER:$SUDO_USER /opt/lirio
fi

echo ""
echo "Setup completo."
echo ""
echo "Pasos siguientes:"
echo "  1. Cerrar sesion SSH y volver a entrar (para aplicar grupo docker)"
echo "  2. cd /opt/lirio/app"
echo "  3. git clone https://github.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital ."
echo "  4. Crear .env con valores de produccion (ver .env.example)"
echo "     Opcion A: copiar desde GitHub Secret PRODUCTION_ENV_FILE"
echo "     Opcion B: nano .env"
echo "  5. docker compose up -d"
echo "  6. Verificar: curl http://localhost:3000/api/health"
