# Plataforma Digital — Asociación Cristiana Lirio de los Valles
**Design Spec** | 2026-05-11

---

## Contexto

La Asociación Cristiana Lirio de los Valles (Cédula jurídica: 3-002-104369) necesita migrar su web institucional actual (Wix en liriodelosvalles.org) a una plataforma propia, moderna y autoadministrable, alojada en Microsoft Azure aprovechando $2,000 USD/año de crédito ONG ya activos.

**Problema central:** La web actual depende de Wix (costo mensual, limitaciones de contenido) y está incompleta. La iglesia necesita una plataforma que usuarios no técnicos puedan administrar sin programadores, con funciones avanzadas (transparencia financiera, radio online, transmisiones automáticas) y costo operativo $0 en software.

**Dominio objetivo:** `liriodelosvallescr.org` (registrado en Namecheap, DNS ya en Cloudflare).

---

## Stack Tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | Next.js 15 (App Router) + TypeScript | SSG/SSR, i18n nativo, rendimiento |
| CMS/Admin | Directus (self-hosted) | Interfaz tipo Notion, roles granulares, Google OAuth integrado |
| Base de datos | PostgreSQL 16 | Open source, robusto, soportado por Directus |
| Contenedores | Docker Compose | Portabilidad total, backup = tar de volúmenes |
| Reverse proxy | Nginx + Cloudflare SSL | SSL automático vía Cloudflare, sin Certbot necesario |
| Radio | AzuraCast | Icecast + AutoDJ + panel web, Docker nativo |
| CDN / DNS / SSL | Cloudflare (free) | SSL, caché, protección DDoS, ya configurado |
| Auth | Google OAuth (vía Directus) | Sin contraseñas propias, aprobación manual por admin |
| Hosting | Azure VM Ubuntu 22.04 B2ms | ~$50-60/mes, dentro del crédito ONG |
| Backups | Docker volumes dump + PostgreSQL dump a Azure Blob | Automatizado vía cron interno |
| Analytics | Umami (self-hosted) | Open source, sin cookies, GDPR compliant |
| Estilos | Tailwind CSS | Utilidades, dark mode nativo, consistencia |

---

## Arquitectura de Dominios

```
liriodelosvallescr.org        → Next.js (sitio público)
admin.liriodelosvallescr.org  → Directus (panel administración)
radio.liriodelosvallescr.org  → AzuraCast (radio online)
api.liriodelosvallescr.org    → Directus API (interno, Next.js la consume)
stats.liriodelosvallescr.org  → Umami (analytics)
```

---

## Infraestructura Docker

Un único `docker-compose.yml` en la VM levanta toda la plataforma:

```
Azure VM Ubuntu 22.04 B2ms (2 vCPU, 8GB RAM)
│
├── nginx (reverse proxy, puertos 80/443)
├── nextjs (frontend, puerto 3000)
├── directus (CMS + API, puerto 8055)
├── postgres (base de datos, puerto 5432 interno)
├── redis (caché Directus, puerto 6379 interno)
├── azuracast (radio, puerto 8080)
├── umami (analytics, puerto 3001)
└── backup-service (cron, dumps a Azure Blob)
```

**Backup strategy:**
- PostgreSQL dump diario → Azure Blob Storage
- Volúmenes Docker tar semanal → Azure Blob Storage
- Retención: 30 días

**Migración:** `docker compose up -d` en cualquier servidor nuevo + restaurar volúmenes = plataforma completa en < 30 minutos.

---

## Estimación de Costos Azure (mensual)

| Servicio | Estimado |
|---------|---------|
| VM B2ms (Ubuntu 22.04) | ~$60 |
| Azure Blob Storage (backups ~50GB) | ~$5 |
| Tráfico de red saliente | ~$3 |
| **Total estimado** | **~$68/mes** |
| **Crédito disponible** | **$166/mes** |
| **Margen** | **~$98/mes de reserva** |

---

## Roles y Permisos

| Rol | Quién | Acceso |
|-----|-------|--------|
| **Root** | Admin técnico del servidor | Acceso total: Docker, configs del sistema, Directus superadmin |
| **Admin** | Liderazgo de la iglesia | Todo el contenido + gestión de usuarios + aprobación de accesos |
| **Editor** | Líderes de ministerios | Crear/editar: noticias, eventos, predicaciones, galería — SIN gestión de usuarios ni documentos financieros |
| **Asociado** | Miembro aprobado de la asociación | Ver y descargar documentos de transparencia financiera |
| **Público** | Visitante anónimo | Sitio público únicamente |

**Flujo de aprobación:**
1. Usuario solicita acceso → inicia sesión con Google
2. Directus crea cuenta con rol "Pendiente"
3. Admin recibe notificación → aprueba o rechaza
4. Usuario obtiene rol "Asociado" y accede a sección privada
5. Toda acción queda auditada en logs de Directus

---

## Fases de Desarrollo

### Fase 1 — MVP (Semanas 1-4)
**Infraestructura + Sitio público base + Admin funcional**

Secciones:
- **Inicio:** hero, horarios de servicios, versículo de la semana, en vivo si hay transmisión, accesos rápidos
- **Historia / Quiénes Somos:** historia de la iglesia, visión, misión, declaración de fe
- **En Vivo:** últimas transmisiones YouTube (sync automático vía YouTube Data API v3), detección de stream activo
- **Donaciones:** SINPE Móvil, número de cuenta, PayPal, información bancaria — sin procesar pagos propios
- **Contacto:** formulario (guardado en Directus), ubicación, horarios, redes sociales

