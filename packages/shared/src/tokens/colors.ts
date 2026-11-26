// Couleurs (SPEC §16.2, ADR-007, puis palette du cahier de conception v1.0 §12.3 : ADR-030).
// Seul endroit où des valeurs de couleur existent. Entre parenthèses, le nom de la teinte dans le cahier.
// Les composants n'utilisent que les rôles, jamais la palette de base.

export const palette = {
  midnight: '#101827', // Midnight Ink
  deepNavy: '#17243A', // Deep Cosmos
  slate: '#1F2E48', // dérivée : Deep Cosmos éclairci, pour les surfaces relevées
  ivory: '#F3EFE7', // Warm Ivory
  ivoryDim: '#D8D2C4',
  warmGrey: '#AAB2C0', // Stardust Grey
  graphite: '#5E5A62',
  sage: '#9DAE9C', // Quiet Sage
  champagne: '#C6A66A', // Champagne Gold
  champagneLight: '#E9D6AC',
  champagneDeep: '#9C7C40',
  champagneInk: '#7A5F2E',
  lavenderGrey: '#A79ACB', // Celestial Lilac
  lavenderDeep: '#7D75A3',
  dustyRose: '#B98F99',
  mutedCoral: '#C96F68', // Alert Coral : erreur ou attention uniquement
  // ADR-007, ADR-030 : bleus profonds dérivés de Midnight Ink, réservés aux fonds.
  aubergine: '#131C30',
  nebula: '#2A3558',
} as const;

export const COLOR_ROLES = [
  'bg', 'surface', 'surfaceRaised', 'border', 'text', 'textSecondary',
  'accent', 'accentFill', 'accentText', 'onAccent', 'aspectSoft', 'aspectHard',
  'success', 'danger', 'scrim', 'backdrop', 'backdropTint', 'glow', 'highlight', 'accentMuted',
] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];
export type ColorScheme = Readonly<Record<ColorRole, string>>;

/**
 * Direction « nuit, papier et braise » (ADR-033) : noir profond, bleu nuit, papier beige, orange brûlé,
 * fines lignes de bronze. Ces teintes ne servent qu'aux deux thèmes ci-dessous.
 */
const night = {
  ink: '#0B0B0D',
  coal: '#141416',
  coalRaised: '#1C1C20',
  seam: '#2E2823',
  navy: '#10283F',
  navyDeep: '#0D1A28',
  paper: '#DCCDB5',
  paperLight: '#E4D7C2',
  paperLighter: '#EBE0CE',
  paperEdge: '#BFAE94',
  paperShade: '#D3C2A6',
  parchment: '#E9DDC9',
  ash: '#A69B8B',
  ember: '#E2711D',
  emberDeep: '#AD4705',
  emberInk: '#7E3403',
  bronze: '#B08A5E',
} as const;

/** Thème sombre, par défaut (ADR-033) : encre noire, texte parchemin, accent braise. */
export const darkColors: ColorScheme = {
  bg: night.ink,
  surface: night.coal,
  surfaceRaised: night.coalRaised,
  border: night.seam,
  text: night.parchment,
  textSecondary: night.ash,
  accent: night.ember,
  accentFill: night.ember,
  accentText: night.ember,
  onAccent: night.ink,
  aspectSoft: '#7FA3C7',
  aspectHard: '#D46A4A',
  success: palette.sage,
  danger: '#E0584B',
  scrim: 'rgba(11,11,13,0.76)',
  // Fond : une lueur bleu nuit très douce en haut d'écran.
  backdrop: night.navyDeep,
  backdropTint: night.navy,
  glow: 'rgba(226,113,29,0.30)',
  highlight: 'rgba(233,221,201,0.06)',
  // Lignes d'orbite, filets et bordures mises en avant : bronze atténué.
  accentMuted: 'rgba(176,138,94,0.55)',
};

/** Thème clair : le même univers sur papier beige, encre noire, braise approfondie pour rester lisible. */
export const lightColors: ColorScheme = {
  bg: night.paper,
  surface: night.paperLight,
  surfaceRaised: night.paperLighter,
  border: night.paperEdge,
  text: night.ink,
  textSecondary: '#4A443C',
  accent: night.emberDeep,
  accentFill: night.ember,
  accentText: night.emberInk,
  onAccent: night.ink,
  aspectSoft: '#2F5E86',
  aspectHard: '#A8401F',
  success: '#3F6B4C',
  danger: '#9E2F25',
  scrim: 'rgba(11,11,13,0.40)',
  backdrop: night.paper,
  backdropTint: night.paperShade,
  glow: 'rgba(173,71,5,0.22)',
  highlight: 'rgba(255,255,255,0.45)',
  accentMuted: 'rgba(126,52,3,0.40)',
};

/** Couleurs du symbole selon le fond (remplace celles de l'Annexe C tant que le logo définitif n'est pas livré). */
export const brandInk = { paper: night.parchment, ink: night.ink, bronze: night.bronze, emberFrom: '#C9541A', emberTo: '#F08A2E', emberDeep: night.emberDeep } as const;

export const THEME_NAMES = ['dark', 'light'] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
/** Thème servi par défaut (ADR-033). Le clair, sur papier, reste disponible. */
export const DEFAULT_THEME: ThemeName = 'dark';
export const colorSchemes: Readonly<Record<ThemeName, ColorScheme>> = { dark: darkColors, light: lightColors };
