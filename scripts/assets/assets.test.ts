import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractGlyphPath, glyphProblems, parseSvgViewBox, parseWav } from './inspect.ts';
import { type Asset, ManifestSchema, manifestProblems } from './manifest.ts';

const GLYPH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 12h20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 'photo-sign-leo', target: 'mobile', path: 'apps/mobile/assets/photos/signs/photo-sign-leo.webp',
  kind: 'photo', format: 'webp', width: 1200, height: 1200, alpha: true, tintable: false, maxBytes: 400_000,
  maxDurationMs: null, status: 'placeholder', requiredForRelease: true, owner: 'design', sha256: null,
  source: null, license: null, notes: '', ...over,
});

describe('registre des fichiers visuels (SPEC §17)', () => {
  it('le registre du dépôt est valide et cohérent', () => {
    const manifest = ManifestSchema.parse(JSON.parse(readFileSync('assets.manifest.json', 'utf8')));
    expect(manifestProblems(manifest)).toEqual([]);
    expect(manifest.assets.length).toBeGreaterThan(100);
  });

  it('accepte une entrée conforme', () => {
    expect(manifestProblems({ version: 1, assets: [asset()] })).toEqual([]);
  });

  it.each([
    ['identifiant en double', [asset(), asset()]],
    ['hors convention', [asset({ id: 'Photo_Leo', path: 'apps/mobile/assets/photos/Photo_Leo.webp' })]],
    ["doit être l'identifiant", [asset({ path: 'apps/mobile/assets/photos/signs/lion.webp' })]],
    ['extension différente', [asset({ path: 'apps/mobile/assets/photos/signs/photo-sign-leo.png' })]],
    ['hors des racines', [asset({ path: 'docs/photo-sign-leo.webp' })]],
    ['sans origine ou licence', [asset({ status: 'final' })]],
  ])('signale : %s', (message, assets) => {
    expect(manifestProblems({ version: 1, assets }).join('\n')).toContain(message);
  });

  it('refuse un champ inconnu', () => {
    expect(ManifestSchema.safeParse({ version: 1, assets: [{ ...asset(), extra: 1 }] }).success).toBe(false);
  });
});

describe('mesure des fichiers', () => {
  it('lit le viewBox d’un SVG', () => {
    expect(parseSvgViewBox('<svg viewBox="0 0 640 96">')).toEqual({ width: 640, height: 96 });
    expect(parseSvgViewBox('<svg width="10">')).toBeNull();
  });

  it('valide un glyphe conforme et en extrait le tracé', () => {
    expect(glyphProblems(GLYPH)).toEqual([]);
    expect(extractGlyphPath(GLYPH)).toBe('M2 12h20');
  });

  it.each([
    ['deux tracés', GLYPH.replace('</svg>', '<path d="M0 0"/></svg>')],
    ['un groupe', GLYPH.replace('<path', '<g><path').replace('</svg>', '</g></svg>')],
    ['une transformation', GLYPH.replace('<path', '<path transform="scale(2)"')],
    ['un remplissage', GLYPH.replace('fill="none"', 'fill="#fff"')],
    ['une autre épaisseur', GLYPH.replace('stroke-width="1.5"', 'stroke-width="2"')],
  ])('refuse un glyphe avec %s', (_label, svg) => {
    expect(glyphProblems(svg).length).toBeGreaterThan(0);
  });

  it('lit l’en-tête et la durée d’un WAV', () => {
    const wav = parseWav(readFileSync('apps/mobile/assets/sounds/sfx-reveal.wav'));
    expect(wav).toEqual({ sampleRate: 44100, bits: 16, channels: 1, byteRate: 88200, durationMs: 200 });
    expect(() => parseWav(Buffer.from('pas un fichier son'))).toThrow();
  });
});
