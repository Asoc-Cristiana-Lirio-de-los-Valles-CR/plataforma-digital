# Plataforma Digital — Asociación Cristiana Lirio de los Valles

## Contexto del Proyecto
Web institucional de la Asociación Cristiana Lirio de los Valles (ONG, Costa Rica).
Cédula jurídica: 3-002-104369
Dominio: liriodelosvallescr.org

## Stack
- Frontend: Next.js 15.3.3 + TypeScript + Tailwind CSS + next-intl + next-themes
- CMS: Directus 11 (self-hosted)
- DB: PostgreSQL 16
- Cache: Redis 7
- Proxy: Nginx
- Radio: AzuraCast (Fase 3)
- Analytics: Umami (self-hosted, Docker profile opcional)
- Infraestructura: Docker Compose en Azure VM Ubuntu 24.04 D2s_v3 (centralus)
- DNS/CDN/SSL: Cloudflare (SSL Full strict, proxy activado)
- CI/CD: GitHub Actions

## Plugins — OBLIGATORIOS en todo desarrollo

Antes de cualquier tarea, verificar que los siguientes plugins estén activos:

| Plugin | Cuándo usarlo |
|--------|--------------|
| `superpowers@claude-plugins-official` | Planning, TDD, debugging, code review — SIEMPRE |
| `frontend-design@claude-plugins-official` | Antes de crear cualquier componente visual o página |
| `playwright@claude-plugins-official` | Tests E2E — obligatorio para toda feature pública |
| `caveman@caveman` | Eficiencia de tokens en comunicación |

## Reglas del proyecto (no negociables)

1. **Docker siempre**: todo corre en contenedores, sin excepciones
2. **TDD**: invocar `superpowers:test-driven-development` antes de escribir código
3. **Frontend**: invocar `frontend-design` skill antes de crear cualquier componente nuevo
4. **E2E**: todo flujo de usuario necesita test Playwright
5. **Bilingüe**: toda cadena de texto va en `messages/es.json` Y `messages/en.json`
6. **Dark mode**: usar clases Tailwind `dark:` en todos los componentes
7. **Sin plugins pagos**: cero dependencias de software comercial
8. **Sin procesar pagos propios**: donaciones solo informativas (SINPE, banco, PayPal link)
9. **Commits frecuentes**: un commit por feature/fix, no commits masivos
10. **Code review**: invocar `superpowers:requesting-code-review` antes de merge a main

## Roles del sistema (Directus)

| Rol | Directus Role | admin_access | Quién | Permisos |
|-----|--------------|:------------:|-------|---------|
| `root` | Administrator | ✅ true | Técnico servidor | Control total: usuarios, roles, settings, colecciones, contenido |
| `admin` | Administrador CMS | ❌ false | Liderazgo iglesia | Contenido CMS + gestión usuarios no-root. Sin acceso a roles/settings/system |
| `editor` | Editor | ❌ false | Líderes ministerios | Crear/editar noticias, eventos, predicaciones, galería — Fase 2 |
| `asociado` | Asociado | ❌ false | Miembro aprobado | Ver/descargar documentos transparencia financiera — Fase 2 |
| `publico` | (Public policy) | ❌ false | Visitante anónimo | Sitio público únicamente |

Restricciones de seguridad implementadas en Administrador CMS:
- Permisos con filtro `role._neq=66a4441e...` — root@ invisible e inmodificable
- Campo `role` bloqueado en updates — evita escalación de privilegios
- Sin acceso a: directus_roles, directus_policies, directus_permissions, directus_collections, directus_settings

## Variables de entorno

Ver `.env.example` para lista completa.
**NUNCA** commitear `.env` con valores reales.

## Comandos frecuentes

```bash
# Desarrollo local (Next.js en puerto 4000, Directus en 8055, PostgreSQL en 5432)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Producción
docker compose up -d

# Con analytics (perfil opcional)
docker compose --profile analytics up -d

# Ver logs
docker compose logs -f nextjs
docker compose logs -f directus

# Backup manual
./scripts/backup.sh

# Tests unitarios
cd nextjs && npm test

# Tests E2E
cd nextjs && npm run test:e2e
```

## Puertos en desarrollo local

