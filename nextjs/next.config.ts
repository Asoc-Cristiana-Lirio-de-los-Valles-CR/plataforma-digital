import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from 'next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // App shell y assets estáticos
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'static-assets' },
    },
    {
      urlPattern: /^\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-images' },
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts' },
    },
    // Thumbnails YouTube con límite y expiración
    {
      urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'yt-thumbs',
        expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
      },
    },
    {
      urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'yt-thumbs',
        expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
      },
    },
    // Páginas públicas — network first, fallback cache
    {
      urlPattern: /^\/(es|en)\/(biblioteca|historia|donaciones|contacto|en-vivo)(\/.*)?$/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'public-pages', networkTimeoutSeconds: 5 },
    },
    // Excluir /api/* explícitamente — nunca cachear
    {
      urlPattern: /^\/api\/.*/i,
      handler: 'NetworkOnly',
    },
    // Excluir portal privado explícitamente
    {
      urlPattern: /^\/(es|en)\/asociados.*/i,
      handler: 'NetworkOnly',
    },
    // Excluir embeds y API YouTube
    {
      urlPattern: /youtube\.com\/embed\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /googlevideo\.com\/.*/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /youtubei\.googleapis\.com\/.*/i,
      handler: 'NetworkOnly',
    },
  ],
});

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.liriodelosvallescr.org',
      },
      {
        protocol: 'https',
        hostname: 'api.liriodelosvallescr.org',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withPWA(withNextIntl(nextConfig) as any) as NextConfig;
