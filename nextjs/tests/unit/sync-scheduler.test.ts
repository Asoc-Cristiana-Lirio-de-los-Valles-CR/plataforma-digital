// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseSyncInterval,
  startSyncScheduler,
  triggerSyncViaRoute,
  startSyncSchedulerFromEnv,
  MIN_SYNC_INTERVAL_MINUTES,
} from '../../src/lib/sync-scheduler';

const MIN = 60 * 1000;

describe('parseSyncInterval', () => {
  it.each([undefined, '', '   ', '0', 'abc', '-5', 'NaN'])('apaga el programador con %j', value => {
    expect(parseSyncInterval(value).intervalMs).toBeNull();
  });

  it('apaga y avisa si el intervalo es menor que el cooldown de la ruta (10 min)', () => {
    const parsed = parseSyncInterval('5');
    expect(parsed.intervalMs).toBeNull();
    expect(parsed.warning).toContain(String(MIN_SYNC_INTERVAL_MINUTES));
  });

  it('convierte minutos a milisegundos', () => {
    expect(parseSyncInterval('30')).toEqual({ intervalMs: 30 * MIN });
    expect(parseSyncInterval(' 10 ')).toEqual({ intervalMs: 10 * MIN });
  });
});

describe('startSyncScheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no dispara nada antes del retraso inicial y dispara justo después', async () => {
    const trigger = vi.fn(async () => {});
    const s = startSyncScheduler({ intervalMs: 30 * MIN, initialDelayMs: 2 * MIN, trigger });
    await vi.advanceTimersByTimeAsync(2 * MIN - 1);
    expect(trigger).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(trigger).toHaveBeenCalledTimes(1);
    s.stop();
  });

  it('repite cada intervalo una vez terminada la corrida anterior', async () => {
    const trigger = vi.fn(async () => {});
    const s = startSyncScheduler({ intervalMs: 30 * MIN, initialDelayMs: 0, trigger });
    await vi.advanceTimersByTimeAsync(0);
    expect(trigger).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30 * MIN);
    expect(trigger).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(30 * MIN);
    expect(trigger).toHaveBeenCalledTimes(3);
    s.stop();
  });

  it('no solapa corridas: la siguiente se programa cuando la anterior terminó', async () => {
    let running = 0;
    let maxRunning = 0;
    const trigger = vi.fn(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise(r => setTimeout(r, 40 * MIN)); // más larga que el intervalo
      running--;
    });
    const s = startSyncScheduler({ intervalMs: 30 * MIN, initialDelayMs: 0, trigger });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(40 * MIN); // termina la 1ª
    expect(trigger).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30 * MIN); // 30 min después de terminar, arranca la 2ª
    expect(trigger).toHaveBeenCalledTimes(2);
    expect(maxRunning).toBe(1);
    s.stop();
  });

  it('un error no detiene el ciclo', async () => {
    const trigger = vi.fn(async () => { throw new Error('boom'); });
    const s = startSyncScheduler({ intervalMs: 10 * MIN, initialDelayMs: 0, trigger });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10 * MIN);
    expect(trigger).toHaveBeenCalledTimes(2);
    s.stop();
  });

  it('stop() cancela las corridas futuras', async () => {
    const trigger = vi.fn(async () => {});
    const s = startSyncScheduler({ intervalMs: 10 * MIN, initialDelayMs: 0, trigger });
    await vi.advanceTimersByTimeAsync(0);
    s.stop();
    await vi.advanceTimersByTimeAsync(60 * MIN);
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('stop() antes de la primera corrida la cancela', async () => {
    const trigger = vi.fn(async () => {});
    const s = startSyncScheduler({ intervalMs: 10 * MIN, initialDelayMs: 2 * MIN, trigger });
    s.stop();
    await vi.advanceTimersByTimeAsync(60 * MIN);
    expect(trigger).not.toHaveBeenCalled();
  });

  it('los timers no mantienen vivo el proceso (unref)', () => {
    const unref = vi.fn();
    const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation((() => ({ unref })) as unknown as typeof setTimeout);
    const s = startSyncScheduler({ intervalMs: 10 * MIN, initialDelayMs: 1000, trigger: async () => {} });
    expect(unref).toHaveBeenCalled();
    s.stop();
    spy.mockRestore();
  });
});

