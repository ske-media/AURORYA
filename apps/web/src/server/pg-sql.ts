// Adaptateur de `Sql` sur node-postgres. Connexion directe à Postgres avec un rôle de service (ADR-016).
import pg from 'pg';
import type { Sql, SqlRow } from './deps';

type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }> };

const wrap = (client: Queryable, pool: pg.Pool | null): Sql => ({
  async query<T extends SqlRow>(text: string, params: readonly unknown[] = []) {
    const result = await client.query(text, [...params]);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  },
  async transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T> {
    if (!pool) return work(wrap(client, null)); // déjà dans une transaction
    const connection = await pool.connect();
    try {
      await connection.query('begin');
      const result = await work(wrap(connection, null));
      await connection.query('commit');
      return result;
    } catch (error) {
      await connection.query('rollback');
      throw error;
    } finally {
      connection.release();
    }
  },
});

/**
 * Options de connexion à partir d'une chaîne. La connexion est chiffrée dès que la base n'est pas locale ;
 * le certificat est vérifié contre l'autorité fournie par DATABASE_CA_CERT quand elle est définie.
 */
export function poolConfigFromUrl(connectionString: string, caCert?: string): pg.PoolConfig {
  const local = /@(localhost|127\.0\.0\.1)[:/]|host=\//.test(connectionString);
  if (local) return { connectionString };
  return { connectionString, ssl: caCert ? { ca: caCert, rejectUnauthorized: true } : { rejectUnauthorized: true } };
}

export function createPgSql(config: pg.PoolConfig): { sql: Sql; close: () => Promise<void> } {
  const pool = new pg.Pool({ max: 5, ...config });
  return { sql: wrap(pool, pool), close: () => pool.end() };
}
