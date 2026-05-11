# Plataforma Digital Lirio de los Valles — Sub-Plan 1: Infraestructura + CMS + MVP Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar infraestructura completa en Azure con Docker, CMS Directus funcional, y sitio Next.js con 5 secciones MVP (Inicio, Historia, En Vivo, Donaciones, Contacto) bilingüe ES/EN con dark/light mode.

**Architecture:** Un único docker-compose.yml en Azure VM Ubuntu 22.04 B2ms orquesta Next.js + Directus + PostgreSQL + Nginx. Cloudflare provee SSL y CDN. Next.js consume Directus vía API REST. Contenido 100% editable desde panel Directus sin tocar código.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Directus 11, PostgreSQL 16, Redis 7, Nginx, Docker Compose, Tailwind CSS, next-intl, next-themes, Cloudflare (DNS+SSL), Azure VM Ubuntu 22.04 B2ms

**Plugins requeridos para desarrollo:**
- `superpowers@claude-plugins-official` — planning, TDD, debugging, code review
- `frontend-design@claude-plugins-official` — diseño UI/UX de componentes y páginas
- `playwright@claude-plugins-official` — pruebas E2E automatizadas
- `caveman@caveman` — eficiencia de tokens en comunicación

---

## Estructura de Archivos

```
liriodelosvallescr.org/
├── CLAUDE.md                          # Instrucciones del proyecto para Claude
├── docker-compose.yml                 # Orquestación completa
├── docker-compose.dev.yml             # Override para desarrollo local
├── .env.example                       # Variables de entorno (sin secretos)
├── .env                               # Variables reales (gitignored)
├── .gitignore
├── nginx/
│   ├── nginx.conf                     # Config principal
│   └── conf.d/
│       ├── nextjs.conf                # Proxy → Next.js :3000
│       ├── directus.conf              # Proxy → Directus :8055
│       └── azuracast.conf             # Proxy → AzuraCast :8080
├── nextjs/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   └── [locale]/
│   │   │       ├── layout.tsx         # Root layout con providers
│   │   │       ├── page.tsx           # Inicio
│   │   │       ├── historia/
│   │   │       │   └── page.tsx
│   │   │       ├── en-vivo/
│   │   │       │   └── page.tsx
│   │   │       ├── donaciones/
│   │   │       │   └── page.tsx
│   │   │       └── contacto/
│   │   │           └── page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx         # Nav + dark toggle + lang toggle
│   │   │   │   └── Footer.tsx
│   │   │   ├── sections/
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── ScheduleSection.tsx
│   │   │   │   ├── VerseSection.tsx
│   │   │   │   ├── LiveStreamSection.tsx
│   │   │   │   └── DonationMethods.tsx
│   │   │   └── ui/
│   │   │       ├── ThemeToggle.tsx
│   │   │       └── LanguageToggle.tsx
│   │   ├── lib/
│   │   │   ├── directus.ts            # Cliente Directus tipado
│   │   │   └── youtube.ts             # YouTube Data API v3 client
│   │   ├── messages/
│   │   │   ├── es.json                # Traducciones español
│   │   │   └── en.json                # Traducciones inglés
│   │   └── middleware.ts              # Detección idioma + redirect
│   ├── tests/
│   │   ├── e2e/                       # Tests Playwright
│   │   │   ├── homepage.spec.ts
│   │   │   ├── navigation.spec.ts
│   │   │   └── i18n.spec.ts
│   │   └── unit/
│   │       ├── directus.test.ts
│   │       └── youtube.test.ts
│   └── playwright.config.ts
├── scripts/
│   ├── setup-vm.sh                    # Provisioning Azure VM
│   ├── deploy.sh                      # Deploy desde git
│   ├── backup.sh                      # Backup PostgreSQL + volúmenes
│   └── restore.sh
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-05-11-plataforma-iglesia-lirio-design.md
        └── plans/
            ├── 2026-05-11-subplan-1-infra-cms-mvp.md      (este archivo)
            ├── 2026-05-11-subplan-2-transparencia-biblioteca.md
            └── 2026-05-11-subplan-3-automatizaciones-radio.md
```

---

## Task 1: CLAUDE.md + Estructura base del proyecto

**Files:**
- Create: `CLAUDE.md`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Crear CLAUDE.md**

