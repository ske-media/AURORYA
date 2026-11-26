// Typographie (SPEC §16.3, §27.5). Deux familles au plus : Cormorant Garamond pour l'éditorial, Inter pour l'interface.
// Un seul composant `Text` consomme ces styles via `variant`.

export const fontFamilies = {
  serif: 'CormorantGaramond-Medium',
  serifItalic: 'CormorantGaramond-MediumItalic',
  // Titres fonctionnels, boutons, étiquettes : Inter Medium depuis le retrait de Manrope (ADR-031).
  heading: 'Inter-Medium',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
} as const;
export type FontFamilyKey = keyof typeof fontFamilies;

export type TextStyleToken = Readonly<{
  font: FontFamilyKey;
  fontSize: number;
  lineHeight: number;
  /** Interlettrage en em. */
  letterSpacingEm?: number;
  uppercase?: boolean;
  tabularNumbers?: boolean;
}>;

export const TEXT_VARIANTS = [
  'display', 'title1', 'title2', 'punchline', 'quote', 'heading',
  'label', 'body', 'bodySmall', 'caption', 'numeric',
] as const;
export type TextVariant = (typeof TEXT_VARIANTS)[number];

export const textStyles: Readonly<Record<TextVariant, TextStyleToken>> = {
  display: { font: 'serif', fontSize: 40, lineHeight: 44 },
  title1: { font: 'serif', fontSize: 32, lineHeight: 38 },
  title2: { font: 'serif', fontSize: 26, lineHeight: 32 },
  punchline: { font: 'serif', fontSize: 24, lineHeight: 32 },
  quote: { font: 'serifItalic', fontSize: 20, lineHeight: 28 },
  heading: { font: 'heading', fontSize: 18, lineHeight: 24 },
  label: { font: 'heading', fontSize: 12, lineHeight: 16, letterSpacingEm: 0.14, uppercase: true },
  body: { font: 'body', fontSize: 16, lineHeight: 24 },
  bodySmall: { font: 'body', fontSize: 14, lineHeight: 20 },
  caption: { font: 'bodyMedium', fontSize: 12, lineHeight: 16 },
  numeric: { font: 'bodyMedium', fontSize: 14, lineHeight: 20, tabularNumbers: true },
};

/** Taille de texte dynamique maximale acceptée (SPEC §15.7). */
export const MAX_FONT_SCALE = 1.3;
