import { describe, expect, it } from 'vitest';
import { type ColorRole, THEME_NAMES, colorSchemes } from './colors';
import { contrastRatio } from './contrast';

// SPEC §15.7 : 4,5:1 pour le texte courant, 3:1 pour les grands titres et les éléments graphiques.
const BODY = 4.5;
const GRAPHIC = 3;

const backgrounds: ColorRole[] = ['bg', 'surface', 'surfaceRaised', 'backdrop', 'backdropTint'];
const onBackgrounds: [ColorRole, number][] = [
  ['text', BODY],
  ['textSecondary', BODY],
  ['accentText', BODY],
  ['accent', GRAPHIC],
  ['aspectSoft', GRAPHIC],
  ['aspectHard', GRAPHIC],
  ['success', GRAPHIC],
  ['danger', GRAPHIC],
];

describe('contraste', () => {
  it('calcule les valeurs de référence', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  describe.each(THEME_NAMES)('thème %s', (theme) => {
    const scheme = colorSchemes[theme];
    const cases = backgrounds.flatMap((bg) =>
      onBackgrounds.map(([fg, min]) => [fg, bg, min] as const),
    );
    it.each(cases)('%s sur %s ≥ %d', (fg, bg, min) => {
      expect(contrastRatio(scheme[fg], scheme[bg])).toBeGreaterThanOrEqual(min);
    });
    it('onAccent sur accent ≥ 4.5', () => {
      expect(contrastRatio(scheme.onAccent, scheme.accent)).toBeGreaterThanOrEqual(BODY);
    });
  });
});
