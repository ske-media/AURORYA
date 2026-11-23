// Garde-fous de la Definition of Done (SPEC §1.6) dans le code de l'app : pas de couleur en dur,
// pas de chemin littéral vers un fichier visuel, pas de taille de police hors des tokens.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'apps/mobile/src';
const RULES = [
  ['couleur en dur', /#[0-9a-fA-F]{3,8}\b|rgba?\(/],
  ['chemin littéral vers un fichier visuel (utiliser getAsset)', /require\(\s*['"][^'"]*\.(png|jpe?g|webp|svg|wav|ttf)['"]\s*\)/],
  ['taille de police hors tokens (utiliser le composant Text)', /fontSize\s*:\s*\d/],
  ['police nommée en dur (utiliser fontFamilies)', /fontFamily\s*:\s*['"]/],
];
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

const problems = [];
for (const file of walk(ROOT)) {
  if (!/\.(ts|tsx)$/.test(file) || file.includes('.generated.') || file.includes('__fixtures__')) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    for (const [label, pattern] of RULES) if (pattern.test(line)) problems.push(`${file}:${index + 1} — ${label}`);
  });
}
if (problems.length > 0) {
  console.error(`check-ui-literals : ${problems.length} problème(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('check-ui-literals : aucune couleur, police ni chemin en dur dans l’app.');
