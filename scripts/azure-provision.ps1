# azure-provision.ps1 - Crear infraestructura Azure para Lirio de los Valles
# Uso: powershell -ExecutionPolicy Bypass -File scripts\azure-provision.ps1

$ErrorActionPreference = "Stop"
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")

# ============================================================
# CONFIGURACION
# ============================================================
$RG          = "lirio-rg"
$LOCATION    = "centralus"
$VM_NAME     = "lirio-vm"
$VM_SIZE     = "Standard_D2s_v3"
$OS_IMAGE    = "Canonical:ubuntu-24_04-lts:server:latest"
$DISK_GB     = 64
$DISK_SKU    = "Premium_LRS"
$ADMIN_USER  = "lirio"
$SSH_KEY     = "$env:USERPROFILE\.ssh\lirio_azure_key"
$NSG_NAME    = "lirio-nsg"
$VNET_NAME   = "lirio-vnet"
$SUBNET_NAME = "lirio-subnet"
$IP_NAME     = "lirio-ip"
$NIC_NAME    = "lirio-nic"
$ALERT_EMAIL = "soporte@liriodelosvallescr.org"
$BUDGET      = 150
# ============================================================

Write-Host ""
Write-Host "=== [0] Verificando suscripcion activa ===" -ForegroundColor Cyan
az account show --query "{Nombre:name, ID:id, Estado:state}" --output table

Write-Host ""
$confirm = Read-Host "Es la suscripcion ONG correcta? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "Cancela y ejecuta: az account set --subscription NOMBRE"
    exit 1
}

# ============================================================
Write-Host ""
Write-Host "=== [1/9] Generando clave SSH ===" -ForegroundColor Cyan
# ============================================================
$sshDir = Split-Path $SSH_KEY
if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir | Out-Null }

if (Test-Path $SSH_KEY) {
    Write-Host "Clave SSH ya existe: $SSH_KEY - reutilizando"
} else {
    ssh-keygen -t ed25519 -C "lirio-azure-vm" -f $SSH_KEY -N '""'
    Write-Host "Clave SSH generada: $SSH_KEY"
}
$SSH_PUBLIC_KEY = Get-Content "$SSH_KEY.pub" -Raw

# ============================================================
Write-Host ""
Write-Host "=== [2/9] Creando Resource Group ===" -ForegroundColor Cyan
# ============================================================
az group create `
    --name $RG `
    --location $LOCATION `
    --tags proyecto=lirio-plataforma entorno=produccion `
    --output table

# ============================================================
Write-Host ""
Write-Host "=== [3/9] Creando IP publica estatica (Standard SKU) ===" -ForegroundColor Cyan
# ============================================================
az network public-ip create `
    --resource-group $RG `
    --name $IP_NAME `
    --sku Standard `
    --allocation-method Static `
    --zone 1 `
    --output table

$PUBLIC_IP = az network public-ip show `
    --resource-group $RG `
    --name $IP_NAME `
    --query "ipAddress" `
    --output tsv

Write-Host "IP publica estatica: $PUBLIC_IP" -ForegroundColor Green

# ============================================================
Write-Host ""
Write-Host "=== [4/9] Creando VNet y Subnet ===" -ForegroundColor Cyan
# ============================================================
az network vnet create `
    --resource-group $RG `
    --name $VNET_NAME `
    --address-prefix "10.0.0.0/16" `
    --subnet-name $SUBNET_NAME `
    --subnet-prefix "10.0.1.0/24" `
    --output table

# ============================================================
Write-Host ""
Write-Host "=== [5/9] Creando NSG - solo 22, 80, 443 ===" -ForegroundColor Cyan
# ============================================================
az network nsg create --resource-group $RG --name $NSG_NAME --output table

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME `
    --name "allow-ssh" --priority 100 --protocol Tcp `
    --destination-port-range 22 --access Allow --direction Inbound --output table

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME `
    --name "allow-http" --priority 110 --protocol Tcp `
    --destination-port-range 80 --access Allow --direction Inbound --output table

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME `
    --name "allow-https" --priority 120 --protocol Tcp `
    --destination-port-range 443 --access Allow --direction Inbound --output table