| Servicio   | Puerto externo | Puerto interno | URL                    |
|------------|---------------|----------------|------------------------|
| Next.js    | **4000**      | 3000           | http://localhost:4000  |
| Directus   | 8055          | 8055           | http://localhost:8055  |
| PostgreSQL | 5432          | 5432           | localhost:5432         |
| Redis      | —             | 6379           | interno Docker only    |

## Arquitectura de Dominios

```
liriodelosvallescr.org        → Next.js (sitio público)
admin.liriodelosvallescr.org  → Directus (panel administración)
radio.liriodelosvallescr.org  → AzuraCast (radio online — Fase 3)
api.liriodelosvallescr.org    → Directus API
stats.liriodelosvallescr.org  → Umami (analytics — perfil opcional)
```

## Fases del proyecto

| Fase | Contenido | Estado |
|------|-----------|--------|
| **Fase 1 — MVP** | Infra + Docker + CMS + 5 secciones (Inicio, Historia, En Vivo, Donaciones, Contacto) | ✅ Completo (dev local) |
| **Fase 2** | Transparencia/Asociados + Biblioteca Digital + Ministerios + Page Builder | ⏳ Pendiente |
| **Fase 3** | Radio AzuraCast + Facebook sync + PWA + Notificaciones push | ⏳ Pendiente |
| **Fase 4** | SEO avanzado + Analytics + Performance + Traefik SSL interno | ⏳ Pendiente |

## Mejoras futuras documentadas

- **Traefik**: reemplazar Nginx para SSL interno automático con Let's Encrypt o Cloudflare Tunnel
- **GitHub Actions**: CI/CD con build + test + deploy automatizado en push a `main`
- **Page Builder**: bloques LEGO en Directus Dynamic Zones (Fase 2)
- **PWA**: manifest.json + service worker para instalación en celular (Fase 3)

## Presupuesto Azure

- Crédito ONG disponible: $2,000 USD/año ($166/mes)
- VM: Standard_D2s_v3 (2 vCPU / 8 GB RAM) en centralus — resize a D4s_v3 si crece
- Estimado mensual: ~$100/mes (D2s_v3 ~$80 + IP estática ~$4 + Premium SSD ~$10 + backups ~$6)
- Margen: ~$66/mes
- Presupuesto mensual configurado: $150/mes (budget en Cost Management)
- Alertas: $120/mes → aviso (80%) | $150/mes → límite (100%) | $180/mes → crítico (120%)
- Nunca superar $166/mes para mantenerse dentro del crédito ONG anual
- Email alertas: soporte@liriodelosvallescr.org

## Gestión de usuarios

**Regla obligatoria**: Cada vez que se crea, modifica o elimina un usuario en cualquier sistema (Directus, PostgreSQL, Umami, Azure, Cloudflare), actualizar `credenciales.txt` en la raíz del proyecto.

- `credenciales.txt` está en `.gitignore` — **NO** se sube al repo
- Mantener actualizado localmente como referencia del equipo técnico
- Operaciones administrativas (crear roles, cambiar políticas): usar `root@liriodelosvallescr.org`
- Gestión de contenido y usuarios normales: usar `admin@liriodelosvallescr.org`

## Estado del stack (2026-05-15)

- Next.js 15.3.3 — CVE-2025-66478 corregido
- Healthchecks: usan `node` (no `wget` — no disponible en imágenes Alpine)
- `version:` eliminado de docker-compose (obsoleto en Compose v2)
- Colecciones Directus: `service_schedule`, `weekly_verse`, `church_info`, `contact_messages`, `church_leaders`, `ministerios`, `team_documents`
- Permisos públicos de lectura activos en service_schedule, weekly_verse, church_info
- GitHub repo activo: `Asoc-Cristiana-Lirio-de-los-Valles-CR/plataforma-digital`
- CI/CD: workflows en `.github/workflows/` (ci.yml, deploy-dev.yml, deploy-prod.yml)
- Branch protection activo en `main` y `dev`
- `DIRECTUS_URL=http://directus:8055` requerido en contenedor Next.js (server-side fetch)
- Roles RBAC implementados: Administrator (root@) + Administrador CMS (admin@) con filtros de seguridad
- Favicon, apple-icon, OG image generados con Next.js ImageResponse
- Footer y ContactPage convertidos a Server Components
- robots.txt y rutas estáticas excluidas del middleware i18n
- Biblioteca: búsqueda server-side por título/fecha (año, mes, día), carrusel de años, filtro por predicador/serie
- YouTube sync: detecta videos borrados y los marca `youtube_status=unavailable` (ocultos en web)
- Zona Equipo (`/equipo/manuales`): protegida por HMAC-SHA256 cookie (TEAM_SECRET). Middleware Edge Runtime usa Web Crypto API. Documentos con `visibility=private` requieren cookie; `visibility=link` accesibles por enlace directo sin cookie. Sin descarga — solo `Content-Disposition: inline`. SSH VPS: `lirio@20.12.207.240` con `~/.ssh/lirio_azure_key`. Proyecto en `/opt/lirio/app`