Infraestructura:
- Azure VM creada + configurada
- Docker Compose completo levantado
- Directus + PostgreSQL funcionales
- Nginx + Cloudflare SSL activo
- 5 roles configurados
- Google OAuth funcionando
- Alertas de presupuesto Azure configuradas ($150/mes límite con alerta a $120)
- Modo oscuro/claro: auto-detect sistema operativo + toggle manual
- Bilingüe ES/EN: auto-detect idioma navegador + toggle manual

### Fase 2 — Transparencia + Biblioteca + Ministerios (Semanas 5-8)
- Portal privado Asociados (documentos financieros, actas)
- Biblioteca Digital (material didáctico por roles)
- Sección Ministerios con Page Builder por bloques
- Sección Eventos / Calendario

### Fase 3 — Automatizaciones + Radio (Semanas 9-12)
- Radio AzuraCast funcional con player en el sitio
- Sync automático Facebook transmisiones
- Notificaciones push (PWA)
- Analytics Umami

### Fase 4 — Pulido y PWA (Semana 13+)
- PWA instalable (icono en pantalla del teléfono)
- SEO avanzado
- Optimización de performance
- Page Builder visual completo (bloques LEGO para admins)

---

## Page Builder por Bloques (Fase 2+)

El admin crea páginas nuevas (ministerios, campañas, eventos especiales) eligiendo bloques prediseñados. No hay libertad total — los bloques están preconstruidos para mantener coherencia de diseño.

**Bloques disponibles:**
- `HERO` — imagen de fondo + título + botón CTA
- `TEXTO` — editor de texto enriquecido
- `GALERÍA` — grid de imágenes
- `VIDEO` — embed YouTube/Vimeo
- `EVENTOS` — lista de próximas actividades
- `CTA` — bloque llamada a la acción con botón
- `CRONOGRAMA` — tabla de horarios
- `FORMULARIO` — formulario de contacto/registro
- `MAPA` — embed Google Maps
- `SEPARADOR` — línea visual entre secciones

Implementado como "Dynamic Zones" en Directus + componentes React correspondientes en Next.js.

---

## Internacionalización (i18n)

- Framework: `next-intl`
- Idiomas: Español (ES) y Inglés (EN)
- Detección: `Accept-Language` header del navegador → redirige a `/es/` o `/en/`
- Toggle manual: switch en el header, persiste en localStorage
- Contenido traducible: manejado desde Directus (campos traducidos por colección)
- URLs: `/es/inicio`, `/en/home`, etc.

---

## Modo Oscuro / Claro

- Detección: `prefers-color-scheme` CSS media query vía `next-themes`
- Toggle: botón en header, persiste en localStorage
- Implementación: variables CSS + clases Tailwind `dark:`

---

## Sistema de En Vivo Automático (YouTube)

- Cron job cada 5 minutos llama YouTube Data API v3
- Si hay stream activo → aparece banner "EN VIVO" en el sitio + embed del stream
- Si el stream termina o se elimina → desaparece automáticamente
- Últimas N transmisiones aparecen en sección "Predicaciones"
- API key de YouTube Data API v3 (gratuita, 10,000 unidades/día — suficiente)

---

## Donaciones (sin procesar pagos)

Sección informativa únicamente — cero riesgo legal/técnico:
- SINPE Móvil: número + QR generado estáticamente
- Transferencia bancaria: número de cuenta, IBAN, banco
- PayPal: botón de donación (link externo a PayPal)
- Todo editable desde Directus por el Admin

---

## Identidad Visual

Basada en la web actual liriodelosvalles.org:
- Colores primarios: morado/violeta + blanco + dorado (a confirmar con la iglesia)
- Logo existente: se migra al nuevo sitio
- Tipografía: moderna, legible, que funcione en ES e EN
- Estilo: profesional, cálido, accesible — no genérico

---

## Estructura de Archivos del Proyecto

```
liriodelosvallescr.org/
├── docker-compose.yml          # Orquestación completa
├── .env.example                # Variables de entorno (sin secretos)
├── nginx/
│   ├── nginx.conf
│   └── sites/
├── nextjs/                     # Aplicación Next.js
│   ├── src/
│   │   ├── app/[locale]/       # Rutas por idioma
│   │   ├── components/
│   │   │   ├── blocks/         # Bloques del Page Builder
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── lib/
│   │   │   ├── directus.ts     # Cliente Directus
│   │   │   └── youtube.ts      # Sync YouTube
│   │   └── messages/           # Traducciones ES/EN
├── directus/
│   └── extensions/             # Extensiones custom si se necesitan
├── scripts/
│   ├── backup.sh               # Backup automatizado
│   └── restore.sh
└── docs/
    └── superpowers/specs/
```

---

## Decisiones Fuera de Scope (este proyecto)

- ❌ `liriodelosvalles.org` — dominio viejo, no se toca en esta fase
- ❌ Kubernetes / AKS — overkill para esta escala
- ❌ Azure SQL / PaaS premium — PostgreSQL en Docker es suficiente
- ❌ Procesar pagos propios — riesgo legal y técnico innecesario
- ❌ WordPress / Elementor / plugins pagos
- ❌ Construir CMS desde cero

---

## Criterios de Éxito del MVP

1. `liriodelosvallescr.org` carga en < 3s desde Costa Rica
2. Admin puede subir una noticia sin ayuda técnica en < 2 minutos
3. En vivo de YouTube aparece automáticamente sin intervención humana
4. SSL activo, sitio accesible en HTTPS
5. Costo mensual Azure < $100 (bien dentro del crédito ONG)
6. Backup automatizado funcionando con retención de 30 días
7. Modo oscuro/claro y ES/EN funcionando con toggle manual
