// `pnpm assets:build` — génère les modules d'accès aux fichiers à partir du registre (SPEC §17.3).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative } from 'node:path';
import { extractGlyphPath } from './inspect.ts';
import { type Asset, loadManifest } from './manifest.ts';

const HEADER = '// Fichier généré par `pnpm assets:build` à partir de assets.manifest.json. Ne pas modifier à la main.\n';
const manifest = loadManifest();
const write = (path: string, content: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`écrit ${path}`);
};
const mobile = manifest.assets.filter((a) => a.target === 'mobile');
const entries = (assets: Asset[], value: (a: Asset) => string): string =>
  assets.map((a) => `  ${JSON.stringify(a.id)}: ${value(a)},`).join('\n');

// 1. Application : un require() statique par fichier binaire (indispensable au bundler).
const mobileDir = 'apps/mobile/src/assets';
const binary = mobile.filter((a) => a.format !== 'svg');
write(
  `${mobileDir}/registry.generated.ts`,
  `${HEADER}declare function require(path: string): number;

export const assetModules = {
${entries(binary, (a) => `require(${JSON.stringify(relative(mobileDir, a.path))})`)}
} as const;

export type AssetId = keyof typeof assetModules;
`,
);

// 2. Application : sources SVG (marque, icônes) et tracés des glyphes, dessinés par Skia.
const svgs = mobile.filter((a) => a.format === 'svg' && a.kind !== 'glyph');
write(
  `${mobileDir}/svg.generated.ts`,
  `${HEADER}
export const svgSources = {
${entries(svgs, (a) => JSON.stringify(readFileSync(a.path, 'utf8').replace(/<!--[\s\S]*?-->\s*/g, '').replace(/\s*\n\s*/g, ' ').trim()))}
} as const;

export type SvgAssetId = keyof typeof svgSources;
`,
);
const glyphs = mobile.filter((a) => a.kind === 'glyph');
write(
  `${mobileDir}/glyphs.generated.ts`,
  `${HEADER}
/** Tracés dans un repère 24 × 24, au trait de 1,5, sans remplissage. */
export const glyphPaths = {
${entries(glyphs, (a) => JSON.stringify(extractGlyphPath(readFileSync(a.path, 'utf8'))))}
} as const;

export type GlyphId = keyof typeof glyphPaths;
`,
);

// 3. Site : copie de la marque et des fonds de carte, puis table des URL publiques.
const publicDir = 'apps/web/public';
const copied: [string, string][] = [];
for (const asset of mobile) {
  const folder = asset.kind === 'brand' ? 'brand' : asset.kind === 'card' || asset.kind === 'texture' ? 'cards' : null;
  if (!folder) continue;
  const destination = `${publicDir}/${folder}/${basename(asset.path)}`;
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(asset.path, destination);
  copied.push([asset.id, `/${folder}/${basename(asset.path)}`]);
}
const web = manifest.assets.filter((a) => a.target === 'web').map((a): [string, string] => [a.id, `/${relative(publicDir, a.path)}`]);
write(
  'apps/web/src/server/assets.generated.ts',
  `${HEADER}
export const assetUrls = {
${[...copied, ...web].map(([id, url]) => `  ${JSON.stringify(id)}: ${JSON.stringify(url)},`).join('\n')}
} as const;

export type WebAssetId = keyof typeof assetUrls;
`,
);