## Infraestructura VM — registro de cambios y tenants

**Este proyecto es el DUEÑO de la VM Azure y de Directus.** Todo cambio a nivel
de host (kernel, swap, nginx compartido, firewall, Docker daemon) o a Directus
(flows, roles, webhooks) debe registrarse aquí, aunque lo origine otro proyecto.
Otros proyectos alojados en la VM son *tenants*: gestionan su propio compose y
su carpeta, pero NO modifican recursos compartidos sin registrarlo en este repo.

### Cambios a nivel de host

| Fecha | Cambio | Motivo | Detalle |
|-------|--------|--------|---------|
| 2026-07-15 | Swap 2 GB creado (`/swapfile`, persistente en `/etc/fstab`) + `vm.swappiness=10` (`/etc/sysctl.d/99-swappiness.conf`) | Colchón anti-OOM antes de alojar tenants adicionales | Ejecutado vía SSH desde sesión del proyecto Sistema-Eventos. Disco usado: +2 GB |

### Tenants en la VM (además de esta plataforma)

| Tenant | Carpeta | Estado | Recursos compartidos que usa |
|--------|---------|--------|------------------------------|
| Sistema de Eventos (`Sistema-Eventos-LiriodelosValles`) | — | ❌ **Deploy en esta VM CANCELADO (2026-08-17)** | **Ninguno de esta VM.** Sí usa un recurso institucional **fuera** de ella: el **Google Workspace de la Iglesia** (ver más abajo, 2026-10-09). A futuro, Azure como destino de backup off-site |

> ## ⚠️ CAMBIO DE ARQUITECTURA DEL TENANT — 2026-08-17 (Regla #0)
>
> **El Sistema de Eventos ya NO se desplegará en esta VM.** Decisión de Rafael.
> Su arquitectura oficial es:
>
> | Máquina | Rol |
> |---|---|
> | MEGALAPTOP | Desarrollo |
> | PC de la iglesia · VM `eventos-prod` | **Producción principal · único escritor de su BD** |
> | PC de la iglesia · VM `eventos-staging` | Staging |
> | **Azure (esta VM)** | **Backup off-site del tenant. Nada más** |
>
> Cadena de ejecución del tenant: `Windows 11 Pro → Hyper-V → VM Linux → Docker`,
> en hardware propio de la iglesia (i7-14700F, 32 GB RAM).
>
> **Queda RETIRADO como anticipado** (ya no hará falta):
> - ~~Bloque nginx `eventos.liriodelosvallescr.org` → proxy al contenedor del tenant~~
> - ~~Subdominio `eventos` en Cloudflare~~
> - ~~Flows Directus "Encender/Apagar eventos" → webhook interno (`172.17.0.1:9000`)~~ —
>   no habrá aplicación que encender o apagar en esta VM.
>
> **Lo único que este proyecto podría recibir del tenant en el futuro** es un canal de
> recepción de **backups** (dumps verificados). Eso será un mecanismo **separado** del
> deployment de aplicación, aún **sin diseñar y sin aprobar**. No implica correr Docker
> Compose del tenant, ni Node, ni exponer nada suyo.
>
> **Impacto neto para esta plataforma: positivo.** Se libera la reserva de ≈502 MiB
> proyectada para el tenant, y desaparecen el bloque nginx, el subdominio y el flow
> Directus del alcance. No se ejecutó ningún cambio de infraestructura con esta decisión:
> es únicamente documental.
>
> Punto de verdad del tenant:
> `C:\Proyectos\Sistema-Eventos-LiriodelosValles\docs\ARQUITECTURA-OFICIAL.md`.

