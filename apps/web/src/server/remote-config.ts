// Configuration distante (SPEC §13.8) : lue en base avec un cache en mémoire de 60 secondes.
import type { z } from 'zod';
import type { Sql } from './deps';

const TTL_MS = 60_000;
type Cache = { loadedAt: number; values: Map<string, { value: unknown; isPublic: boolean }> };
const caches = new WeakMap<Sql, Cache>();

async function load(sql: Sql, now: number): Promise<Cache> {
  const cached = caches.get(sql);
  if (cached && now - cached.loadedAt < TTL_MS) return cached;
  const { rows } = await sql.query<{ key: string; value: unknown; is_public: boolean }>('select key, value, is_public from public.remote_config');
  const fresh: Cache = { loadedAt: now, values: new Map(rows.map((r) => [r.key, { value: r.value, isPublic: r.is_public }])) };
  caches.set(sql, fresh);
  return fresh;
}

/** Valeur d'une clé, validée par schéma ; `fallback` si la clé manque ou si sa valeur est invalide. */
export async function configValue<T>(sql: Sql, now: Date, key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const entry = (await load(sql, now.getTime())).values.get(key);
  const parsed = entry ? schema.safeParse(entry.value) : null;
  return parsed?.success ? parsed.data : fallback;
}

export async function publicConfig(sql: Sql, now: Date): Promise<Record<string, unknown>> {
  const cache = await load(sql, now.getTime());
  return Object.fromEntries([...cache.values].filter(([, v]) => v.isPublic).map(([k, v]) => [k, v.value]));
}

/** Pour les tests et après une écriture de configuration. */
export const invalidateConfigCache = (sql: Sql): void => void caches.delete(sql);
