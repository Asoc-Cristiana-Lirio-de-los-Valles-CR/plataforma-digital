#!/bin/bash
# azure-provision.sh — Crear toda la infraestructura Azure para Lirio de los Valles
#
# ANTES DE EJECUTAR:
#   1. Instalar Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli
#   2. az login
#   3. az account list --output table  (verificar suscripción ONG activa)
#   4. az account set --subscription "NOMBRE_O_ID_SUSCRIPCION_ONG"
#   5. Tener ssh-keygen disponible
#
# USO:
#   bash scripts/azure-provision.sh
#
# Al finalizar imprime:
#   - IP pública estática
#   - Comando SSH
#   - Variables para GitHub Secrets

set -e

# ============================================================
# CONFIGURACIÓN — editar si es necesario
# ============================================================
RG="lirio-rg"
LOCATION="eastus"
VM_NAME="lirio-vm"
VM_SIZE="Standard_B2ms"
OS_IMAGE="Canonical:ubuntu-24_04-lts:server:latest"
DISK_SIZE_GB=64
DISK_SKU="Premium_LRS"

# Presupuesto ONG — $2,000 USD/año = ~$166/mes
# Alertas: 80% aviso, 100% límite, 120% crítico
BUDGET_MONTHLY=150
ALERT_EMAIL="rafael1083@gmail.com"
ADMIN_USER="lirio"
SSH_KEY_PATH="$HOME/.ssh/lirio_azure_key"
NSG_NAME="lirio-nsg"
VNET_NAME="lirio-vnet"
SUBNET_NAME="lirio-subnet"
IP_NAME="lirio-ip"
NIC_NAME="lirio-nic"
# ============================================================

echo ""
echo "=== [0] Verificando suscripción activa ==="
az account show --query "{Nombre:name, ID:id, Estado:state}" --output table

echo ""
read -p "¿Es la suscripción ONG correcta? (s/N): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo "Cancela y ejecuta: az account set --subscription 'NOMBRE_SUSCRIPCION'"
  exit 1
fi

# ============================================================
echo ""
echo "=== [1/9] Generando clave SSH ==="
# ============================================================
if [ -f "$SSH_KEY_PATH" ]; then
  echo "Clave SSH ya existe: $SSH_KEY_PATH — reutilizando"
else
  ssh-keygen -t ed25519 -C "lirio-azure-vm" -f "$SSH_KEY_PATH" -N ""
  echo "Clave SSH generada: $SSH_KEY_PATH"
fi
SSH_PUBLIC_KEY=$(cat "${SSH_KEY_PATH}.pub")

# ============================================================
echo ""
echo "=== [2/9] Creando Resource Group: $RG en $LOCATION ==="
# ============================================================
az group create \
  --name "$RG" \
  --location "$LOCATION" \
  --tags proyecto=lirio-plataforma entorno=produccion \
  --output table

# ============================================================
echo ""
echo "=== [3/9] Creando IP pública estática (Standard SKU) ==="
# ============================================================
az network public-ip create \
  --resource-group "$RG" \
  --name "$IP_NAME" \
  --sku Standard \
  --allocation-method Static \
  --zone 1 \
  --tags proyecto=lirio-plataforma \
  --output table

PUBLIC_IP=$(az network public-ip show \
  --resource-group "$RG" \
  --name "$IP_NAME" \
  --query "ipAddress" \
  --output tsv)

echo "IP pública estática: $PUBLIC_IP"

# ============================================================
echo ""
echo "=== [4/9] Creando Virtual Network y Subnet ==="
# ============================================================
az network vnet create \
  --resource-group "$RG" \
  --name "$VNET_NAME" \
  --address-prefix "10.0.0.0/16" \
  --subnet-name "$SUBNET_NAME" \
  --subnet-prefix "10.0.1.0/24" \
  --output table

# ============================================================
echo ""
echo "=== [5/9] Creando NSG — solo puertos 22, 80, 443 ==="
# ============================================================
az network nsg create \
  --resource-group "$RG" \
  --name "$NSG_NAME" \
  --output table