#### REGLA #0 — visibilidad bidireccional con los tenants

Todo cambio en un tenant se registra aquí, **y todo cambio de esta plataforma
que toque host, Nginx compartido, Cloudflare, Directus (roles/flows/webhooks),
capacidad de la VM, presupuesto Azure, ventanas de mantenimiento o secretos
compartidos debe registrarse también en el repo del tenant afectado.** La
jerarquía define quién decide; la Regla #0 define quién se entera: los dos,
siempre. Ante la duda, se registra en ambos lados.

#### Identidad oficial del tenant — cambio 2026-08-05

El nombre oficial del producto pasa a ser **`Sistema Eventos — Iglesia Lirio de
los Valles`**. El nombre histórico `Sistema Ventas / Sistema de Ventas` solo se
usa ya para referirse a fases, commits o rutas anteriores. Al referirse al
tenant desde esta plataforma (nginx, Directus, documentación, subdominio
`eventos.liriodelosvallescr.org`), usar el nombre nuevo.

La nomenclatura Docker del tenant (`sistema-ventas-liriodelosvalles*`,
`lirios_ventas`, `lirios_user`) sigue **deliberadamente sin cambiar** para
conservar su volumen de datos: se renombrará en una operación controlada
**antes** del deploy en esta VM, nunca durante.

#### Renombrado del tenant COMPLETADO en local — 2026-08-06

La nomenclatura definitiva **ya está aplicada y validada en local**. El deploy en esta VM
usará estos nombres directamente; no habrá que renombrar nada durante la migración.

| Elemento | Nombre definitivo (vigente en local) |
|---|---|
| Proyecto Compose | `sistema-eventos-liriodelosvalles` |
| Volumen MySQL | `sistema-eventos-liriodelosvalles_mysql_data` |
| Imagen | `sistema-eventos-liriodelosvalles-app` |
| Red | `sistema-eventos-liriodelosvalles_eventos-network` |
| Contenedores | `eventos-app` · `eventos-db` · `eventos-phpmyadmin` |

El prefijo `eventos-*` no colisiona con los `lirio_*` de esta plataforma, y su red es propia:
ambos stacks quedan aislados en la VM.

> ⚠️ **CORREGIDO 2026-08-17 (Regla #0) — este párrafo estaba desactualizado.**
> Decía que la base `lirios_ventas` y el usuario `lirios_user` seguían **"NO renombrado
> deliberadamente"**. Quedó **superado por la Fase 3C del tenant** (2026-08-06, commit
> `5176072`): hoy son **`eventos_liriodelosvalles`** y **`eventos_user`**, verificados en
> ejecución. Los nombres antiguos se conservan solo como **rollback**.
>
> Tampoco estaban registradas aquí, y se registran ahora:
> - **Fase 3A** (2026-08-06) — endurecimiento de red del tenant: sus servicios de base de
>   datos pasaron a escuchar solo en loopback.
> - **Fase 3B** (2026-08-06) — rotación de credenciales de base de datos del tenant.
> - **Fase 1** (2026-08-14) — repositorio privado del tenant creado con historial purgado.
>
> *(Detalle técnico de 3A y 3B: en el repositorio privado del tenant, no aquí.)*
>
> **Impacto para esta plataforma en los tres casos: ninguno.** No se tocó Nginx, Directus,
> PostgreSQL, Redis, puertos, dominios ni SSL.

**Nombres antiguos, hoy solo rollback:** base `lirios_ventas`, usuario `lirios_user`. El
esquema, las migraciones y los nombres de servicio internos del compose del tenant sí siguen
sin renombrar, deliberadamente. No afecta a esta plataforma.

Validación: dump verificado por restauración en un MySQL efímero, copia del datadir con el
volumen antiguo en solo lectura, snapshots PRE/POST **idénticos** en 15 métricas, QA 65
pruebas en verde. El volumen antiguo se conserva como rollback hasta varios días de
operación estable.

