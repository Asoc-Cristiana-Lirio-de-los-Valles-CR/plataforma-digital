import net from 'node:net';

// Exclusión mutua atómica de la sincronización: Redis SET NX PX + scripts compara-y-actúa.
// Cliente RESP mínimo para no añadir dependencias; Redis ya corre en la red de Docker sin contraseña.
export const SYNC_LOCK_KEY = 'lirio:sync:youtube:lock';
export const SYNC_LOCK_TTL_MS = 15 * 60 * 1000;

const RENEW_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";
const RELEASE_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export interface RedisOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

export interface SyncLock {
  token: string;
  /** Confirma la propiedad y renueva el TTL de forma atómica; false si se perdió o Redis no responde. */
  ensure(): Promise<boolean>;
  release(): Promise<void>;
}

type RespValue = string | number | null | RespValue[];

function encodeCommand(args: string[]): string {
  return `*${args.length}\r\n${args.map(a => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join('')}`;
}

// Devuelve [valor, bytes consumidos] o null si la respuesta aún está incompleta.
function parseReply(buf: Buffer, start = 0): [RespValue, number] | null {
  const lineEnd = buf.indexOf('\r\n', start);
  if (lineEnd < 0) return null;
  const type = String.fromCharCode(buf[start]);
  const line = buf.toString('utf8', start + 1, lineEnd);
  const next = lineEnd + 2;
  switch (type) {
    case '+':
      return [line, next];
    case '-':
      throw new Error(`Redis error: ${line}`);
    case ':':
      return [Number(line), next];
    case '$': {
      const len = Number(line);
      if (len < 0) return [null, next];
      if (buf.length < next + len + 2) return null;
      return [buf.toString('utf8', next, next + len), next + len + 2];
    }
    case '*': {
      const count = Number(line);
      if (count < 0) return [null, next];
      const items: RespValue[] = [];
      let pos = next;
      for (let i = 0; i < count; i++) {
        const parsed = parseReply(buf, pos);
        if (!parsed) return null;
        items.push(parsed[0]);
        pos = parsed[1];
      }
      return [items, pos];
    }
    default:
      throw new Error(`Redis protocol error: unexpected reply type '${type}'`);
  }
}

function resolveOptions(opts: RedisOptions = {}): Required<RedisOptions> {
  return {
    host: opts.host ?? process.env.REDIS_HOST ?? 'redis',
    port: opts.port ?? Number(process.env.REDIS_PORT ?? 6379),
    timeoutMs: opts.timeoutMs ?? 2000,
  };
}

function redisCommand(args: string[], opts: Required<RedisOptions>): Promise<RespValue> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: opts.host, port: opts.port });
    let buf = Buffer.alloc(0);
    const fail = (err: Error) => {
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(opts.timeoutMs, () => fail(new Error('Redis timeout')));
    socket.on('error', fail);
    // Un cierre ordenado (FIN) sin respuesta no dispara 'error' ni el timeout; sin esto la promesa no termina.
    socket.on('close', () => reject(new Error('Redis connection closed before reply')));
    socket.on('connect', () => socket.write(encodeCommand(args)));
    socket.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      try {
        const parsed = parseReply(buf);
        if (!parsed) return;
        socket.end();
        resolve(parsed[0]);
      } catch (err) {
        fail(err as Error);
      }
    });
  });
}

export async function acquireSyncLock(options?: RedisOptions): Promise<SyncLock | null> {
  const opts = resolveOptions(options);
  const token = globalThis.crypto.randomUUID();
  const reply = await redisCommand(['SET', SYNC_LOCK_KEY, token, 'NX', 'PX', String(SYNC_LOCK_TTL_MS)], opts);
  if (reply !== 'OK') return null;

  return {
    token,
    async ensure() {
      try {
        return (await redisCommand(['EVAL', RENEW_SCRIPT, '1', SYNC_LOCK_KEY, token, String(SYNC_LOCK_TTL_MS)], opts)) === 1;
      } catch {
        return false;
      }
    },
    async release() {
      try {
        await redisCommand(['EVAL', RELEASE_SCRIPT, '1', SYNC_LOCK_KEY, token], opts);
      } catch {
        // Si Redis no responde, el TTL libera el lock; solo el dueño podría haberlo borrado.
      }
    },
  };
}
