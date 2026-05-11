#!/bin/bash
# setup-vm.sh — Provisioning Azure VM Ubuntu 22.04
# Ejecutar como root en la VM recién creada:
# sudo bash setup-vm.sh

set -e

echo "=== [1/6] Actualizando sistema ==="
apt-get update && apt-get upgrade -y

echo "=== [2/6] Instalando Docker ==="
curl -fsSL https://get.docker.com | sh
SUDO_USER_HOME=$(eval echo ~${SUDO_USER})
usermod -aG docker ${SUDO_USER:-$USER}

echo "=== [3/6] Instalando utilidades ==="
apt-get install -y git curl wget unzip htop jq

echo "=== [4/6] Instalando Azure CLI (para backups) ==="
curl -sL https://aka.ms/InstallAzureCLIDeb | bash

echo "=== [5/6] Configurando firewall ==="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

echo "=== [6/6] Creando directorio del proyecto ==="
mkdir -p /opt/lirio
if [ -n "$SUDO_USER" ]; then
  chown $SUDO_USER:$SUDO_USER /opt/lirio
fi

echo ""
echo "✅ Setup completo."
echo "   1. Cerrar sesión SSH y volver a entrar para aplicar grupo docker"
echo "   2. cd /opt/lirio && git clone <repo> ."
echo "   3. cp .env.example .env && nano .env"
echo "   4. docker compose up -d"
