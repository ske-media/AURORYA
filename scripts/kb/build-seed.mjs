// `pnpm kb:seed` — transforme les fiches de content/kb/<langue>/*.json en SQL d'import (SPEC §14.3).
// Chaque import crée ou remplace les fiches d'une version ; la version active se choisit dans remote_config.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const KB_VERSION = process.argv[2] ?? '1';
const quote = (text) => `'${String(text).replaceAll("'", "''")}'`;
const lines = [
  `-- Fichier généré par \`pnpm kb:seed\` à partir de content/kb. Ne pas modifier à la main.`,
  `-- Version ${KB_VERSION}. Toutes les fiches entrent en « draft_ai » : relecture par une astrologue attendue (O-14).`,
  'begin;',
];
let count = 0;
for (const locale of readdirSync('content/kb', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  for (const file of readdirSync(`content/kb/${locale}`).filter((f) => f.endsWith('.json')).sort()) {
    const entries = JSON.parse(readFileSync(`content/kb/${locale}/${file}`, 'utf8'));
    for (const key of Object.keys(entries).sort()) {
      lines.push(
        `insert into public.interpretation_kb (key, locale, kb_version, body, review_status) values (${quote(key)}, ${quote(locale)}, ${quote(KB_VERSION)}, ${quote(JSON.stringify(entries[key]))}::jsonb, 'draft_ai')` +
          ` on conflict (key, locale, kb_version) do update set body = excluded.body, updated_at = now() where public.interpretation_kb.review_status = 'draft_ai';`,
      );
      count += 1;
    }
  }
}
lines.push('commit;', '');
writeFileSync(`supabase/seed/kb.v${KB_VERSION}.sql`, lines.join('\n'));
console.log(`kb:seed : ${count} fiches écrites dans supabase/seed/kb.v${KB_VERSION}.sql`);
