// `pnpm geo:build` — prépare la base des lieux de naissance (SPEC §12.4, A-007) à partir de GeoNames
// (villes de plus de 1 000 habitants, licence CC BY 4.0 : attribution sur la page des licences).
// Produit un fichier tabulé prêt pour `\copy`, puis `pnpm geo:load` le charge dans la base désignée
// par DATABASE_URL. Aucun service de géocodage n'est appelé à l'exécution de l'app.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CACHE = '.cache/geo';
const BASE = 'https://download.geonames.org/export/dump';
const OUT = `${CACHE}/geo_places.tsv`;
mkdirSync(CACHE, { recursive: true });
for (const file of ['cities1000.zip', 'admin1CodesASCII.txt']) {
  if (!existsSync(`${CACHE}/${file}`)) execFileSync('curl', ['-sS', '--fail', '-m', '300', '-o', `${CACHE}/${file}`, `${BASE}/${file}`], { stdio: 'inherit' });
}
if (!existsSync(`${CACHE}/cities1000.txt`)) execFileSync('unzip', ['-o', '-q', `${CACHE}/cities1000.zip`, '-d', CACHE]);
// Noms français et anglais : extraits une fois du fichier complet des noms alternatifs (environ 200 Mo),
// en écartant les noms familiers et historiques. Le fichier complet n'est pas conservé.
if (!existsSync(`${CACHE}/alt-fr-en.tsv`)) {
  execFileSync('curl', ['-sS', '--fail', '-m', '1200', '-o', `${CACHE}/alternateNamesV2.zip`, `${BASE}/alternateNamesV2.zip`], { stdio: 'inherit' });
  execFileSync('bash', ['-c', `unzip -p ${CACHE}/alternateNamesV2.zip alternateNamesV2.txt | awk -F'\t' '($3=="fr"||$3=="en") && $7!="1" && $8!="1"' > ${CACHE}/alt-fr-en.tsv && rm ${CACHE}/alternateNamesV2.zip`]);
}

/** Même normalisation que la fonction SQL `normalize_place_search` : minuscules, sans accents, a-z et chiffres. */
export const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();

const admin1 = new Map(readFileSync(`${CACHE}/admin1CodesASCII.txt`, 'utf8').split('\n').filter(Boolean).map((line) => {
  const [code, name] = line.split('\t');
  return [code, name];
}));
const clean = (text) => text.replace(/[\t\n\r\\]/g, ' ');

// Par lieu et par langue : le nom préféré s'il existe, sinon le premier ; tous servent à la recherche.
const names = new Map();
for (const line of readFileSync(`${CACHE}/alt-fr-en.tsv`, 'utf8').split('\n')) {
  const [, id, lang, name, preferred] = line.split('\t');
  if (!id || !name || (lang !== 'fr' && lang !== 'en')) continue;
  const entry = names.get(id) ?? { fr: null, en: null, frPreferred: false, enPreferred: false, all: [] };
  if (entry[lang] === null || (preferred === '1' && !entry[`${lang}Preferred`])) {
    entry[lang] = name;
    entry[`${lang}Preferred`] = preferred === '1';
  }
  if (entry.all.length < 8) entry.all.push(name);
  names.set(id, entry);
}

const rows = [];
for (const line of readFileSync(`${CACHE}/cities1000.txt`, 'utf8').split('\n')) {
  if (!line) continue;
  const c = line.split('\t');
  const [id, name, ascii, , lat, lon] = c;
  const country = c[8];
  const tz = c[17];
  // PPLX : quartier ou arrondissement d'une ville déjà présente (« Lyon 03 »).
  if (!id || !name || !country || !tz || c[7] === 'PPLX') continue;
  const alt = names.get(id);
  // Le nom affiché d'abord : la recherche par préfixe s'appuie sur le début du texte.
  const words = new Set([alt?.fr, name, ascii, alt?.en, ...(alt?.all ?? [])].filter(Boolean).map(normalize));
  words.delete('');
  rows.push([
    id, clean(name), clean(ascii || name), alt?.fr ? clean(alt.fr) : '\\N', alt?.en ? clean(alt.en) : '\\N',
    clean(admin1.get(`${country}.${c[10]}`) ?? '') || '\\N', country, lat, lon, String(Number(c[14]) || 0), tz, [...words].join(' | '),
  ].join('\t'));
}
writeFileSync(OUT, `${rows.join('\n')}\n`);
console.log(`geo:build : ${rows.length} lieux écrits dans ${OUT}`);