```markdown
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
- Radio: AzuraCast
- Analytics: Umami
- Infraestructura: Docker Compose en Azure VM Ubuntu 22.04 B2ms
- DNS/CDN/SSL: Cloudflare

## Plugins requeridos — OBLIGATORIOS en todo desarrollo
- `superpowers@claude-plugins-official` — planning, TDD, debugging, code review
- `frontend-design@claude-plugins-official` — diseño UI/UX (invocar antes de crear cualquier componente visual)
- `playwright@claude-plugins-official` — pruebas E2E (requerido para toda feature pública)
- `caveman@caveman` — eficiencia de tokens

## Reglas del proyecto
1. Docker siempre: todo corre en contenedores, sin excepciones
2. TDD: escribir test antes del código (usar superpowers:test-driven-development)
3. Frontend: invocar frontend-design skill antes de crear cualquier componente nuevo
4. E2E: todo flujo de usuario necesita test Playwright
5. Bilingüe: toda cadena de texto va en messages/es.json y messages/en.json
6. Dark mode: usar clases Tailwind dark: en todos los componentes
7. Sin plugins pagos: cero dependencias de software comercial
8. Sin procesar pagos propios: donaciones solo informativas (SINPE, banco, PayPal link)

## Roles del sistema (Directus)
- root: acceso total sistema (solo técnico)
- admin: contenido + gestión usuarios (liderazgo iglesia)
- editor: noticias, eventos, predicaciones (líderes ministerios)
- asociado: documentos de transparencia financiera (miembros aprobados)
- publico: sitio público (visitante anónimo)

## Variables de entorno
Ver .env.example para lista completa.
NUNCA commitear .env con valores reales.

## Comandos frecuentes
```bash
# Desarrollo local
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Producción
docker compose up -d

# Backup manual
./scripts/backup.sh

# Ver logs
docker compose logs -f nextjs
docker compose logs -f directus
```

## Fases del proyecto
- Fase 1 (MVP): Infra + CMS + 5 secciones (Inicio, Historia, En Vivo, Donaciones, Contacto)
- Fase 2: Transparencia/Asociados + Biblioteca Digital + Ministerios + Page Builder
- Fase 3: Radio AzuraCast + YouTube/Facebook sync automático + Notificaciones
- Fase 4: PWA + SEO avanzado + Analytics

## Spec de diseño
Ver: docs/superpowers/specs/2026-05-11-plataforma-iglesia-lirio-design.md
```

- [ ] **Step 2: Crear .gitignore**

```gitignore
.env
.env.local
node_modules/
.next/
nextjs/.next/
nextjs/node_modules/
*.log
.DS_Store
.superpowers/
uploads/
directus/uploads/
```

- [ ] **Step 3: Crear .env.example**

```env
# PostgreSQL
POSTGRES_DB=lirio_db
POSTGRES_USER=lirio_user
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Directus
DIRECTUS_KEY=CHANGE_ME_32_CHAR_RANDOM_STRING
DIRECTUS_SECRET=CHANGE_ME_32_CHAR_RANDOM_STRING
DIRECTUS_ADMIN_EMAIL=admin@liriodelosvallescr.org
DIRECTUS_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DIRECTUS_PUBLIC_URL=https://admin.liriodelosvallescr.org

# Google OAuth (para login asociados)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxx

# Next.js
NEXT_PUBLIC_DIRECTUS_URL=https://api.liriodelosvallescr.org
NEXT_PUBLIC_SITE_URL=https://liriodelosvallescr.org

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

- [ ] **Step 4: Commit inicial**

```bash
git init
git add CLAUDE.md .gitignore .env.example
git commit -m "chore: project scaffold with CLAUDE.md and env template"
```

---

## Task 2: docker-compose.yml completo

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`
- Create: `nginx/nginx.conf`
- Create: `nginx/conf.d/nextjs.conf`
- Create: `nginx/conf.d/directus.conf`