**Impacto para esta plataforma: ninguno.** No se tocó Nginx, Directus, PostgreSQL, Redis,
puertos, dominios ni SSL. El tenant sigue sin desplegarse en la VM.

Pendiente antes de su deploy: rotación de credenciales del tenant (Fase 3), gate de
seguridad y gate de capacidad.

#### Registro del tenant Sistema de Eventos — 2026-08-05

Ruta local del repo: `C:\Proyectos\Sistema-Eventos-LiriodelosValles`
(migrada desde `C:\sistema-ventas-LiriodelosValles`). Estado: **documentación
de cierre completada**; sigue sin desplegarse en la VM.

- **Naming definitivo acordado** (se aplicará antes del deploy, no ahora):
  proyecto Compose `sistema-eventos-liriodelosvalles`, volumen
  `sistema-eventos-liriodelosvalles_mysql_data`, imagen
  `sistema-eventos-liriodelosvalles-app`, contenedores `eventos-app` /
  `eventos-db` / `eventos-phpmyadmin`, BD `eventos_liriodelosvalles`, usuario
  `eventos_user`. El prefijo `eventos-*` evita colisión con los `lirio_*` de
  esta plataforma.
- **Baseline de consumo medido:** ≈502 MiB en reposo (MySQL 411 + Node 71 +
  phpMyAdmin 20). Apagarlo libera **498 MB medidos**.
- **Baseline de esta VM medido el mismo día** (SSH solo lectura): 2 vCPU,
  7.8 GiB con 5.5 GiB disponibles, swap 2 GiB **sin usar en 85 días**, load
  0.09, 18 G de disco libres; los 5 contenedores de esta plataforma suman
  **≈444 MiB** (`lirio_directus` 251.6 · `lirio_nextjs` 132.5 ·
  `lirio_postgres` 45.7 · `lirio_redis` 9.6 · `lirio_nginx` 5.0).
- **Conclusión:** la convivencia PostgreSQL + MySQL cabe en la VM actual
  (≈36 % de RAM usada proyectada). **No se migra MySQL a PostgreSQL** y no se
  mezclan bases de datos de ambos proyectos.
- Documentos del tenant:
  `docs/superpowers/specs/2026-08-05-cierre-migracion-local-inventario-vps.md`
  y `docs/ANALISIS-RECURSOS-AZURE-MYSQL-POSTGRESQL.md`.

#### Dependencia de Google Workspace del tenant Sistema de Eventos — 2026-10-09 (Regla #0)

El tenant pasó a depender de un **recurso institucional compartido que no vive en
esta VM**: el **Google Workspace de la Iglesia**. Se registra aquí porque la
Regla #0 obliga, y porque una decisión administrativa sobre el Workspace (borrar
un usuario, revocar una delegación, cambiar MX) **rompería el tenant sin que
nadie lo relacionara con esta plataforma**.

**Propósito.** El Sistema de Eventos envía correo transaccional: el enlace de
recuperación de contraseña de sus voluntarios. Sin él, quien olvida su contraseña
depende de que un administrador se la cambie a mano. Es el único uso. **No envía
boletines, ni listas, ni correo masivo.**

| Elemento | Valor |
|---|---|
| Proyecto de Google Cloud | `sistema-eventos-lirio` (el mismo que ya usaba para OAuth) |
| API habilitada | **Gmail API, y ninguna otra** |
| Mecanismo de autenticación | Cuenta de servicio + **delegación de dominio** (JWT con `subject`). No usa contraseña ni 2FA de ninguna persona |
| Cuenta de servicio | `correo-sistema-eventos@sistema-eventos-lirio.iam.gserviceaccount.com` · Client ID `108542837249666911908` · **cero roles IAM** |
| Scope delegado | **uno solo**: `https://www.googleapis.com/auth/gmail.send` — permite enviar, **no** leer, listar ni borrar correo |
| Identidad suplantada (`subject`) | `soporte@liriodelosvallescr.org` — usuario **real** con buzón |
| Remitente visible (`From`) | `notificaciones@liriodelosvallescr.org` — **alias** del anterior |
| `Reply-To` | `soporte@liriodelosvallescr.org` |
| Claves | **una sola**, en el secret `GOOGLE_SA_KEY_B64` del repositorio privado del tenant. No caduca. No se comparte con ningún otro proyecto |

