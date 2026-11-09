// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const startSyncSchedulerFromEnv = vi.fn();
vi.mock('../../src/lib/sync-scheduler', () => ({ startSyncSchedulerFromEnv }));
vi.mock('@sentry/nextjs', () => ({ captureRequestError: vi.fn() }));
vi.mock('../../sentry.server.config', () => ({}));
vi.mock('../../sentry.edge.config', () => ({}));

async function loadRegister() {
  vi.resetModules();
  return (await import('../../src/instrumentation')).register;
}

describe('instrumentation.register', () => {
  const original = process.env.NEXT_RUNTIME;
  beforeEach(() => startSyncSchedulerFromEnv.mockReset());
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = original;
  });

  it('arranca el programador de sync en el runtime nodejs', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    await (await loadRegister())();
    expect(startSyncSchedulerFromEnv).toHaveBeenCalledTimes(1);
  });

  it('no arranca el programador en el runtime edge', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    await (await loadRegister())();
    expect(startSyncSchedulerFromEnv).not.toHaveBeenCalled();
  });
});
