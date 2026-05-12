# Guía de Deploy — Azure VM + Producción

## Estado actual
- Código listo en GitHub (`dev` y `main`)
- Scripts de provisioning listos
- CI/CD configurado (GitHub Actions)
- Falta: crear VM + configurar infraestructura cloud

---

## FASE A — Preparación local (tu máquina)

### A1. Instalar Azure CLI

Abrir PowerShell como Administrador:

```powershell
winget install -e --id Microsoft.AzureCLI
```

Cerrar y reabrir PowerShell. Verificar:

```powershell
az version
```

Esperado: JSON con versión 2.x

---

### A2. Login con cuenta ONG

```powershell
az login
```

Se abre el browser. Entrar con: `soporte@liriodelosvallescr.org`

Listar suscripciones disponibles:

```powershell
az account list --output table
```

Activar la suscripción ONG (la que tiene los $2,000 crédito):

```powershell
az account set --subscription "NOMBRE_EXACTO_DE_LA_SUSCRIPCION"
```

Verificar que quedó activa:

```powershell
az account show --query "{Nombre:name, ID:id}" --output table
```

---

### A3. Ejecutar script de provisioning

**Usar Git Bash** (no PowerShell — el script es bash):

```bash
cd /c/Proyectos/liriodelosvallescr.org
bash scripts/azure-provision.sh
```

El script pregunta si la suscripción es correcta antes de crear nada.
Responder `s` para continuar.

**Tarda 3-5 minutos.** Crea automáticamente:
- Resource Group `lirio-rg`
- IP pública estática Standard SKU
- Virtual Network + Subnet
- NSG (abre 22/80/443 — bloquea 5432/8055/6379)
- VM Ubuntu 24.04 LTS / Standard_B2ms / Premium SSD 64GB
- SSH key en `~/.ssh/lirio_azure_key`
- Alertas de presupuesto ($120/$150/$180 → soporte@liriodelosvallescr.org)

**Al finalizar imprime:**
```
IP pública estática : X.X.X.X
Usuario SSH         : lirio
Clave privada SSH   : ~/.ssh/lirio_azure_key

GITHUB SECRETS:
  AZURE_VM_HOST    = X.X.X.X
  AZURE_VM_USER    = lirio
  AZURE_VM_SSH_KEY = (ver comando abajo)
```

Guardar esa IP — se usa en todos los pasos siguientes.

---

## FASE B — Configurar la VM

### B1. Conectar por SSH

```bash
ssh -i ~/.ssh/lirio_azure_key lirio@IP_DEL_SCRIPT
```

Primera vez pide confirmar fingerprint — escribir `yes`.

---

### B2. Ejecutar setup de la VM

Dentro de la VM:

```bash
curl -fsSL https://raw.githubusercontent.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital/main/scripts/setup-vm.sh | sudo bash
```

Instala: Docker, Git, Azure CLI, configura firewall ufw, crea estructura:
```
/opt/lirio/
├── app/
├── backups/
├── uploads/
└── logs/
```

Al terminar, **cerrar sesión SSH y volver a entrar**:

```bash
exit
ssh -i ~/.ssh/lirio_azure_key lirio@IP_DEL_SCRIPT
```

Verificar Docker sin sudo:

```bash
docker run hello-world
```

---

### B3. Clonar el repositorio

```bash
cd /opt/lirio/app
git clone https://github.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital .
```

---

### B4. Crear el archivo .env de producción

```bash
cp .env.example .env
nano .env
```

Completar con valores reales de producción:

```env
# PostgreSQL
POSTGRES_DB=lirio_db
POSTGRES_USER=lirio_user
POSTGRES_PASSWORD=<contraseña fuerte, mínimo 20 caracteres>

# Directus
DIRECTUS_KEY=<32 caracteres aleatorios>
DIRECTUS_SECRET=<32 caracteres aleatorios>
DIRECTUS_ADMIN_EMAIL=admin@liriodelosvallescr.org
DIRECTUS_ADMIN_PASSWORD=<contraseña fuerte>
DIRECTUS_PUBLIC_URL=https://admin.liriodelosvallescr.org

# Google OAuth
GOOGLE_CLIENT_ID=<de Google Cloud Console>
GOOGLE_CLIENT_SECRET=<de Google Cloud Console>

# YouTube
YOUTUBE_API_KEY=<de Google Cloud Console>
YOUTUBE_CHANNEL_ID=<ID del canal YouTube de la iglesia>

# Next.js URLs públicas (con HTTPS)
NEXT_PUBLIC_DIRECTUS_URL=https://api.liriodelosvallescr.org
NEXT_PUBLIC_SITE_URL=https://liriodelosvallescr.org

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Umami (opcional)
UMAMI_DATABASE_URL=postgresql://lirio_user:<password>@postgres:5432/umami_db
UMAMI_APP_SECRET=<32 caracteres aleatorios>

# Azure Backups
AZURE_STORAGE_ACCOUNT=liriostorageacct
AZURE_STORAGE_KEY=<clave de Azure Storage>
AZURE_BACKUP_CONTAINER=backups
```

Generar strings aleatorios seguros:

```bash
# Para DIRECTUS_KEY, DIRECTUS_SECRET, UMAMI_APP_SECRET
openssl rand -hex 32
```

