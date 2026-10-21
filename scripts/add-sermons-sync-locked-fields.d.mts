// Tipos para importar la migración desde las pruebas TypeScript de nextjs/.
export declare const FIELD: 'sync_locked_fields';
export declare const LOCKABLE_FIELDS: readonly string[];
export declare const FIELD_DEFINITION: {
  field: string;
  type: string;
  meta: { interface: string; special: string[]; options: { choices: { text: string; value: string }[] }; [key: string]: unknown };
  schema: { is_nullable: boolean; default_value: null };
};

export interface LockResult {
  youtube_id: string;
  before: string[] | null;
  after: string[] | null;
  changed: boolean;
}

export declare function createMigration(options: {
  directusUrl: string;
  token: string;
  fetch?: typeof globalThis.fetch;
}): {
  target(): Promise<{ origin: string; project: string | null }>;
  check(): Promise<{ exists: boolean; type?: string }>;
  apply(): Promise<{ created: boolean }>;
  revert(): Promise<{ removed: boolean; lostLocks: { youtube_id: string; sync_locked_fields: unknown }[] }>;
  lock(youtubeId: string, field: string): Promise<LockResult>;
  unlock(youtubeId: string, field: string): Promise<LockResult>;
};
