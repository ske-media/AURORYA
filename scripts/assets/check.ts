// `pnpm assets:check [--promote] [--release]` — contrôle du registre contre le disque (SPEC §17.3).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { glyphProblems, measure } from './inspect.ts';
import { listFilesOnDisk, loadManifest, saveManifest, sha256File } from './manifest.ts';

const args = new Set(process.argv.slice(2));
const promote = args.has('--promote');
const release = args.has('--release');

const manifest = loadManifest();
const errors: string[] = [];
const promoted: string[] = [];

for (const asset of manifest.assets) {
  const fail = (message: string): void => void errors.push(`${asset.id} : ${message}`);
  if (!existsSync(asset.path)) {
    fail(`fichier absent (${asset.path}) ; lancer \`pnpm assets:placeholders\``);
    continue;
  }
  const bytes = statSync(asset.path).size;
  if (bytes > asset.maxBytes) fail(`${bytes} octets, maximum ${asset.maxBytes}`);
  try {
    const measured = await measure(asset);
    if (asset.width !== null && (measured.width !== asset.width || measured.height !== asset.height)) {
      fail(`dimensions ${measured.width} × ${measured.height}, attendu ${asset.width} × ${asset.height}`);
    }
    if (asset.alpha !== null && measured.alpha !== null && measured.alpha !== asset.alpha) {
      fail(asset.alpha ? 'transparence attendue' : 'transparence interdite');
    }
    if (asset.maxDurationMs !== null && measured.durationMs !== null && measured.durationMs > asset.maxDurationMs) {
      fail(`durée ${measured.durationMs} ms, maximum ${asset.maxDurationMs} ms`);
    }
    if (asset.kind === 'glyph') for (const problem of glyphProblems(readFileSync(asset.path, 'utf8'))) fail(problem);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  const hash = sha256File(asset.path);
  if (hash !== asset.sha256) {
    if (!promote) {
      fail('empreinte différente du registre ; lancer `pnpm assets:check --promote` après une livraison');
    } else if (!asset.source || !asset.license) {
      fail('fichier remplacé : renseigner `source` et `license` dans assets.manifest.json, puis relancer --promote');
    } else {
      asset.sha256 = hash;
      asset.status = 'final';
      promoted.push(asset.id);
    }
  }
  if (release && asset.status === 'placeholder' && asset.requiredForRelease) fail('fichier provisoire, requis pour la mise en production');
}

const known = new Set(manifest.assets.map((a) => a.path));
for (const file of listFilesOnDisk()) {
  if (!known.has(file)) errors.push(`${file} : présent sur le disque mais absent du registre`);
}

if (promoted.length > 0 && errors.length === 0) {
  saveManifest(manifest);
  console.log(`Promus en définitif : ${promoted.join(', ')}`);
}
if (errors.length > 0) {
  console.error(`assets:check : ${errors.length} problème(s)\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
const placeholders = manifest.assets.filter((a) => a.status === 'placeholder').length;
console.log(`assets:check : ${manifest.assets.length} fichiers conformes, dont ${placeholders} provisoires.`);