- [ ] **Step 1: Crear docker-compose.yml**

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: lirio_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - nextjs
      - directus
    restart: unless-stopped
    networks:
      - lirio_net

  nextjs:
    build:
      context: ./nextjs
      dockerfile: Dockerfile
    container_name: lirio_nextjs
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_DIRECTUS_URL=${NEXT_PUBLIC_DIRECTUS_URL}
      - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      - YOUTUBE_CHANNEL_ID=${YOUTUBE_CHANNEL_ID}
    depends_on:
      - directus
    restart: unless-stopped
    networks:
      - lirio_net

  directus:
    image: directus/directus:11
    container_name: lirio_directus
    environment:
      KEY: ${DIRECTUS_KEY}
      SECRET: ${DIRECTUS_SECRET}
      ADMIN_EMAIL: ${DIRECTUS_ADMIN_EMAIL}
      ADMIN_PASSWORD: ${DIRECTUS_ADMIN_PASSWORD}
      DB_CLIENT: pg
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: ${POSTGRES_DB}
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      CACHE_ENABLED: "true"
      CACHE_STORE: redis
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PUBLIC_URL: ${DIRECTUS_PUBLIC_URL}
      AUTH_PROVIDERS: google
      AUTH_GOOGLE_DRIVER: oauth2
      AUTH_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      AUTH_GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      AUTH_GOOGLE_AUTHORIZE_URL: https://accounts.google.com/o/oauth2/v2/auth
      AUTH_GOOGLE_ACCESS_URL: https://oauth2.googleapis.com/token
      AUTH_GOOGLE_PROFILE_URL: https://www.googleapis.com/oauth2/v3/userinfo
      AUTH_GOOGLE_SCOPE: "email profile"
      AUTH_GOOGLE_DEFAULT_ROLE_ID: PUBLIC_ROLE_ID
    volumes:
      - directus_uploads:/directus/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - lirio_net

  postgres:
    image: postgres:16-alpine
    container_name: lirio_postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - lirio_net

  redis:
    image: redis:7-alpine
    container_name: lirio_redis
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - lirio_net

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: lirio_umami
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/umami_db
      DATABASE_TYPE: postgresql
      APP_SECRET: ${DIRECTUS_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - lirio_net

volumes:
  postgres_data:
  directus_uploads:
  redis_data:

networks:
  lirio_net:
    driver: bridge
```

- [ ] **Step 2: Crear docker-compose.dev.yml (override local)**

```yaml
version: '3.8'

services:
  nextjs:
    build:
      target: development
    environment:
      - NODE_ENV=development
    volumes:
      - ./nextjs/src:/app/src
      - ./nextjs/messages:/app/messages
    command: npm run dev

  nginx:
    ports:
      - "80:80"
    # Sin HTTPS en dev
```

- [ ] **Step 3: Crear nginx/nginx.conf**

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    include /etc/nginx/conf.d/*.conf;
}
```

- [ ] **Step 4: Crear nginx/conf.d/nextjs.conf**

```nginx
server {
    listen 80;
    server_name liriodelosvallescr.org www.liriodelosvallescr.org;

    location / {
        proxy_pass http://nextjs:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] **Step 5: Crear nginx/conf.d/directus.conf**

```nginx
server {
    listen 80;
    server_name admin.liriodelosvallescr.org api.liriodelosvallescr.org;

    location / {
        proxy_pass http://directus:8055;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
}
```

- [ ] **Step 6: Verificar que docker compose levanta correctamente**

```bash
cp .env.example .env
# Editar .env con valores de desarrollo
docker compose up -d postgres redis
docker compose ps
# Esperado: postgres y redis en estado "running"
```

- [ ] **Step 7: Levantar Directus y verificar panel admin**

```bash
docker compose up -d directus
# Esperar 30 segundos
curl -s http://localhost:8055/server/health | grep '"status":"ok"'
# Abrir http://localhost:8055 en navegador → debe mostrar login de Directus
```

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml nginx/
git commit -m "feat: docker compose completo con Nginx, Directus, PostgreSQL, Redis, Umami"
```

---

## Task 3: Next.js — Scaffold con i18n y dark mode

**Files:**
- Create: `nextjs/Dockerfile`
- Create: `nextjs/package.json`
- Create: `nextjs/next.config.ts`
- Create: `nextjs/tailwind.config.ts`
- Create: `nextjs/src/middleware.ts`
- Create: `nextjs/src/messages/es.json`
- Create: `nextjs/src/messages/en.json`

- [ ] **Step 1: Crear nextjs/Dockerfile**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci

FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Crear nextjs/package.json**

```json
{
  "name": "lirio-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "15.3.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@directus/sdk": "^17.0.0",
    "next-intl": "^3.26.0",
    "next-themes": "^0.4.4",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "typescript": "^5",
    "@playwright/test": "^1.48.0",
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

- [ ] **Step 3: Crear nextjs/next.config.ts**

```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.liriodelosvallescr.org' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Crear middleware de detección de idioma**

```typescript
// nextjs/src/middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localeDetection: true,
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 5: Crear traducciones base**

`nextjs/src/messages/es.json`:
```json
{
  "nav": {
    "home": "Inicio",
    "history": "Historia",
    "live": "En Vivo",
    "donate": "Donar",
    "contact": "Contacto"
  },
  "home": {
    "title": "Iglesia Cristiana Lirio de los Valles",
    "subtitle": "Una comunidad de fe en Costa Rica",
    "newHere": "¿Nuevo aquí?",
    "schedule": "Horarios de Servicios",
    "verse": "Versículo de la Semana"
  },
  "live": {
    "title": "En Vivo",
    "noStream": "No hay transmisión activa en este momento",
    "pastStreams": "Transmisiones Recientes"
  },
  "donate": {
    "title": "Donaciones",
    "description": "Tu generosidad sostiene nuestra misión"
  },
  "contact": {
    "title": "Contacto",
    "name": "Nombre",
    "email": "Correo",
    "message": "Mensaje",
    "send": "Enviar"
  },
  "theme": {
    "light": "Modo claro",
    "dark": "Modo oscuro"
  },
  "lang": {
    "es": "Español",
    "en": "English"
  }
}
```

`nextjs/src/messages/en.json`:
```json
{
  "nav": {
    "home": "Home",
    "history": "Our Story",
    "live": "Live",
    "donate": "Donate",
    "contact": "Contact"
  },
  "home": {
    "title": "Lirio de los Valles Christian Church",
    "subtitle": "A faith community in Costa Rica",
    "newHere": "New here?",
    "schedule": "Service Schedule",
    "verse": "Verse of the Week"
  },
  "live": {
    "title": "Live Stream",
    "noStream": "No active stream at this moment",
    "pastStreams": "Recent Streams"
  },
  "donate": {
    "title": "Donations",
    "description": "Your generosity sustains our mission"
  },
  "contact": {
    "title": "Contact",
    "name": "Name",
    "email": "Email",
    "message": "Message",
    "send": "Send"
  },
  "theme": {
    "light": "Light mode",
    "dark": "Dark mode"
  },
  "lang": {
    "es": "Español",
    "en": "English"
  }
}
```

- [ ] **Step 6: Instalar dependencias y verificar build**

```bash
cd nextjs
npm install
npm run build
# Esperado: Build completado sin errores TypeScript
```

- [ ] **Step 7: Levantar en Docker dev y verificar en navegador**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up nextjs
# Abrir http://localhost:3000
# Verificar: / redirige a /es/
# Verificar: Accept-Language: en → redirige a /en/
```

- [ ] **Step 8: Escribir test E2E para i18n**

```typescript
// nextjs/tests/e2e/i18n.spec.ts
import { test, expect } from '@playwright/test';

test('redirects to /es/ by default', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveURL(/\/es\//);
});

test('shows language toggle in header', async ({ page }) => {
  await page.goto('http://localhost:3000/es/');
  const toggle = page.getByRole('button', { name: /español|english/i });
  await expect(toggle).toBeVisible();
});

test('switching language changes URL locale', async ({ page }) => {
  await page.goto('http://localhost:3000/es/');
  await page.getByRole('button', { name: /english/i }).click();
  await expect(page).toHaveURL(/\/en\//);
});
```

- [ ] **Step 9: Ejecutar test E2E**

```bash
cd nextjs
npx playwright test tests/e2e/i18n.spec.ts
# Esperado: 3 tests passed
```

- [ ] **Step 10: Commit**

```bash
git add nextjs/
git commit -m "feat: Next.js scaffold con i18n ES/EN, dark mode, middleware detección idioma"
```

---

## Task 4: Cliente Directus + colecciones CMS

**Files:**
- Create: `nextjs/src/lib/directus.ts`
- Create: `nextjs/src/lib/types.ts`
- Create: `nextjs/tests/unit/directus.test.ts`

- [ ] **Step 1: Escribir test del cliente Directus**

```typescript
// nextjs/tests/unit/directus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getPageContent, getServiceSchedule } from '../../src/lib/directus';

vi.mock('@directus/sdk', () => ({
  createDirectus: vi.fn(() => ({
    request: vi.fn(),
  })),
  rest: vi.fn(),
  readItems: vi.fn(),
  readSingleton: vi.fn(),
}));

describe('directus client', () => {
  it('getServiceSchedule returns array of schedule items', async () => {
    const schedule = await getServiceSchedule();
    expect(Array.isArray(schedule)).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
cd nextjs
npx vitest run tests/unit/directus.test.ts
# Esperado: FAIL — getServiceSchedule is not defined
```

- [ ] **Step 3: Crear types.ts**

```typescript
// nextjs/src/lib/types.ts
export interface ServiceSchedule {
  id: number;
  day: string;
  time: string;
  name: string;
  name_en: string;
}

export interface WeeklyVerse {
  verse_text: string;
  verse_text_en: string;
  reference: string;
}

export interface ChurchInfo {
  name: string;
  description: string;
  description_en: string;
  history: string;
  history_en: string;
  vision: string;
  vision_en: string;
  mission: string;
  mission_en: string;
  phone: string;
  email: string;
  address: string;
  facebook_url: string;
  youtube_url: string;
  instagram_url: string;
  sinpe_number: string;
  bank_account: string;
  paypal_url: string;
}

export interface DonationInfo {
  sinpe_number: string;
  sinpe_name: string;
  bank_name: string;
  bank_account: string;
  bank_iban: string;
  paypal_url: string;
}
```

- [ ] **Step 4: Crear directus.ts**

```typescript
// nextjs/src/lib/directus.ts
import { createDirectus, rest, readItems, readSingleton } from '@directus/sdk';
import type { ServiceSchedule, WeeklyVerse, ChurchInfo } from './types';

const directus = createDirectus(
  process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://directus:8055'
).with(rest());

export async function getServiceSchedule(): Promise<ServiceSchedule[]> {
  try {
    return await directus.request(
      readItems('service_schedule', {
        sort: ['sort'],
        filter: { status: { _eq: 'published' } },
      })
    ) as ServiceSchedule[];
  } catch {
    return [];
  }
}

export async function getWeeklyVerse(): Promise<WeeklyVerse | null> {
  try {
    return await directus.request(
      readSingleton('weekly_verse')
    ) as WeeklyVerse;
  } catch {
    return null;
  }
}

export async function getChurchInfo(): Promise<ChurchInfo | null> {
  try {
    return await directus.request(
      readSingleton('church_info')
    ) as ChurchInfo;
  } catch {
    return null;
  }
}

export { directus };
```

- [ ] **Step 5: Ejecutar test — debe pasar**

```bash
npx vitest run tests/unit/directus.test.ts
# Esperado: PASS
```

- [ ] **Step 6: Configurar colecciones en Directus (manual vía panel)**

Abrir http://localhost:8055 → Settings → Data Model → Create Collection:

```
Colecciones a crear:
1. service_schedule (campos: day, time, name, name_en, sort, status)
2. weekly_verse (singleton: verse_text, verse_text_en, reference)
3. church_info (singleton: name, description, description_en, history, history_en,
                vision, vision_en, mission, mission_en, phone, email, address,
                facebook_url, youtube_url, instagram_url, sinpe_number,
                bank_account, bank_iban, paypal_url)
4. contact_messages (campos: name, email, message, date_created, status)
```

- [ ] **Step 7: Commit**

```bash
git add nextjs/src/lib/ nextjs/tests/unit/
git commit -m "feat: cliente Directus tipado con tipos para colecciones CMS"
```

---

## Task 5: Header, Footer y providers (Dark Mode + i18n)

> **Antes de este task:** Invocar skill `frontend-design` para diseñar el Header con logo, navegación, toggle de idioma y toggle de dark mode.

**Files:**
- Create: `nextjs/src/components/layout/Header.tsx`
- Create: `nextjs/src/components/layout/Footer.tsx`
- Create: `nextjs/src/components/ui/ThemeToggle.tsx`
- Create: `nextjs/src/components/ui/LanguageToggle.tsx`
- Create: `nextjs/src/app/[locale]/layout.tsx`
- Create: `nextjs/src/app/[locale]/providers.tsx`

- [ ] **Step 1: Crear providers.tsx**

```typescript
// nextjs/src/app/[locale]/providers.tsx
'use client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Crear ThemeToggle.tsx**

```typescript
// nextjs/src/components/ui/ThemeToggle.tsx
'use client';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('theme');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? t('light') : t('dark')}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

- [ ] **Step 3: Crear LanguageToggle.tsx**

```typescript
// nextjs/src/components/ui/LanguageToggle.tsx
'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('lang');

  const switchLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={switchLocale}
      aria-label={locale === 'es' ? t('en') : t('es')}
      className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {locale === 'es' ? 'EN' : 'ES'}
    </button>
  );
}
```

- [ ] **Step 4: Escribir test E2E para dark mode**

```typescript
// nextjs/tests/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test('dark mode toggle works', async ({ page }) => {
  await page.goto('http://localhost:3000/es/');
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: /modo oscuro|dark mode/i });
  await toggle.click();
  await expect(html).toHaveClass(/dark/);
});

test('navigation links are visible', async ({ page }) => {
  await page.goto('http://localhost:3000/es/');
  await expect(page.getByRole('link', { name: /inicio|home/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /historia/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /en vivo/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /donar/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /contacto/i })).toBeVisible();
});
```

- [ ] **Step 5: Ejecutar tests E2E**

```bash
npx playwright test tests/e2e/navigation.spec.ts
# Esperado: 2 tests passed
```

- [ ] **Step 6: Commit**

```bash
git add nextjs/src/components/ nextjs/src/app/
git commit -m "feat: Header/Footer con dark mode toggle y language toggle"
```

---

## Task 6: Página de Inicio

> **Antes de este task:** Invocar skill `frontend-design` para diseñar la página de inicio (hero, horarios, versículo, en vivo).

**Files:**
- Create: `nextjs/src/app/[locale]/page.tsx`
- Create: `nextjs/src/components/sections/HeroSection.tsx`
- Create: `nextjs/src/components/sections/ScheduleSection.tsx`
- Create: `nextjs/src/components/sections/VerseSection.tsx`
- Create: `nextjs/tests/e2e/homepage.spec.ts`

- [ ] **Step 1: Escribir test E2E de la página de inicio**

```typescript
// nextjs/tests/e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('homepage shows church name', async ({ page }) => {
  await page.goto('http://localhost:3000/es/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lirio de los Valles');
});

test('homepage shows service schedule section', async ({ page }) => {
  await page.goto('http://localhost:3000/es/');
  await expect(page.getByText(/horarios de servicios/i)).toBeVisible();
});

test('homepage in english shows translated content', async ({ page }) => {
  await page.goto('http://localhost:3000/en/');
  await expect(page.getByText(/service schedule/i)).toBeVisible();
});
```

- [ ] **Step 2: Crear página de inicio**

```typescript
// nextjs/src/app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';
import { getServiceSchedule, getWeeklyVerse } from '@/lib/directus';
import { HeroSection } from '@/components/sections/HeroSection';
import { ScheduleSection } from '@/components/sections/ScheduleSection';
import { VerseSection } from '@/components/sections/VerseSection';

export default async function HomePage() {
  const t = await getTranslations('home');
  const [schedule, verse] = await Promise.all([
    getServiceSchedule(),
    getWeeklyVerse(),
  ]);

  return (
    <main>
      <HeroSection
        title={t('title')}
        subtitle={t('subtitle')}
        newHereText={t('newHere')}
      />
      <ScheduleSection
        title={t('schedule')}
        items={schedule}
      />
      {verse && <VerseSection verse={verse} title={t('verse')} />}
    </main>
  );
}
```

- [ ] **Step 3: Ejecutar tests E2E**

```bash
npx playwright test tests/e2e/homepage.spec.ts
# Esperado: 3 tests passed
```

- [ ] **Step 4: Commit**

```bash
git add nextjs/src/app/[locale]/page.tsx nextjs/src/components/sections/
git commit -m "feat: página de inicio con hero, horarios y versículo"
```

---

## Task 7: YouTube sync + sección En Vivo

**Files:**
- Create: `nextjs/src/lib/youtube.ts`
- Create: `nextjs/src/app/[locale]/en-vivo/page.tsx`
- Create: `nextjs/src/components/sections/LiveStreamSection.tsx`
- Create: `nextjs/tests/unit/youtube.test.ts`

- [ ] **Step 1: Escribir test del cliente YouTube**

```typescript
// nextjs/tests/unit/youtube.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-fetch', () => ({ default: vi.fn() }));

import { getLiveStream, getRecentStreams } from '../../src/lib/youtube';

describe('youtube client', () => {
  it('getLiveStream returns null when no active stream', async () => {
    const fetch = (await import('node-fetch')).default as any;
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    const result = await getLiveStream();
    expect(result).toBeNull();
  });

  it('getRecentStreams returns array', async () => {
    const fetch = (await import('node-fetch')).default as any;
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: { videoId: 'abc123' }, snippet: { title: 'Test', thumbnails: { medium: { url: '' } } } }] }),
    });
    const result = await getRecentStreams(5);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].videoId).toBe('abc123');
  });
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
npx vitest run tests/unit/youtube.test.ts
# Esperado: FAIL
```

- [ ] **Step 3: Implementar youtube.ts**

```typescript
// nextjs/src/lib/youtube.ts
export interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt?: string;
}

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

export async function getLiveStream(): Promise<VideoItem | null> {
  if (!API_KEY || !CHANNEL_ID) return null;

  const url = `${YT_API_BASE}/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items?.length) return null;

    const item = data.items[0];
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url ?? '',
    };
  } catch {
    return null;
  }
}

