// Programador interno de la sincronización con YouTube.
// Llama cada N minutos a la ruta ya existente POST /api/sync/youtube desde el propio contenedor,
// de modo que se reutilizan su lock en Redis, el cooldown, activity_logs y el revalidatePath.
// Nunca registra el secreto: solo contadores y mensajes de estado.

export const MIN_SYNC_INTERVAL_MINUTES = 10; // el cooldown de la ruta es de 10 min
const INITIAL_DELAY_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const TAG = '[sync-scheduler]';

export interface ParsedInterval {
  intervalMs: number | null;
  warning?: string;
}

export function parseSyncInterval(raw: string | undefined): ParsedInterval {
  const text = (raw ?? '').trim();
  const minutes = Number(text);
  if (!text || !Number.isFinite(minutes) || minutes <= 0) return { intervalMs: null };
  if (minutes < MIN_SYNC_INTERVAL_MINUTES) {
    return {
      intervalMs: null,
      warning: `YOUTUBE_SYNC_INTERVAL_MINUTES=${minutes} es menor que el mínimo de ${MIN_SYNC_INTERVAL_MINUTES} min (cooldown de la ruta): programador apagado`,
    };
  }
  return { intervalMs: minutes * 60 * 1000 };
}

export interface SyncScheduler {
  stop(): void;
}

interface SchedulerOptions {
  intervalMs: number;
  initialDelayMs: number;
  trigger: () => Promise<void>;
}

// Cadena de setTimeout: la siguiente corrida se programa al terminar la anterior (sin solapes).
export function startSyncScheduler({ intervalMs, initialDelayMs, trigger }: SchedulerOptions): SyncScheduler {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (delay: number) => {
    if (stopped) return;
    timer = setTimeout(async () => {
      try {
        await trigger();
      } catch (err) {
        console.error(`${TAG} corrida fallida:`, err instanceof Error ? err.message : 'error desconocido');
      }
      schedule(intervalMs);
    }, delay);
    timer.unref?.();
  };

  schedule(initialDelayMs);
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

interface SyncSummary {
  inserted?: number;
  updated?: number;
  unavailable?: number;
  titleChanges?: unknown[];
}

export async function triggerSyncViaRoute(fetchImpl: typeof fetch = fetch): Promise<void> {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    console.error(`${TAG} SYNC_SECRET no está definido: no se puede sincronizar`);
    return;
  }
  const port = process.env.PORT ?? '3000';
  try {
    const res = await fetchImpl(`http://127.0.0.1:${port}/api/sync/youtube`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 409 || res.status === 429) {
      console.log(`${TAG} corrida omitida (HTTP ${res.status}): ya hay una sync reciente o en curso`);
      return;
    }
    if (res.status !== 200) {
      console.error(`${TAG} la sync respondió HTTP ${res.status}`);
      return;
    }
    const body = (await res.json().catch(() => ({}))) as SyncSummary;
    console.log(
      `${TAG} ok insertados=${body.inserted ?? 0} actualizados=${body.updated ?? 0} ` +
      `no_disponibles=${body.unavailable ?? 0} cambios_de_titulo=${body.titleChanges?.length ?? 0}`,
    );
  } catch (err) {
    console.error(`${TAG} error de red o timeout:`, err instanceof Error ? err.name : 'error desconocido');
  }
}

export function startSyncSchedulerFromEnv(): SyncScheduler | null {
  const { intervalMs, warning } = parseSyncInterval(process.env.YOUTUBE_SYNC_INTERVAL_MINUTES);
  if (warning) console.warn(`${TAG} ${warning}`);
  if (intervalMs === null) return null;
  console.log(`${TAG} activo: sync con YouTube cada ${intervalMs / 60000} min`);
  return startSyncScheduler({ intervalMs, initialDelayMs: INITIAL_DELAY_MS, trigger: () => triggerSyncViaRoute() });
}