# SSH
az network nsg rule create \
  --resource-group "$RG" \
  --nsg-name "$NSG_NAME" \
  --name "allow-ssh" \
  --priority 100 \
  --protocol Tcp \
  --destination-port-range 22 \
  --access Allow \
  --direction Inbound \
  --output table

# HTTP
az network nsg rule create \
  --resource-group "$RG" \
  --nsg-name "$NSG_NAME" \
  --name "allow-http" \
  --priority 110 \
  --protocol Tcp \
  --destination-port-range 80 \
  --access Allow \
  --direction Inbound \
  --output table

# HTTPS
az network nsg rule create \
  --resource-group "$RG" \
  --nsg-name "$NSG_NAME" \
  --name "allow-https" \
  --priority 120 \
  --protocol Tcp \
  --destination-port-range 443 \
  --access Allow \
  --direction Inbound \
  --output table

# Denegar explícitamente puertos internos
az network nsg rule create \
  --resource-group "$RG" \
  --nsg-name "$NSG_NAME" \
  --name "deny-db-ports" \
  --priority 200 \
  --protocol Tcp \
  --destination-port-ranges 5432 8055 6379 \
  --access Deny \
  --direction Inbound \
  --output table

# ============================================================
echo ""
echo "=== [6/9] Creando NIC ==="
# ============================================================
az network nic create \
  --resource-group "$RG" \
  --name "$NIC_NAME" \
  --vnet-name "$VNET_NAME" \
  --subnet "$SUBNET_NAME" \
  --public-ip-address "$IP_NAME" \
  --network-security-group "$NSG_NAME" \
  --output table

# ============================================================
echo ""
echo "=== [7/9] Creando VM: $VM_NAME ($VM_SIZE, Ubuntu 24.04) ==="
# ============================================================
az vm create \
  --resource-group "$RG" \
  --name "$VM_NAME" \
  --size "$VM_SIZE" \
  --image "$OS_IMAGE" \
  --admin-username "$ADMIN_USER" \
  --ssh-key-value "$SSH_PUBLIC_KEY" \
  --nics "$NIC_NAME" \
  --os-disk-size-gb "$DISK_SIZE_GB" \
  --storage-sku "$DISK_SKU" \
  --boot-diagnostics-storage "" \
  --no-wait \
  --output table

echo "VM creándose en segundo plano..."
echo "Esperando que esté disponible (puede tomar 2-3 minutos)..."

az vm wait \
  --resource-group "$RG" \
  --name "$VM_NAME" \
  --created

echo "VM lista."

# ============================================================
echo ""
echo "=== [8/10] Configurando alertas de presupuesto (ONG $2,000/año) ==="
# ============================================================
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
SCOPE="/subscriptions/$SUBSCRIPTION_ID"

# Presupuesto mensual con alertas en 80%, 100%, 120%
az consumption budget create \
  --budget-name "lirio-monthly-budget" \
  --amount $BUDGET_MONTHLY \
  --category Cost \
  --time-grain Monthly \
  --start-date "$(date +%Y-%m-01)" \
  --end-date "2027-12-31" \
  --resource-group "$RG" \
  --notifications \
    "actualCost_GreaterThan_80Percent={enabled:true,operator:GreaterThan,threshold:80,contactEmails:['$ALERT_EMAIL'],thresholdType:Actual}" \
    "actualCost_GreaterThan_100Percent={enabled:true,operator:GreaterThan,threshold:100,contactEmails:['$ALERT_EMAIL'],thresholdType:Actual}" \
    "actualCost_GreaterThan_120Percent={enabled:true,operator:GreaterThan,threshold:120,contactEmails:['$ALERT_EMAIL'],thresholdType:Actual}" \
  --output table 2>/dev/null || {
    echo ""
    echo "AVISO: Alertas de presupuesto no se pudieron crear via CLI."
    echo "Crear MANUALMENTE en Azure Portal:"
    echo "  Cost Management → Budgets → + Add"
    echo "  Monto: \$150/mes"
    echo "  Alertas: 80% (\$120) → aviso | 100% (\$150) → límite | 120% (\$180) → crítico"
    echo "  Email: $ALERT_EMAIL"
  }