export async function getRecentStreams(maxResults = 6): Promise<VideoItem[]> {
  if (!API_KEY || !CHANNEL_ID) return [];

  const url = `${YT_API_BASE}/search?part=snippet&channelId=${CHANNEL_ID}&type=video&order=date&maxResults=${maxResults}&key=${API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items ?? []).map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url ?? '',
      publishedAt: item.snippet.publishedAt,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
npx vitest run tests/unit/youtube.test.ts
# Esperado: 2 tests passed
```

- [ ] **Step 5: Commit**

```bash
git add nextjs/src/lib/youtube.ts nextjs/tests/unit/youtube.test.ts nextjs/src/app/[locale]/en-vivo/
git commit -m "feat: YouTube API client con detección de stream en vivo y transmisiones recientes"
```

---

## Task 8: Páginas Historia, Donaciones, Contacto

> **Antes de este task:** Invocar skill `frontend-design` para diseñar las 3 páginas restantes.

**Files:**
- Create: `nextjs/src/app/[locale]/historia/page.tsx`
- Create: `nextjs/src/app/[locale]/donaciones/page.tsx`
- Create: `nextjs/src/app/[locale]/contacto/page.tsx`

- [ ] **Step 1: Escribir tests E2E para las 3 páginas**

```typescript
// nextjs/tests/e2e/pages.spec.ts
import { test, expect } from '@playwright/test';

test('historia page loads', async ({ page }) => {
  await page.goto('http://localhost:3000/es/historia');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('donaciones page shows SINPE info', async ({ page }) => {
  await page.goto('http://localhost:3000/es/donaciones');
  await expect(page.getByText(/SINPE/i)).toBeVisible();
});

test('contacto page has form', async ({ page }) => {
  await page.goto('http://localhost:3000/es/contacto');
  await expect(page.getByRole('textbox', { name: /nombre/i })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /correo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /enviar/i })).toBeVisible();
});
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
npx playwright test tests/e2e/pages.spec.ts
# Esperado: FAIL (páginas no existen)
```

- [ ] **Step 3: Implementar las 3 páginas (ver código completo en spec)**

Crear cada página consumiendo datos de Directus vía `getChurchInfo()`. Formulario de contacto hace POST a `/api/contact` que guarda en colección `contact_messages` de Directus.

- [ ] **Step 4: Ejecutar tests — deben pasar**

```bash
npx playwright test tests/e2e/pages.spec.ts
# Esperado: 3 tests passed
```

- [ ] **Step 5: Commit**

```bash
git add nextjs/src/app/[locale]/historia/ nextjs/src/app/[locale]/donaciones/ nextjs/src/app/[locale]/contacto/
git commit -m "feat: páginas Historia, Donaciones y Contacto con datos desde Directus"
```

---

## Task 9: Script de provisioning Azure VM + alertas de costo

**Files:**
- Create: `scripts/setup-vm.sh`
- Create: `scripts/backup.sh`

- [ ] **Step 1: Crear setup-vm.sh**

```bash
#!/bin/bash
# setup-vm.sh — Provisioning Azure VM Ubuntu 22.04
# Ejecutar como root en la VM recién creada

set -e

echo "=== Actualizando sistema ==="
apt-get update && apt-get upgrade -y

echo "=== Instalando Docker ==="
curl -fsSL https://get.docker.com | sh
usermod -aG docker $SUDO_USER

echo "=== Instalando Docker Compose Plugin ==="
apt-get install -y docker-compose-plugin

echo "=== Instalando utilidades ==="
apt-get install -y git curl wget unzip htop

echo "=== Configurando firewall ==="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== Creando directorio del proyecto ==="
mkdir -p /opt/lirio
chown $SUDO_USER:$SUDO_USER /opt/lirio

echo "=== Setup completo. Reiniciar sesión para aplicar grupo docker ==="
```

- [ ] **Step 2: Crear backup.sh**

```bash
#!/bin/bash
# backup.sh — Backup PostgreSQL + uploads a Azure Blob Storage
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo "=== Backup PostgreSQL ==="
docker exec lirio_postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > "$BACKUP_DIR/postgres_${TIMESTAMP}.sql"

echo "=== Backup uploads de Directus ==="
docker run --rm \
  -v lirio_directus_uploads:/uploads \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/uploads_${TIMESTAMP}.tar.gz" /uploads

echo "=== Subir a Azure Blob ==="
# Requiere Azure CLI instalado y autenticado
az storage blob upload-batch \
  --destination backups \
  --source "$BACKUP_DIR" \
  --account-name liriostorageacct

echo "=== Limpiando temp ==="
rm -rf "$BACKUP_DIR"

echo "=== Backup completado: ${TIMESTAMP} ==="
```

- [ ] **Step 3: Configurar alertas de presupuesto en Azure Portal (manual)**

```
Azure Portal → Subscriptions → Cost Management → Budgets → Create

Nombre: lirio-monthly-budget
Período: Monthly
Monto: $150 USD
Alertas:
  - 80% = $120 → email a rafael1083@gmail.com
  - 100% = $150 → email a rafael1083@gmail.com
  - 120% = $180 → email a rafael1083@gmail.com (alerta crítica)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: scripts de provisioning VM y backup automatizado"
```

---

## Task 10: Deploy a Azure + verificación final MVP

- [ ] **Step 1: Crear VM en Azure Portal**

```
Portal Azure → Virtual Machines → Create:
- Imagen: Ubuntu Server 22.04 LTS
- Tamaño: B2ms (2 vCPU, 8 GB RAM)
- Región: East US (más cercana a Costa Rica con mejor precio)
- Auth: SSH key
- Discos: 64GB Premium SSD
- Red: permitir puertos 22, 80, 443
```

- [ ] **Step 2: Ejecutar setup-vm.sh en la VM**

```bash
scp scripts/setup-vm.sh usuario@IP_VM:/tmp/
ssh usuario@IP_VM "sudo bash /tmp/setup-vm.sh"
```

- [ ] **Step 3: Configurar DNS en Cloudflare**

```
Cloudflare → liriodelosvallescr.org → DNS:

Tipo  Nombre    Valor          Proxy
A     @         IP_VM_AZURE    ✅ (Proxied)
A     www       IP_VM_AZURE    ✅ (Proxied)
A     admin     IP_VM_AZURE    ✅ (Proxied)
A     api       IP_VM_AZURE    ✅ (Proxied)
A     stats     IP_VM_AZURE    ✅ (Proxied)

SSL/TLS → Full (strict)
```

- [ ] **Step 4: Clonar repo y levantar en producción**

```bash
ssh usuario@IP_VM
cd /opt/lirio
git clone https://github.com/TU_ORG/liriodelosvallescr.org .
cp .env.example .env
# Editar .env con valores reales de producción
docker compose up -d
docker compose ps
# Todos los servicios deben estar "running"
```

- [ ] **Step 5: Verificar MVP completo**

```bash
# Verificar HTTPS
curl -I https://liriodelosvallescr.org
# Esperado: HTTP/2 200

# Verificar Directus
curl -s https://admin.liriodelosvallescr.org/server/health
# Esperado: {"status":"ok"}

# Verificar panel admin
# Abrir https://admin.liriodelosvallescr.org → login con credenciales root
```

- [ ] **Step 6: Configurar cron para backups automáticos**

```bash
# En la VM
crontab -e
# Agregar:
0 2 * * * /opt/lirio/scripts/backup.sh >> /var/log/lirio-backup.log 2>&1
```

- [ ] **Step 7: Ejecutar suite completa de tests E2E contra producción**

```bash
cd nextjs
BASE_URL=https://liriodelosvallescr.org npx playwright test
# Esperado: todos los tests passed
```

- [ ] **Step 8: Commit final del Sub-Plan 1**

```bash
git add .
git commit -m "feat: MVP completo desplegado en Azure — Fase 1 completada"
git tag v0.1.0-mvp
```

---

## Verificación Final del MVP

Criterios de éxito (todos deben cumplirse antes de declarar Fase 1 completa):

- [ ] `https://liriodelosvallescr.org` carga en < 3s desde Costa Rica
- [ ] Admin puede subir una noticia desde Directus en < 2 minutos sin ayuda técnica
- [ ] Toggle de dark/light mode funciona y persiste
- [ ] Toggle de idioma ES↔EN funciona en todas las páginas
- [ ] Sección En Vivo detecta automáticamente transmisión YouTube activa
- [ ] Formulario de contacto guarda mensaje en Directus
- [ ] SSL activo (HTTPS verde)
- [ ] Costo Azure < $100/mes (revisar Cost Management)
- [ ] Backup automatizado funcionando (verificar Azure Blob Storage)
- [ ] Suite Playwright: 100% tests passed

---

## Sub-Planes Siguientes

- **Sub-Plan 2** (`2026-05-11-subplan-2-transparencia-biblioteca.md`): Portal Asociados + Biblioteca Digital + Ministerios + Page Builder por bloques
- **Sub-Plan 3** (`2026-05-11-subplan-3-automatizaciones-radio.md`): Radio AzuraCast + Facebook sync + PWA + Notificaciones push