> ⚠️ **La Gmail API no puede suplantar un alias.** `subject` tiene que ser un
> usuario con buzón. Por eso se suplanta `soporte@` y se envía con
> `From: notificaciones@`. Si alguien dejara de tener `notificaciones@` como
> alias de `soporte@`, el envío falla con `400 Invalid From header` y el motivo
> **no es evidente** desde el lado del tenant.

**Dependencias operativas — qué rompe el envío.** Cualquiera de estas acciones,
tomadas desde esta consola de administración, deja al tenant sin correo:

1. Suspender o eliminar el usuario `soporte@liriodelosvallescr.org`.
2. Quitar `notificaciones@` de sus alias / de «Enviar mensaje como».
3. Revocar la delegación de dominio del Client ID de arriba.
4. Quitar el scope `gmail.send` de esa delegación.
5. Eliminar la clave de la cuenta de servicio desde Google Cloud.

**Procedimiento de recuperación.** El síntoma es que el usuario pide el enlace,
recibe la respuesta genérica de siempre y el correo nunca llega; en la auditoría
del tenant aparece `password_reset_requested` **sin** su
`password_reset_email_sent`. El tenant **no queda inoperable**: el login normal y
el login con Google siguen funcionando, y un administrador puede cambiar
contraseñas a mano. Restaurar el envío consiste en reponer el punto roto de la
lista anterior; el detalle vive en el repositorio del tenant.

**Riesgos registrados.**

- **Disponibilidad:** el envío depende de que una cuenta humana (`soporte@`) siga
  existiendo. La delegación no usa su contraseña ni su 2FA, así que los cambios
  rutinarios de esa cuenta no afectan — pero su baja sí.
- **Renovación:** la clave **no caduca**
  (`iam.serviceAccountKeyExpiryHours` = «Todos»). No hay fecha de vencimiento que
  vigilar, y tampoco rotación automática: si algún día se decide rotarla, es una
  operación manual.
- **Revocación:** `iam.disableServiceAccountKeyCreation` está **activa y
  heredada** en el proyecto. Crear una clave nueva exige una excepción temporal a
  nivel de proyecto otorgada por un administrador de la organización. Usarla, no.
- **Responsable institucional y calendario de mantenimiento:** *no documentados.*
  No se inventan aquí. Queda como pendiente de definir.

**Lo que esta plataforma NO comparte hoy:** nada. La cuenta de servicio, la clave
y la delegación sirven **exclusivamente** al Sistema de Eventos. Si el sitio
institucional o cualquier otro proyecto necesitara enviar correo, es una decisión
de arquitectura propia, documentada y **sin implementar** en
[`docs/ARQUITECTURA-CORREO-INSTITUCIONAL.md`](docs/ARQUITECTURA-CORREO-INSTITUCIONAL.md).

#### Hallazgos sobre los dominios institucionales — 2026-10-09 (Regla #0)

Dos comprobaciones hechas al documentar lo anterior afectan a **esta plataforma**,
no solo al tenant.

**1. `liriodelosvalles.org` es un DOMINIO SECUNDARIO, no un alias.** Verificado en
Consola de administración → Cuenta → Dominios → Administrar dominios:

| Dominio | Tipo | Estado del correo |
|---|---|---|
| `liriodelosvallescr.org` | Dominio principal | Todo está bien |
| `liriodelosvalles.org` | **Dominio secundario** | ⚠️ **Acción necesaria** |
| `liriodelosvallescr.org.test-google-a.com` | Alias del dominio de prueba | Activo |

La distinción importa y es fácil de confundir: **un dominio secundario es un
espacio de nombres independiente**. `soporte@liriodelosvalles.org` **no existe**
por el hecho de que exista `soporte@liriodelosvallescr.org`; habría que crear
usuarios explícitamente. Un *alias de dominio* sí habría duplicado los buzones.

Su DNS lo confirma y añade un matiz: **su correo NO pasa por Google**.