az network nsg rule create --resource-group $RG --nsg-name $NSG_NAME `
    --name "deny-db-ports" --priority 200 --protocol Tcp `
    --destination-port-ranges 5432 8055 6379 `
    --access Deny --direction Inbound --output table

# ============================================================
Write-Host ""
Write-Host "=== [6/9] Creando NIC ===" -ForegroundColor Cyan
# ============================================================
az network nic create `
    --resource-group $RG `
    --name $NIC_NAME `
    --vnet-name $VNET_NAME `
    --subnet $SUBNET_NAME `
    --public-ip-address $IP_NAME `
    --network-security-group $NSG_NAME `
    --output table

# ============================================================
Write-Host ""
Write-Host "=== [7/9] Creando VM: $VM_NAME ($VM_SIZE, Ubuntu 24.04) ===" -ForegroundColor Cyan
# ============================================================
az vm create `
    --resource-group $RG `
    --name $VM_NAME `
    --size $VM_SIZE `
    --image $OS_IMAGE `
    --admin-username $ADMIN_USER `
    --ssh-key-value $SSH_PUBLIC_KEY `
    --nics $NIC_NAME `
    --os-disk-size-gb $DISK_GB `
    --storage-sku $DISK_SKU `
    --output table

Write-Host "VM lista." -ForegroundColor Green

# ============================================================
Write-Host ""
Write-Host "=== [8/9] Alertas de presupuesto ONG ===" -ForegroundColor Cyan
# ============================================================
try {
    az consumption budget create `
        --budget-name "lirio-monthly-budget" `
        --amount $BUDGET `
        --category Cost `
        --time-grain Monthly `
        --start-date (Get-Date -Format "yyyy-MM-01") `
        --end-date "2027-12-31" `
        --resource-group $RG `
        --output table
    Write-Host "Budget configurado: $($BUDGET)/mes" -ForegroundColor Green
} catch {
    Write-Host "AVISO: Crear budget manualmente en Azure Portal:" -ForegroundColor Yellow
    Write-Host "  Cost Management -> Budgets -> Add"
    Write-Host "  Monto: $150/mes"
    Write-Host "  Alertas: 80% aviso | 100% limite | 120% critico"
    Write-Host "  Email: $ALERT_EMAIL"
}

# ============================================================
Write-Host ""
Write-Host "=== [9/9] Verificando SSH ===" -ForegroundColor Cyan
# ============================================================
$sshTest = ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15 `
    "$ADMIN_USER@$PUBLIC_IP" "echo SSH-OK && lsb_release -d" 2>&1
Write-Host $sshTest

# ============================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "INFRAESTRUCTURA CREADA" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "IP publica estatica : $PUBLIC_IP"
Write-Host "Usuario SSH         : $ADMIN_USER"
Write-Host "Clave privada SSH   : $SSH_KEY"
Write-Host ""
Write-Host "Conectar con:"
Write-Host "  ssh -i $SSH_KEY ${ADMIN_USER}@${PUBLIC_IP}"
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "GITHUB SECRETS:"
Write-Host "  https://github.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital/settings/secrets/actions"
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  AZURE_VM_HOST    = $PUBLIC_IP"
Write-Host "  AZURE_VM_USER    = $ADMIN_USER"
Write-Host "  AZURE_VM_SSH_KEY = (contenido de $SSH_KEY)"
Write-Host ""
Write-Host "Ver clave privada:"
Write-Host "  Get-Content $SSH_KEY"
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "PROXIMOS PASOS:"
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Setup en la VM:"
Write-Host "   ssh -i $SSH_KEY ${ADMIN_USER}@${PUBLIC_IP}"
Write-Host "   curl -fsSL https://raw.githubusercontent.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital/main/scripts/setup-vm.sh | sudo bash"
Write-Host ""
Write-Host "2. Clonar repo y arrancar:"
Write-Host "   cd /opt/lirio/app"
Write-Host "   git clone https://github.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital ."
Write-Host "   nano .env"
Write-Host "   docker compose up -d"
Write-Host ""
Write-Host "3. DNS Cloudflare (todos Proxied):"
Write-Host "   Nombre raiz (@) -> $PUBLIC_IP"
Write-Host "   www             -> $PUBLIC_IP"
Write-Host "   admin           -> $PUBLIC_IP"
Write-Host "   api             -> $PUBLIC_IP"
Write-Host "   SSL/TLS: Full strict"
