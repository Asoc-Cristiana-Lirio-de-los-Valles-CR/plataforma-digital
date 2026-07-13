import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://15b8a016a8f6b1055ba21cddd91a3046@o4511424568426496.ingest.us.sentry.io/4511424634028032',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  enabled: process.env.NODE_ENV === 'production',
});