| | `liriodelosvallescr.org` | `liriodelosvalles.org` |
|---|---|---|
| MX | Google Workspace (`aspmx.l.google.com`) | **Cloudflare Email Routing** |
| SPF | incluye `_spf.google.com` | **solo** `_spf.mx.cloudflare.net` |
| DMARC | `p=none` con `rua` | **ausente** |

⇒ Enviar hoy desde `@liriodelosvalles.org` con la infraestructura del tenant
**fallaría la comprobación SPF** y, sin DMARC, acabaría muy probablemente en
spam. No se cambió ningún registro: es solo el diagnóstico.

**Contexto que encaja:** el diseño aprobado de ese dominio
(`docs/superpowers/specs/2026-09-16-dominio-liriodelosvalles-org-design.md`) lo
define como **mirror web** del sitio público y **no menciona el correo en
ninguna parte**. Su alta como dominio secundario en el Workspace **no está
registrada en ningún diseño** — puede ser deliberada (reservar el nombre) o un
residuo del alta inicial. Queda anotada aquí por primera vez; no se modifica.

**2. HSTS está anulado a nivel de zona de Cloudflare.** Medido el 2026-10-09 en
los tres orígenes de la zona:

```
https://liriodelosvallescr.org/        -> Strict-Transport-Security: max-age=0; includeSubDomains; preload
https://eventos.liriodelosvallescr.org/        -> idéntico
https://eventos-staging.liriodelosvallescr.org/ -> idéntico
```

`max-age=0` no es «HSTS ausente»: **le ordena al navegador OLVIDAR** cualquier
política previa. Como el sitio institucional corre en otro origen (VM Azure,
Nginx) y devuelve exactamente la misma cabecera, el valor **lo pone Cloudflare**,
no las aplicaciones. En el caso del tenant está además **sobrescribiendo** el
`max-age=31536000` que su propio código emite.

**No se cambió nada.** Se registra porque es una decisión de zona que afecta a
los dos proyectos y **la decisión es de esta plataforma**, dueña de Cloudflare.

#### Política de capacidad de la VM (aplica a TODOS los tenants)

🚨 **Aumentar recursos de Azure (CPU, RAM, tamaño de VM, SKU, escalamiento
vertical) NO está disponible en esta etapa.** La infraestructura es
presupuesto fijo. Ante consumo elevado, el orden obligatorio es: medir →
identificar el responsable → optimizar configuración → reducir servicios
innecesarios → aprovechar Docker y políticas de reinicio → usar el
interruptor ON/OFF del tenant → recién entonces evaluar si hay un problema
real de capacidad.

Escalera de degradación acordada: **N0** límites `deploy.resources` en todos
los composes (hoy **ningún** compose los declara — riesgo abierto) · **N1**
no desplegar servicios prescindibles (phpMyAdmin, perfil `analytics`) ·
**N2** apagar el tenant vía interruptor · **N3** afinar motores
(`performance_schema`, buffer pool, `max_connections`, workers) · ~~resize
vertical~~ 🚫 no disponible · **N4** separar el tenant a otra máquina ·
**N5** reversión total de su deploy. Esta plataforma tiene **prioridad
absoluta**: se degrada al tenant antes que al sitio institucional, y una
operación defectuosa del interruptor jamás puede dejarla fuera de servicio.

**Gate para tenants futuros:** baseline medido + límites declarados en su
compose (sin límites, no entra) + capacidad restante recalculada con margen
≥ 25 % + alta en esta tabla. Sin resize como red de seguridad.

## Documentación técnica

- Spec de diseño: `docs/superpowers/specs/2026-05-11-plataforma-iglesia-lirio-design.md`
- Plan Fase 1: `docs/superpowers/plans/2026-05-11-subplan-1-infra-cms-mvp.md`
- Plan Fase 2: `docs/superpowers/plans/2026-05-11-subplan-2-transparencia-biblioteca.md` (pendiente)
- Plan Fase 3: `docs/superpowers/plans/2026-05-11-subplan-3-automatizaciones-radio.md` (pendiente)
- Correo institucional (diseño, **sin implementar**): [`docs/ARQUITECTURA-CORREO-INSTITUCIONAL.md`](docs/ARQUITECTURA-CORREO-INSTITUCIONAL.md)