# ============================================================
echo ""
echo "=== [9/10] Habilitando Auto-shutdown a las 23:00 (ahorro crédito) ==="
# ============================================================
VM_ID=$(az vm show --resource-group "$RG" --name "$VM_NAME" --query "id" --output tsv)

# Auto-shutdown disponible vía DevTest Labs resource provider
az rest \
  --method put \
  --uri "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG/providers/Microsoft.DevTestLab/schedules/shutdown-computevm-$VM_NAME?api-version=2018-09-15" \
  --body "{
    \"location\": \"$LOCATION\",
    \"properties\": {
      \"status\": \"Disabled\",
      \"taskType\": \"ComputeVmShutdownTask\",
      \"dailyRecurrence\": {\"time\": \"2300\"},
      \"timeZoneId\": \"Central America Standard Time\",
      \"targetResourceId\": \"$VM_ID\"
    }
  }" \
  --output none 2>/dev/null || echo "(Auto-shutdown: configurar manualmente en Azure Portal si es necesario)"

# ============================================================
echo ""
echo "=== [10/10] Verificando acceso SSH ==="
# ============================================================
echo "Probando conexión SSH a $PUBLIC_IP..."
ssh -i "$SSH_KEY_PATH" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=15 \
  "$ADMIN_USER@$PUBLIC_IP" \
  "echo 'SSH OK — Ubuntu version:' && lsb_release -d" \
  || echo "SSH no listo aun. Reintentar en 30 segundos."

# ============================================================
echo ""
echo "================================================================"
echo "INFRAESTRUCTURA CREADA"
echo "================================================================"
echo ""
echo "IP pública estática : $PUBLIC_IP"
echo "Usuario SSH         : $ADMIN_USER"
echo "Clave privada SSH   : $SSH_KEY_PATH"
echo ""
echo "Conectar con:"
echo "  ssh -i $SSH_KEY_PATH $ADMIN_USER@$PUBLIC_IP"
echo ""
echo "================================================================"
echo "GITHUB SECRETS — agregar en:"
echo "  https://github.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital/settings/secrets/actions"
echo "================================================================"
echo ""
echo "  AZURE_VM_HOST    = $PUBLIC_IP"
echo "  AZURE_VM_USER    = $ADMIN_USER"
echo "  AZURE_VM_SSH_KEY = (contenido de $SSH_KEY_PATH)"
echo ""
echo "  Ver clave privada con:"
echo "  cat $SSH_KEY_PATH"
echo ""
echo "================================================================"
echo "PRÓXIMOS PASOS"
echo "================================================================"
echo ""
echo "1. Ejecutar setup en la VM:"
echo "   ssh -i $SSH_KEY_PATH $ADMIN_USER@$PUBLIC_IP"
echo "   curl -fsSL https://raw.githubusercontent.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital/main/scripts/setup-vm.sh | sudo bash"
echo ""
echo "2. Clonar repo y arrancar:"
echo "   cd /opt/lirio/app"
echo "   git clone https://github.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital ."
echo "   nano .env   # completar con valores reales"
echo "   docker compose up -d"
echo ""
echo "3. Configurar DNS en Cloudflare:"
echo "   A  @              $PUBLIC_IP  Proxied"
echo "   A  www            $PUBLIC_IP  Proxied"
echo "   A  admin          $PUBLIC_IP  Proxied"
echo "   A  api            $PUBLIC_IP  Proxied"
echo "   SSL/TLS → Full (strict)"
echo ""
echo "4. Agregar GitHub Secrets (ver arriba)"
echo ""
echo "5. Push a dev → CI/CD despliega automáticamente"
echo ""
