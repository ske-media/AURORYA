// `pnpm assets:placeholders` — crée un fichier provisoire pour chaque entrée dont le fichier est absent
// (SPEC §17.3). N'écrase jamais un fichier existant.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { type Asset, loadManifest, saveManifest, sha256File } from './manifest.ts';

// Valeurs reprises de packages/shared/src/tokens/colors.ts (palette.midnight, palette.ivory).
const MIDNIGHT = '#11121B';
const IVORY = '#F5F1E8';
const LOGO = readFileSync('apps/mobile/assets/brand/brand-logo-symbol.svg', 'utf8');
const LOGO_MONO = readFileSync('apps/mobile/assets/brand/brand-logo-symbol-mono.svg', 'utf8');

/** Anneau fin ivoire, identifiant et dimensions au centre. */
const ringSvg = (asset: Asset, width: number, height: number, background: string | null): string => {
  const r = Math.min(width, height) * 0.4;
  const size = Math.max(10, Math.min(width / (asset.id.length * 0.62), Math.min(width, height) / 12));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : ''}
  <circle cx="${width / 2}" cy="${height / 2}" r="${r}" fill="none" stroke="${IVORY}" stroke-width="${Math.max(1, r / 120)}"/>
  <text x="${width / 2}" y="${height / 2}" fill="${IVORY}" font-family="sans-serif" font-size="${size}" text-anchor="middle">${asset.id}</text>
  <text x="${width / 2}" y="${height / 2 + size * 1.5}" fill="${IVORY}" font-family="sans-serif" font-size="${size * 0.7}" text-anchor="middle">${width} × ${height}</text>
</svg>`;
};

// Tracé géométrique unique : anneau à quatre encoches, conforme aux contraintes des glyphes.
const GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14M12 2v3M12 19v3M2 12h3M19 12h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`;

const logoOn = async (svg: string, size: number, background: string | null, ratio: number): Promise<Sharp> => {
  const inner = Math.round(size * ratio);
  const logo = await sharp(Buffer.from(svg), { density: 72 * (inner / 200) * 1.01 }).resize(inner, inner).png().toBuffer();
  const base = sharp({
    create: background
      ? { width: size, height: size, channels: 3, background }
      : { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  const composed = base.composite([{ input: logo, gravity: 'centre' }]);
  return background ? composed.removeAlpha() : composed;
};

const silentWav = (durationMs: number): Buffer => {
  const dataSize = Math.round((44100 * durationMs) / 1000) * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVEfmt ', 8, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(44100, 24);
  buffer.writeUInt32LE(88200, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
};

async function render(asset: Asset): Promise<Buffer> {
  const { width, height } = asset;
  if (asset.format === 'wav') return silentWav(200);
  if (asset.format === 'ttf') throw new Error('une police ne se remplace pas par un fichier provisoire : la télécharger (SPEC §17.5)');
  if (width === null || height === null) throw new Error('dimensions manquantes');

  if (asset.format === 'svg') {
    if (asset.kind === 'glyph') return Buffer.from(GLYPH_SVG);
    if (asset.id === 'favicon') {
      return Buffer.from(LOGO_MONO.replace('viewBox="0 0 200 200"', 'viewBox="0 0 200 200" width="32" height="32"').replaceAll('currentColor', '#D5BD8A'));
    }
    return Buffer.from(ringSvg(asset, width, height, null));
  }

  const encode = (image: Sharp): Promise<Buffer> =>
    asset.format === 'webp' ? image.webp({ quality: 80 }).toBuffer() : image.png().toBuffer();
  const flat = (): Sharp => sharp({ create: { width, height, channels: 3, background: MIDNIGHT } });

  if (asset.id.startsWith('icon-app-ios')) {
    const icon = await logoOn(LOGO, width, MIDNIGHT, 0.73);
    return encode(asset.id.endsWith('tinted') ? icon.grayscale() : icon);
  }
  if (asset.id === 'splash-symbol') return encode(await logoOn(LOGO, width, null, 0.6));
  if (asset.id === 'icon-notification') return encode(await logoOn(LOGO_MONO.replaceAll('currentColor', '#FFFFFF'), width, null, 0.9));
  if (asset.id === 'favicon-32' || asset.id === 'apple-touch-icon') return encode(await logoOn(LOGO, width, MIDNIGHT, 0.8));
  // Fonds de carte : aplat sans aucun texte, pour qu'une carte de test reste présentable.
  if (asset.kind === 'card' || asset.id === 'web-hero') return encode(flat());
  if (asset.kind === 'texture') {
    return encode(sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }));
  }
  if (asset.alpha) return encode(sharp(Buffer.from(ringSvg(asset, width, height, null))));
  return encode(sharp(Buffer.from(ringSvg(asset, width, height, MIDNIGHT))).removeAlpha());
}

const manifest = loadManifest();
let created = 0;
for (const asset of manifest.assets) {
  if (existsSync(asset.path)) continue;
  mkdirSync(dirname(asset.path), { recursive: true });
  writeFileSync(asset.path, await render(asset));
  asset.status = 'placeholder';
  asset.sha256 = sha256File(asset.path);
  created += 1;
  console.log(`créé  ${asset.path}`);
}
// Les fichiers déjà présents mais jamais empreints reçoivent leur empreinte, sans changer de statut.
for (const asset of manifest.assets) {
  if (asset.sha256 === null && existsSync(asset.path)) asset.sha256 = sha256File(asset.path);
}
saveManifest(manifest);
console.log(`assets:placeholders : ${created} fichier(s) provisoire(s) créé(s).`);
