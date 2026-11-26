// `node scripts/assets/card-backgrounds.ts [dossier]` — dessine les quatre fonds de carte (SPEC §16.7, §17).
// Création interne, entièrement calculée : nuit profonde, lueurs très douces, quelques étoiles, aucun texte.
// Les zones de texte du gabarit restent calmes. Le tirage est fixe : relancer redonne les mêmes fichiers.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// Valeurs reprises de packages/shared/src/tokens/colors.ts (palette).
const P = { midnight: '#11121B', deepNavy: '#1A1D2A', aubergine: '#1B1830', nebula: '#3B3360', ivory: '#F5F1E8', champagne: '#D5BD8A', lavender: '#A9A2C6', lavenderDeep: '#7D75A3', rose: '#B98F99', coral: '#D28B86', sage: '#8EA996' } as const;
const W = 1080;
const H = 1920;
// Colonne de texte du gabarit (packages/shared/src/card-layout) : presque aucune étoile dedans.
const TEXT_ZONE = { x1: 96, x2: 984, y1: 430, y2: 1780 };

type Variant = { id: string; seed: number; base: string; top: string; side: string; low: string; ring: string };
const VARIANTS: readonly Variant[] = [
  { id: 'card-bg-roast-soft', seed: 11, base: P.aubergine, top: P.lavender, side: P.nebula, low: P.lavenderDeep, ring: P.lavender },
  { id: 'card-bg-roast-cash', seed: 23, base: P.deepNavy, top: P.rose, side: P.nebula, low: P.coral, ring: P.champagne },
  { id: 'card-bg-roast-expert', seed: 37, base: P.deepNavy, top: P.champagne, side: P.lavenderDeep, low: P.nebula, ring: P.ivory },
  { id: 'card-bg-group', seed: 53, base: P.aubergine, top: P.champagne, side: P.rose, low: P.lavenderDeep, ring: P.champagne },
];

/** Générateur déterministe (mulberry32). */
const random = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const svgOf = (v: Variant): string => {
  const next = random(v.seed);
  const stars: string[] = [];
  while (stars.length < 110) {
    const x = next() * W;
    const y = next() * H;
    const inText = x > TEXT_ZONE.x1 && x < TEXT_ZONE.x2 && y > TEXT_ZONE.y1 && y < TEXT_ZONE.y2;
    if (inText && next() < 0.86) continue;
    const r = 0.7 + next() * next() * 1.9;
    stars.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${next() < 0.25 ? P.champagne : P.ivory}" opacity="${((inText ? 0.1 : 0.16) + next() * (inText ? 0.12 : 0.42)).toFixed(2)}"/>`);
  }
  const glow = (id: string, color: string, opacity: number) => `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.55" stop-color="${color}" stop-opacity="${opacity * 0.28}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v.base}"/><stop offset="0.45" stop-color="${P.midnight}"/><stop offset="1" stop-color="${P.midnight}"/></linearGradient>
    ${glow('top', v.top, 0.2)}${glow('side', v.side, 0.3)}${glow('low', v.low, 0.13)}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#night)"/>
  <ellipse cx="540" cy="250" rx="820" ry="620" fill="url(#top)"/>
  <ellipse cx="-60" cy="1080" rx="560" ry="760" fill="url(#side)"/>
  <ellipse cx="1120" cy="1820" rx="700" ry="560" fill="url(#low)"/>
  <circle cx="540" cy="330" r="430" fill="none" stroke="${v.ring}" stroke-opacity="0.07" stroke-width="1.5"/>
  <circle cx="540" cy="330" r="640" fill="none" stroke="${v.ring}" stroke-opacity="0.04" stroke-width="1.5"/>
  ${stars.join('\n  ')}
</svg>`;
};

/** Bruit très léger : il casse les bandes des dégradés une fois compressés. */
const noise = (seed: number): Buffer => {
  const next = random(seed * 7919);
  const data = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    const value = next() < 0.5 ? 0 : 255;
    data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = Math.floor(next() * 10);
  }
  return data;
};

const out = process.argv[2] ?? 'apps/mobile/assets/cards';
mkdirSync(out, { recursive: true });
for (const v of VARIANTS) {
  const file = join(out, `${v.id}.webp`);
  const info = await sharp(Buffer.from(svgOf(v)))
    .composite([{ input: noise(v.seed), raw: { width: W, height: H, channels: 4 } }])
    .removeAlpha().webp({ quality: 92, effort: 6, smartSubsample: true }).toFile(file);
  console.log(`${file} : ${info.width} × ${info.height}, ${info.size} octets`);
}
