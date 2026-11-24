// Mise en place d'une base : migrations, fiches, questions, lieux (docs/runbooks/premier-build.md).
// Sert quand la base n'est pas joignable depuis le poste de travail. Chaque étape est rejouable.
import { gunzipSync } from 'node:zlib';
import type { Sql } from './deps';

export type SetupFiles = Readonly<{
  /** Migrations triées par nom : [nom du fichier, contenu SQL]. */
  migrations: readonly (readonly [string, string])[];
  /** Fiches par langue puis par clé. */
  kb: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  kbVersion: string;
  /** Questions par langue puis par signe lunaire. */
  questions: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
  /** Fichier tabulé compressé des lieux, ou null s'il n'est pas embarqué. */
  geoGz: Buffer | null;
}>;

export const SETUP_STEPS = ['ping', 'migrations', 'kb', 'questions', 'geo', 'status'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

const GEO_BATCH = 4000;

export async function runSetupStep(sql: Sql, step: SetupStep, files: SetupFiles): Promise<Record<string, unknown>> {
  switch (step) {
    case 'ping': {
      const row = (await sql.query<{ version: string; now: Date }>('select version() as version, now() as now')).rows[0];
      return { ok: true, version: row?.version.split(' ').slice(0, 2).join(' ') };
    }
    case 'migrations': {
      // Journal propre au projet : une migration appliquée n'est jamais rejouée ni modifiée.
      await sql.query('create table if not exists public.app_migrations (name text primary key, applied_at timestamptz not null default now())');
      await sql.query('alter table public.app_migrations enable row level security');
      await sql.query('revoke all on public.app_migrations from anon, authenticated');
      const done = new Set((await sql.query<{ name: string }>('select name from public.app_migrations')).rows.map((r) => r.name));
      const applied: string[] = [];
      for (const [name, content] of files.migrations) {
        if (done.has(name)) continue;
        await sql.transaction(async (tx) => {
          await tx.query(content);
          await tx.query('insert into public.app_migrations (name) values ($1)', [name]);
        });
        applied.push(name);
      }
      return { applied, alreadyApplied: [...done].sort() };
    }
    case 'kb': {
      let count = 0;
      for (const [locale, entries] of Object.entries(files.kb)) {
        const keys = Object.keys(entries);
        // Une fiche déjà relue par un humain n'est jamais écrasée par un import.
        const result = await sql.query(
          `insert into public.interpretation_kb (key, locale, kb_version, body, review_status)
           select k, $1, $2, b::jsonb, 'draft_ai' from unnest($3::text[], $4::text[]) as t(k, b)
           on conflict (key, locale, kb_version) do update set body = excluded.body, updated_at = now()
             where public.interpretation_kb.review_status = 'draft_ai'`,
          [locale, files.kbVersion, keys, keys.map((k) => JSON.stringify(entries[k]))]);
        count += result.rowCount;
      }
      return { written: count };
    }
    case 'questions': {
      let count = 0;
      for (const [locale, bySign] of Object.entries(files.questions)) {
        await sql.transaction(async (tx) => {
          await tx.query('delete from public.daily_questions where locale = $1', [locale]);
          for (const [sign, questions] of Object.entries(bySign)) {
            const result = await tx.query(
              `insert into public.daily_questions (locale, moon_sign, position, text, status)
               select $1, $2, ord - 1, q, 'approved' from unnest($3::text[]) with ordinality as t(q, ord)`, [locale, sign, questions]);
            count += result.rowCount;
          }
        });
      }
      return { written: count };
    }
    case 'geo': {
      if (!files.geoGz) return { written: 0, reason: 'fichier des lieux absent du déploiement' };
      const lines = gunzipSync(files.geoGz).toString('utf8').split('\n').filter(Boolean);
      const nullable = (v: string | undefined): string | null => (v === undefined || v === '\\N' ? null : v);
      let count = 0;
      for (let start = 0; start < lines.length; start += GEO_BATCH) {
        const cols: (string | null)[][] = Array.from({ length: 12 }, () => []);
        for (const line of lines.slice(start, start + GEO_BATCH)) {
          const cells = line.split('\t');
          for (let i = 0; i < 12; i += 1) cols[i]?.push(nullable(cells[i]));
        }
        const result = await sql.query(
          `insert into public.geo_places (geoname_id, name, ascii_name, name_fr, name_en, admin1_name, country_code, latitude, longitude, population, tz_iana, search_text)
           select * from unnest($1::bigint[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::char(2)[], $8::float8[], $9::float8[], $10::int[], $11::text[], $12::text[])
           on conflict (geoname_id) do update set name = excluded.name, ascii_name = excluded.ascii_name, name_fr = excluded.name_fr, name_en = excluded.name_en,
             admin1_name = excluded.admin1_name, country_code = excluded.country_code, latitude = excluded.latitude, longitude = excluded.longitude,
             population = excluded.population, tz_iana = excluded.tz_iana, search_text = excluded.search_text`, cols);
        count += result.rowCount;
      }
      return { written: count };
    }
    case 'status': {
      const count = async (table: string): Promise<number> => Number((await sql.query<{ n: string }>(`select count(*) as n from public.${table}`)).rows[0]?.n ?? 0);
      const tables = (await sql.query<{ n: string; rls: string }>(
        `select count(*) as n, count(*) filter (where c.relrowsecurity) as rls from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r'`)).rows[0];
      return {
        tables: Number(tables?.n ?? 0), tablesWithRls: Number(tables?.rls ?? 0),
        kb: await count('interpretation_kb'), questions: await count('daily_questions'), places: await count('geo_places'), config: await count('remote_config'),
      };
    }
  }
}
