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

## Documentación técnica

- Spec de diseño: `docs/superpowers/specs/2026-05-11-plataforma-iglesia-lirio-design.md`
- Plan Fase 1: `docs/superpowers/plans/2026-05-11-subplan-1-infra-cms-mvp.md`
- Plan Fase 2: `docs/superpowers/plans/2026-05-11-subplan-2-transparencia-biblioteca.md` (pendiente)
- Plan Fase 3: `docs/superpowers/plans/2026-05-11-subplan-3-automatizaciones-radio.md` (pendiente)
