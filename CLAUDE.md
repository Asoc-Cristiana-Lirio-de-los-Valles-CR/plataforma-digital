# Plataforma Digital — Asociación Cristiana Lirio de los Valles

## Contexto del Proyecto
Web institucional de la Asociación Cristiana Lirio de los Valles (ONG, Costa Rica).
Cédula jurídica: 3-002-104369
Dominio: liriodelosvallescr.org

## Stack
- Frontend: Next.js 15 + TypeScript + Tailwind CSS + next-intl + next-themes
- CMS: Directus 11 (self-hosted)
- DB: PostgreSQL 16
- Cache: Redis 7
- Proxy: Nginx
- Radio: AzuraCast (Fase 3)
- Analytics: Umami (self-hosted, Docker profile opcional)
- Infraestructura: Docker Compose en Azure VM Ubuntu 22.04 B2ms
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

| Rol | Quién | Permisos |
|-----|-------|---------|
| `root` | Técnico del servidor | Acceso total sistema + Directus superadmin |
| `admin` | Liderazgo iglesia | Todo el contenido + gestión usuarios + aprobación accesos |
| `editor` | Líderes ministerios | Crear/editar noticias, eventos, predicaciones, galería |
| `asociado` | Miembro aprobado asociación | Ver/descargar documentos transparencia financiera |
| `publico` | Visitante anónimo | Sitio público únicamente |

## Variables de entorno

Ver `.env.example` para lista completa.
**NUNCA** commitear `.env` con valores reales.

## Comandos frecuentes

```bash
# Desarrollo local
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
| **Fase 1 — MVP** | Infra + Docker + CMS + 5 secciones (Inicio, Historia, En Vivo, Donaciones, Contacto) | 🚧 En desarrollo |
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
- Estimado mensual: ~$68/mes
- Margen: ~$98/mes
- Alertas configuradas: $120 (aviso) / $150 (límite) / $180 (crítico)

## Documentación técnica

- Spec de diseño: `docs/superpowers/specs/2026-05-11-plataforma-iglesia-lirio-design.md`
- Plan Fase 1: `docs/superpowers/plans/2026-05-11-subplan-1-infra-cms-mvp.md`
- Plan Fase 2: `docs/superpowers/plans/2026-05-11-subplan-2-transparencia-biblioteca.md` (pendiente)
- Plan Fase 3: `docs/superpowers/plans/2026-05-11-subplan-3-automatizaciones-radio.md` (pendiente)