describe('triggerSyncViaRoute', () => {
  const SECRET = 'super-secreto-123';
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.SYNC_SECRET = SECRET;
    delete process.env.PORT;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  function json(status: number, body: unknown) {
    return vi.fn(async () => new Response(JSON.stringify(body), { status }));
  }
  const allOutput = () => JSON.stringify([...logSpy.mock.calls, ...errSpy.mock.calls, ...warnSpy.mock.calls]);

  it('hace POST autenticado a la ruta local, sin caché y con timeout', async () => {
    const fetchMock = json(200, { ok: true, inserted: 0, updated: 0, unavailable: 0, titleChanges: [] });
    await triggerSyncViaRoute(fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:3000/api/sync/youtube');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('usa el puerto de PORT', async () => {
    process.env.PORT = '4321';
    const fetchMock = json(200, { ok: true });
    await triggerSyncViaRoute(fetchMock as unknown as typeof fetch);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('http://127.0.0.1:4321/api/sync/youtube');
  });

  it('200: registra un resumen con contadores y cambios de título', async () => {
    const fetchMock = json(200, {
      ok: true, inserted: 1, updated: 2, unavailable: 3,
      titleChanges: [{ youtube_id: 'a' }, { youtube_id: 'b' }],
    });
    await triggerSyncViaRoute(fetchMock as unknown as typeof fetch);
    const line = String(logSpy.mock.calls[0]?.[0]);
    expect(line).toContain('[sync-scheduler]');
    expect(line).toMatch(/insertados=1/);
    expect(line).toMatch(/actualizados=2/);
    expect(line).toMatch(/no_disponibles=3/);
    expect(line).toMatch(/cambios_de_titulo=2/);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it.each([409, 429])('%i: se omite sin tratarlo como error', async status => {
    await triggerSyncViaRoute(json(status, { error: 'x' }) as unknown as typeof fetch);
    expect(errSpy).not.toHaveBeenCalled();
    expect(String(logSpy.mock.calls[0]?.[0])).toContain('omitida');
  });

  it.each([207, 500, 401, 503])('%i: se registra con console.error', async status => {
    await triggerSyncViaRoute(json(status, { ok: false, errors: ['x'] }) as unknown as typeof fetch);
    expect(errSpy).toHaveBeenCalled();
  });

  it('un fallo de red se registra y no lanza', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    await expect(triggerSyncViaRoute(fetchMock as unknown as typeof fetch)).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
  });

  it('sin SYNC_SECRET no llama a la ruta y avisa', async () => {
    delete process.env.SYNC_SECRET;
    const fetchMock = json(200, {});
    await triggerSyncViaRoute(fetchMock as unknown as typeof fetch);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it('nunca escribe el secreto en los logs (ni en errores)', async () => {
    await triggerSyncViaRoute(json(200, { ok: true }) as unknown as typeof fetch);
    await triggerSyncViaRoute(json(500, { detail: `Bearer ${SECRET}` }) as unknown as typeof fetch);
    await triggerSyncViaRoute((async () => { throw new Error(`fallo con ${SECRET}`); }) as unknown as typeof fetch);
    expect(allOutput()).not.toContain(SECRET);
  });
});

describe('startSyncSchedulerFromEnv', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.SYNC_SECRET = 's';
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.YOUTUBE_SYNC_INTERVAL_MINUTES;
  });

  it('devuelve null y no programa nada si la variable falta o es 0', () => {
    delete process.env.YOUTUBE_SYNC_INTERVAL_MINUTES;
    expect(startSyncSchedulerFromEnv()).toBeNull();
    process.env.YOUTUBE_SYNC_INTERVAL_MINUTES = '0';
    expect(startSyncSchedulerFromEnv()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('avisa y devuelve null con un intervalo menor al mínimo', () => {
    process.env.YOUTUBE_SYNC_INTERVAL_MINUTES = '3';
    expect(startSyncSchedulerFromEnv()).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('arranca con un intervalo válido y se puede detener', () => {
    process.env.YOUTUBE_SYNC_INTERVAL_MINUTES = '30';
    const s = startSyncSchedulerFromEnv();
    expect(s).not.toBeNull();
    expect(vi.getTimerCount()).toBe(1);
    s!.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
