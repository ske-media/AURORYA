// `node scripts/assets/import-photo.ts <source> <identifiant>` — met une image livrée au format du registre :
// dimensions de l'entrée, bords fondus vers la transparence (ADR-007), WebP sous le poids maximal.
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { loadManifest } from './manifest.ts';

const [source, id] = process.argv.slice(2);
const asset = loadManifest().assets.find((a) => a.id === id);
if (!source || !asset || asset.format !== 'webp' || asset.width === null || asset.height === null) {
  console.error('Usage : import-photo.ts <source> <identifiant d’une photo webp du registre>');
  process.exit(1);
}
const { width, height } = asset;
// Masque : opaque au centre, fondu sur le dernier cinquième de chaque bord.
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="h" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset="0.2" stop-color="#fff"/><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <linearGradient id="v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="0.2" stop-color="#fff"/><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#h)"/>
  <rect width="100%" height="100%" fill="url(#v)" style="mix-blend-mode:multiply"/>
</svg>`);
const alpha = await sharp(mask).resize(width, height).greyscale().extractChannel(0).raw().toBuffer();
// Deux temps : sharp n'applique pas ses opérations dans l'ordre d'appel, la couche alpha se joint sur des pixels bruts.
const rgb = await sharp(source).resize(width, height, { fit: 'cover', position: 'centre' }).removeAlpha().raw().toBuffer();
const rgba = Buffer.alloc(width * height * 4);
for (let i = 0; i < width * height; i += 1) {
  rgba[i * 4] = rgb[i * 3] ?? 0; rgba[i * 4 + 1] = rgb[i * 3 + 1] ?? 0; rgba[i * 4 + 2] = rgb[i * 3 + 2] ?? 0; rgba[i * 4 + 3] = alpha[i] ?? 0;
}
for (const quality of [86, 80, 72, 64, 56]) {
  const out = await sharp(rgba, { raw: { width, height, channels: 4 } }).webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
  if (out.length <= asset.maxBytes) {
    writeFileSync(asset.path, out);
    console.log(`${asset.path} : ${width} × ${height}, ${out.length} octets, qualité ${quality}`);
    process.exit(0);
  }
}
console.error(`${id} : impossible de tenir sous ${asset.maxBytes} octets`);
process.exit(1);