---

### B5. Primer arranque del stack

```bash
cd /opt/lirio/app
docker compose up -d
```

Ver estado:

```bash
docker compose ps
```

Todos deben estar `Up (healthy)` en ~2 minutos.

Verificar internamente:

```bash
bash scripts/verify-deploy.sh
```

---

## FASE C — DNS y HTTPS (Cloudflare)

### C1. Configurar registros DNS

En Cloudflare → liriodelosvallescr.org → DNS → Records:

| Tipo | Nombre | Valor            | TTL  | Proxy       |
|------|--------|------------------|------|-------------|
| A    | @      | IP_DEL_SCRIPT    | Auto | ✅ Proxied  |
| A    | www    | IP_DEL_SCRIPT    | Auto | ✅ Proxied  |
| A    | admin  | IP_DEL_SCRIPT    | Auto | ✅ Proxied  |
| A    | api    | IP_DEL_SCRIPT    | Auto | ✅ Proxied  |

**Importante:** Todos deben estar en modo **Proxied** (nube naranja), NO DNS only.

---

### C2. Configurar SSL

En Cloudflare → SSL/TLS → Overview:

Seleccionar: **Full (strict)**

En SSL/TLS → Edge Certificates:
- Always Use HTTPS: **ON**
- Minimum TLS Version: **TLS 1.2**
- Automatic HTTPS Rewrites: **ON**

---

### C3. Verificar HTTPS

```bash
curl -I https://liriodelosvallescr.org
```

Esperado: `HTTP/2 200`

```bash
curl -s https://admin.liriodelosvallescr.org/server/health
```

Esperado: `{"status":"ok"}`

---

## FASE D — GitHub Actions CI/CD

### D1. Agregar GitHub Secrets

Ir a: **GitHub → plataforma-digital → Settings → Secrets and variables → Actions → New repository secret**

Agregar uno por uno:

| Secret | Valor |
|--------|-------|
| `AZURE_VM_HOST` | IP que imprimió el script |
| `AZURE_VM_USER` | `lirio` |
| `AZURE_VM_SSH_KEY` | Contenido de `~/.ssh/lirio_azure_key` (clave privada) |
| `STAGING_ENV_FILE` | Contenido completo del `.env` de staging |
| `PRODUCTION_ENV_FILE` | Contenido completo del `.env` de producción |

Ver clave privada SSH:

```bash
# En tu máquina local (Git Bash)
cat ~/.ssh/lirio_azure_key
```

Copiar TODO el contenido incluyendo `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`.

---

### D2. Configurar cron de backups en la VM

```bash
# En la VM
crontab -e
```

Agregar al final:

```
0 2 * * * /opt/lirio/app/scripts/backup.sh >> /opt/lirio/logs/backup.log 2>&1
```

Esto ejecuta el backup todos los días a las 2:00 AM.

---

### D3. Primer deploy automático

En tu máquina local:

```bash
cd /c/Proyectos/liriodelosvallescr.org
git checkout dev
git push origin dev
```

Ir a GitHub → Actions → ver el workflow `Deploy → Staging` ejecutándose.

Si pasa verde → el deploy automático funciona.

---

## FASE E — Verificación final y producción

### E1. Verificar staging completo

```bash
bash scripts/verify-deploy.sh staging
```

Checklist manual:
- [ ] `https://liriodelosvallescr.org` carga en menos de 3 segundos
- [ ] Toggle dark/light mode funciona
- [ ] Toggle ES/EN funciona en todas las páginas
- [ ] Horarios de servicios se muestran (datos de Directus)
- [ ] Versículo de la semana se muestra
- [ ] Panel Directus accesible en `https://admin.liriodelosvallescr.org`
- [ ] Login Directus funciona con `admin@liriodelosvallescr.org`
- [ ] Formulario de contacto guarda mensaje en Directus
- [ ] Sección En Vivo muestra player (o placeholder si no hay stream)

---

### E2. Deploy a producción

Una vez staging verificado, hacer PR de `dev` → `main`:

```bash
gh pr create \
  --base main \
  --head dev \
  --title "feat: Fase 1 MVP — deploy producción" \
  --body "Stack completo verificado en staging. Listo para producción."
```

Aprobar y mergear el PR → GitHub Actions despliega automáticamente a producción.

---

### E3. Verificar producción

```bash
bash scripts/verify-deploy.sh prod
```

---

## Resumen de costos esperados

| Recurso | Costo mensual estimado |
|---------|----------------------|
| Standard_B2ms (2 vCPU / 8 GB) | ~$60 |
| IP pública estática Standard | ~$4 |
| Premium SSD P10 (128 GB) | ~$15 |
| Backups automáticos | ~$6 |
| **Total estimado** | **~$85/mes** |

Crédito ONG disponible: **$166/mes** → margen de **~$81/mes**

Alertas activas: $120 (aviso) / $150 (límite) / $180 (crítico) → email a soporte@liriodelosvallescr.org

---

## Contacto técnico

- Repo: https://github.com/Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital
- Cuenta Azure: soporte@liriodelosvallescr.org
- Cloudflare: soporte@liriodelosvallescr.org
