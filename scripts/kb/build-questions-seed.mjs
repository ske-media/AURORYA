// `pnpm questions:seed` — transforme content/questions/<langue>.json en SQL d'import (SPEC §14.9).
// Les questions entrent en « approved » pour être servies ; la relecture par l'équipe reste attendue.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const quote = (text) => `'${String(text).replaceAll("'", "''")}'`;
const lines = ['-- Fichier généré par `pnpm questions:seed` à partir de content/questions. Ne pas modifier à la main.', 'begin;'];
let count = 0;
if (existsSync('content/questions')) {
  for (const file of readdirSync('content/questions').filter((f) => f.endsWith('.json')).sort()) {
    const locale = file.replace('.json', '');
    const bySign = JSON.parse(readFileSync(`content/questions/${file}`, 'utf8'));
    lines.push(`delete from public.daily_questions where locale = ${quote(locale)};`);
    for (const sign of Object.keys(bySign).sort()) {
      bySign[sign].forEach((text, position) => {
        lines.push(`insert into public.daily_questions (locale, moon_sign, position, text, status) values (${quote(locale)}, ${quote(sign)}, ${position}, ${quote(text)}, 'approved');`);
        count += 1;
      });
    }
  }
}
lines.push('commit;', '');
writeFileSync('supabase/seed/questions.sql', lines.join('\n'));
console.log(`questions:seed : ${count} questions écrites dans supabase/seed/questions.sql`);
