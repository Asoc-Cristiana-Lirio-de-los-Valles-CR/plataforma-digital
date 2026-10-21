// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'node:net';
import { acquireSyncLock, SYNC_LOCK_KEY } from '../../src/lib/sync-lock';

// Servidor RESP mínimo que emula SET NX PX, GET y los dos scripts EVAL del lock.
type Mode = 'redis' | 'error' | 'silent' | 'close';
const store = new Map<string, { value: string; expiresAt: number }>();
let mode: Mode = 'redis';
let server: net.Server;
let port: number;

function encode(value: string | number | null): string {
  if (value === null) return '$-1\r\n';
  if (typeof value === 'number') return `:${value}\r\n`;
  if (value === 'OK') return '+OK\r\n';
  return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
}

function parseCommand(buf: string): string[] | null {
  if (!buf.startsWith('*')) return null;
  let pos = buf.indexOf('\r\n');
  if (pos < 0) return null;
  const count = Number(buf.slice(1, pos));
  pos += 2;
  const args: string[] = [];
  for (let i = 0; i < count; i++) {
    const end = buf.indexOf('\r\n', pos);
    if (end < 0) return null;
    const len = Number(buf.slice(pos + 1, end));
    const start = end + 2;
    if (Buffer.byteLength(buf.slice(start)) < len + 2) return null;
    args.push(buf.slice(start, start + len));
    pos = start + len + 2;
  }
  return args;
}

function get(key: string): string | null {
  const entry = store.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

function execute(args: string[]): string {
  const [cmd, ...rest] = args;
  switch (cmd.toUpperCase()) {
    case 'SET': {
      const [key, value, ...flags] = rest;
      const upper = flags.map(f => f.toUpperCase());
      if (upper.includes('NX') && get(key) !== null) return encode(null);
      const px = Number(flags[upper.indexOf('PX') + 1]);
      store.set(key, { value, expiresAt: Date.now() + px });
      return encode('OK');
    }
    case 'GET':
      return encode(get(rest[0]));
    case 'EVAL': {
      const [script, , key, token, ttl] = rest;
      if (get(key) !== token) return encode(0);
      if (script.includes('pexpire')) {
        store.set(key, { value: token, expiresAt: Date.now() + Number(ttl) });
        return encode(1);
      }
      store.delete(key);
      return encode(1);
    }
    default:
      return `-ERR unknown command '${cmd}'\r\n`;
  }
}

beforeAll(async () => {
  server = net.createServer(socket => {
    let buf = '';
    socket.on('data', chunk => {
      buf += chunk.toString();
      const args = parseCommand(buf);
      if (!args) return;
      buf = '';
      if (mode === 'silent') return;
      if (mode === 'close') {
        socket.end();
        return;
      }
      socket.write(mode === 'error' ? '-ERR injected\r\n' : execute(args));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as net.AddressInfo).port;
});

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

const opts = () => ({ host: '127.0.0.1', port, timeoutMs: 300 });

describe('acquireSyncLock (Redis SET NX PX)', () => {
  it('concede el lock una sola vez mientras está tomado', async () => {
    store.clear();
    mode = 'redis';
    const first = await acquireSyncLock(opts());
    const second = await acquireSyncLock(opts());
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(get(SYNC_LOCK_KEY)).toBe(first!.token);
  });

  it('solo el dueño puede liberar el lock', async () => {
    store.clear();
    mode = 'redis';
    const lock = await acquireSyncLock(opts());
    store.set(SYNC_LOCK_KEY, { value: 'otro-dueño', expiresAt: Date.now() + 60_000 });
    await lock!.release();
    expect(get(SYNC_LOCK_KEY)).toBe('otro-dueño');

    store.clear();
    const own = await acquireSyncLock(opts());
    await own!.release();
    expect(get(SYNC_LOCK_KEY)).toBeNull();
  });

  it('ensure renueva el TTL mientras el lock es propio y falla cuando se perdió', async () => {
    store.clear();
    mode = 'redis';
    const lock = await acquireSyncLock(opts());
    store.get(SYNC_LOCK_KEY)!.expiresAt = Date.now() + 5;
    expect(await lock!.ensure()).toBe(true);
    expect(store.get(SYNC_LOCK_KEY)!.expiresAt).toBeGreaterThan(Date.now() + 60_000);

    store.delete(SYNC_LOCK_KEY);
    expect(await lock!.ensure()).toBe(false);
  });

  it('ensure devuelve false (falla cerrado) si Redis deja de responder', async () => {
    store.clear();
    mode = 'redis';
    const lock = await acquireSyncLock(opts());
    mode = 'silent';
    expect(await lock!.ensure()).toBe(false);
    mode = 'error';
    expect(await lock!.ensure()).toBe(false);
  });

  it('lanza error si Redis responde con error al adquirir', async () => {
    store.clear();
    mode = 'error';
    await expect(acquireSyncLock(opts())).rejects.toThrow(/injected/);
  });

  it('lanza error por timeout si Redis no responde', async () => {
    mode = 'silent';
    await expect(acquireSyncLock(opts())).rejects.toThrow(/timeout/i);
  });

  it('lanza error si Redis cierra la conexión sin responder (no se queda colgado)', async () => {
    mode = 'close';
    await expect(acquireSyncLock(opts())).rejects.toThrow(/closed/i);
  });

  it('lanza error si no puede conectar con Redis', async () => {
    await expect(acquireSyncLock({ host: '127.0.0.1', port: 1, timeoutMs: 300 })).rejects.toThrow();
  });
});
