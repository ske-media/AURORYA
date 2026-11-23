// Parité des textes (SPEC §15.6) : toute clé française doit exister en anglais, et inversement.
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = 'apps/mobile/src/i18n/locales';
const flatten = (value, prefix = '') =>
  Object.entries(value).flatMap(([key, v]) => (v !== null && typeof v === 'object' ? flatten(v, `${prefix}${key}.`) : [`${prefix}${key}`]));
const placeholders = (text) => (String(text).match(/\{\{[^}]+\}\}/g) ?? []).sort().join(',');
const get = (object, path) => path.split('.').reduce((o, k) => o?.[k], object);

const problems = [];
for (const file of readdirSync(`${ROOT}/fr`)) {
  const fr = JSON.parse(readFileSync(`${ROOT}/fr/${file}`, 'utf8'));
  let en;
  try {
    en = JSON.parse(readFileSync(`${ROOT}/en/${file}`, 'utf8'));
  } catch {
    problems.push(`${file} : fichier anglais absent`);
    continue;
  }
  const frKeys = new Set(flatten(fr));
  const enKeys = new Set(flatten(en));
  for (const key of frKeys) {
    if (!enKeys.has(key)) problems.push(`${file} : « ${key} » absente en anglais`);
    else if (placeholders(get(fr, key)) !== placeholders(get(en, key))) problems.push(`${file} : « ${key} » n'a pas les mêmes variables dans les deux langues`);
  }
  for (const key of enKeys) if (!frKeys.has(key)) problems.push(`${file} : « ${key} » absente en français`);
}
if (problems.length > 0) {
  console.error(`check-i18n : ${problems.length} problème(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('check-i18n : français et anglais à parité.');
