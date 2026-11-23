// `pnpm assets:report` — écrit docs/ASSETS.md à partir du registre (SPEC §17.3, §17.6).
import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { type Asset, loadManifest } from './manifest.ts';

const manifest = loadManifest();
const dims = (a: Asset): string => {
  if (a.width !== null && a.height !== null) return `${a.width} × ${a.height}`;
  return a.maxDurationMs !== null ? `≤ ${a.maxDurationMs / 1000} s` : '—';
};
const weight = (bytes: number): string => (bytes >= 1_000_000 ? `${bytes / 1_000_000} Mo` : `${bytes / 1000} Ko`);
const cell = (text: string): string => text.replaceAll('|', '\\|');

const todo = manifest.assets.filter((a) => a.status === 'placeholder');
const done = manifest.assets.filter((a) => a.status === 'final');
const blocking = todo.filter((a) => a.requiredForRelease);

const lines: string[] = [
  '# Fichiers visuels et sonores',
  '',
  'Rapport généré par `pnpm assets:report` à partir de `assets.manifest.json`. Ne pas modifier à la main.',
  '',
  `- ${manifest.assets.length} fichiers au registre : ${done.length} définitifs, ${todo.length} provisoires.`,
  `- ${blocking.length} fichiers provisoires bloquent une mise en production.`,
  '',
  '## Livrer un fichier',
  '',
  '1. Trouver sa ligne ci-dessous : nom exact, dossier, format, dimensions, contraintes.',
  '2. Exporter le fichier avec exactement ce nom, ce format et ces dimensions.',
  '3. Le déposer dans le dossier indiqué, en remplaçant le fichier provisoire.',
  '4. Renseigner `source` et `license` de l\'entrée dans `assets.manifest.json`.',
  '5. Lancer `pnpm assets:check --promote`, puis envoyer la modification.',
  '',
  '## Reste à livrer',
  '',
];
const byDir = new Map<string, Asset[]>();
for (const asset of todo) byDir.set(dirname(asset.path), [...(byDir.get(dirname(asset.path)) ?? []), asset]);
for (const [dir, assets] of [...byDir].sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`### \`${dir}/\``, '', '| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |', '|---|---|---|---|---|---|');
  for (const a of assets) {
    const alpha = a.alpha === null ? '—' : a.alpha ? 'oui' : 'non';
    lines.push(`| \`${a.id}.${a.format}\` | ${dims(a)} | ${alpha} | ${weight(a.maxBytes)} | ${a.requiredForRelease ? 'oui' : 'non'} | ${cell(a.notes)} |`);
  }
  lines.push('');
}
lines.push('## Fichiers définitifs : origines et licences', '', '| Fichier | Origine | Licence | Notes |', '|---|---|---|---|');
for (const a of done) lines.push(`| \`${a.path}\` | ${cell(a.source ?? '')} | ${cell(a.license ?? '')} | ${cell(a.notes)} |`);
lines.push('');

writeFileSync('docs/ASSETS.md', lines.join('\n'));
console.log(`assets:report : docs/ASSETS.md écrit (${todo.length} à livrer, ${done.length} définitifs).`);
