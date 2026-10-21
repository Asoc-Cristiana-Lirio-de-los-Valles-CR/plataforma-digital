'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d0a19', color: 'white', fontFamily: 'sans-serif', gap: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Algo salió mal</h2>
          <button onClick={reset} style={{ padding: '8px 20px', borderRadius: '8px', background: '#461a7a', color: 'white', border: 'none', cursor: 'pointer' }}>
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
