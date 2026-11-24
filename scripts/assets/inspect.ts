// Mesure d'un fichier sur le disque : dimensions, transparence, durée.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import type { Asset } from './manifest.ts';

export type Measured = { width: number | null; height: number | null; alpha: boolean | null; durationMs: number | null };

export function parseSvgViewBox(svg: string): { width: number; height: number } | null {
  const match = /viewBox="\s*([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(svg);
  if (!match) return null;
  return { width: Number(match[3]), height: Number(match[4]) };
}

export function parseWav(buffer: Buffer): { sampleRate: number; bits: number; channels: number; durationMs: number } {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('en-tête WAV absent');
  let offset = 12;
  let format: { sampleRate: number; bits: number; channels: number; byteRate: number } | null = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      format = {
        channels: buffer.readUInt16LE(offset + 10),
        sampleRate: buffer.readUInt32LE(offset + 12),
        byteRate: buffer.readUInt32LE(offset + 16),
        bits: buffer.readUInt16LE(offset + 22),
      };
    } else if (id === 'data') {
      if (!format) throw new Error('bloc fmt absent avant data');
      return { ...format, durationMs: Math.round((size / format.byteRate) * 1000) };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error('bloc data absent');
}

/** Les glyphes doivent tenir en un seul `<path>` au trait, pour l'extraction Skia (SPEC §17.5). */
export function glyphProblems(svg: string): string[] {
  const problems: string[] = [];
  const body = svg.replace(/<!--[\s\S]*?-->/g, '');
  const elements = [...body.matchAll(/<([a-zA-Z]+)[\s>/]/g)].map((m) => m[1]);
  if (elements.join(',') !== 'svg,path') problems.push(`doit contenir un seul <path> (trouvé : ${elements.slice(1).join(', ') || 'rien'})`);
  if (/\btransform=|\bstyle=|<style/.test(body)) problems.push('transformation ou style interdit');
  if (!/fill="none"/.test(body)) problems.push('remplissage interdit (fill="none" attendu)');
  if (!/stroke-width="1\.5"/.test(body)) problems.push('épaisseur de trait 1,5 attendue');
  return problems;
}

export function extractGlyphPath(svg: string): string {
  const match = /<path[^>]*\sd="([^"]+)"/.exec(svg);
  if (!match?.[1]) throw new Error('aucun tracé');
  return match[1];
}

export async function measure(asset: Asset): Promise<Measured> {
  const buffer = readFileSync(asset.path);
  switch (asset.format) {
    case 'svg': {
      const box = parseSvgViewBox(buffer.toString('utf8'));
      if (!box) throw new Error('viewBox absent');
      return { ...box, alpha: null, durationMs: null };
    }
    case 'png':
    case 'webp': {
      const meta = await sharp(buffer).metadata();
      if (meta.format !== asset.format) throw new Error(`format réel : ${meta.format}`);
      return { width: meta.width, height: meta.height, alpha: meta.hasAlpha, durationMs: null };
    }
    case 'wav': {
      const wav = parseWav(buffer);
      if (wav.sampleRate !== 44100 || wav.bits !== 16 || wav.channels !== 1) {
        throw new Error(`WAV ${wav.sampleRate} Hz, ${wav.bits} bits, ${wav.channels} canal(aux) ; attendu 44100 Hz, 16 bits, mono`);
      }
      return { width: null, height: null, alpha: null, durationMs: wav.durationMs };
    }
    case 'ttf': {
      const magic = buffer.readUInt32BE(0);
      if (magic !== 0x00010000 && magic !== 0x74727565) throw new Error('signature TrueType absente');
      return { width: null, height: null, alpha: null, durationMs: null };
    }
  }
}
