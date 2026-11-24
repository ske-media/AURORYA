// Lecture, validation et écriture du registre des fichiers visuels et sonores (SPEC §17).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { z } from 'zod';

export const MANIFEST_PATH = 'assets.manifest.json';

/** Racines où tout fichier doit figurer au registre. */
export const ASSET_ROOTS = ['apps/mobile/assets', 'apps/web/public', 'store/ios'] as const;
/** Sous-dossiers hors registre : licences des polices, copies produites par `assets:build`. */
export const UNTRACKED_DIRS = ['apps/mobile/assets/fonts/licenses', 'apps/web/public/brand', 'apps/web/public/cards'] as const;

export const ASSET_KINDS = ['brand', 'icon', 'glyph', 'photo', 'card', 'texture', 'sound', 'font', 'store', 'web'] as const;
export const ASSET_FORMATS = ['svg', 'png', 'webp', 'wav', 'ttf'] as const;

const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const AssetSchema = z.strictObject({
  /** Minuscules et tirets, sauf pour les polices dont le nom de fichier est imposé (SPEC §17.5). */
  id: z.string().min(1),
  target: z.enum(['mobile', 'web', 'store']),
  path: z.string().min(1),
  kind: z.enum(ASSET_KINDS),
  format: z.enum(ASSET_FORMATS),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  alpha: z.boolean().nullable(),
  tintable: z.boolean(),
  maxBytes: z.number().int().positive(),
  maxDurationMs: z.number().int().positive().nullable(),
  status: z.enum(['placeholder', 'final']),
  requiredForRelease: z.boolean(),
  owner: z.enum(['design', 'dev']),
  sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  source: z.string().nullable(),
  license: z.string().nullable(),
  notes: z.string(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const ManifestSchema = z.strictObject({
  version: z.literal(1),
  assets: z.array(AssetSchema),
});
export type Manifest = z.infer<typeof ManifestSchema>;

/** Erreurs de cohérence interne du registre (indépendantes des fichiers sur le disque). */
export function manifestProblems(manifest: Manifest): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const asset of manifest.assets) {
    // Les captures de l'App Store portent le même nom dans chaque dossier de langue (SPEC §17.5).
    if (asset.target !== 'store' && ids.has(asset.id)) problems.push(`${asset.id} : identifiant en double`);
    if (paths.has(asset.path)) problems.push(`${asset.id} : chemin en double (${asset.path})`);
    ids.add(asset.id);
    paths.add(asset.path);
    if (asset.kind !== 'font' && !idPattern.test(asset.id)) problems.push(`${asset.id} : identifiant hors convention`);
    if (basename(asset.path, extname(asset.path)) !== asset.id) problems.push(`${asset.id} : le nom du fichier doit être l'identifiant`);
    if (extname(asset.path) !== `.${asset.format}`) problems.push(`${asset.id} : extension différente du format`);
    if (!ASSET_ROOTS.some((root) => asset.path.startsWith(`${root}/`))) problems.push(`${asset.id} : chemin hors des racines du registre`);
    if (asset.status === 'final' && (!asset.source || !asset.license)) problems.push(`${asset.id} : définitif sans origine ou licence`);
  }
  return problems;
}

export function loadManifest(): Manifest {
  const manifest = ManifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
  const problems = manifestProblems(manifest);
  if (problems.length > 0) throw new Error(`Registre incohérent :\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  return manifest;
}

export function saveManifest(manifest: Manifest): void {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(ManifestSchema.parse(manifest), null, 2)}\n`);
}

export const sha256File = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Tous les fichiers présents sous les racines du registre, hors dossiers non suivis. */
export function listFilesOnDisk(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir) || (UNTRACKED_DIRS as readonly string[]).includes(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name !== '.gitkeep' && name !== '.DS_Store') out.push(full);
    }
  };
  for (const root of ASSET_ROOTS) walk(root);
  return out.sort();
}
