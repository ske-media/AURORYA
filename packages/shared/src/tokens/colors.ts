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

export const darkColors: ColorScheme = {
  bg: palette.midnight,
  surface: palette.deepNavy,
  surfaceRaised: palette.slate,
  border: '#2C3A54',
  text: palette.ivory,
  textSecondary: palette.warmGrey,
  accent: palette.champagne,
  accentFill: palette.champagne,
  accentText: palette.champagne,
  onAccent: palette.midnight,
  aspectSoft: palette.lavenderGrey,
  aspectHard: palette.dustyRose,
  success: palette.sage,
  danger: palette.mutedCoral,
  scrim: 'rgba(16,24,39,0.72)',
  // ADR-007 : fond nébuleux (dégradé de `backdrop` vers `backdropTint`) et halo ciblé.
  backdrop: palette.aubergine,
  backdropTint: palette.nebula,
  glow: 'rgba(233,214,172,0.35)',
  // Finition « verre et laiton » : reflet intérieur des surfaces, bordure d'accent atténuée.
  highlight: 'rgba(243,239,231,0.08)',
  accentMuted: 'rgba(198,166,106,0.35)',
};

/**
 * Thème clair, par défaut depuis ADR-032 (planche « ivoire et doré ») : fond ivoire chaud, cartes crème,
 * encre nuit, doré profond pour les traits et les états. Valide seulement si le test de contraste passe.
 */
export const lightColors: ColorScheme = {
  bg: palette.ivory,
  surface: '#FAF6EE',
  surfaceRaised: '#FFFDF8',
  border: '#E3D9C8',
  text: palette.midnight,
  textSecondary: '#55596A',
  // Champagne Gold est trop clair sur ivoire pour un trait ou un petit texte : sa version profonde le remplace.
  accent: palette.champagneDeep,
  // Aplat des boutons et des pastilles actives : le Champagne Gold de la charte, sous un texte encre nuit.
  accentFill: palette.champagne,
  accentText: palette.champagneInk,
  onAccent: palette.midnight,
  aspectSoft: palette.lavenderDeep,
  aspectHard: '#8E5F6B',
  success: '#4F7A5C',
  danger: '#A8504A',
  scrim: 'rgba(16,24,39,0.40)',
  backdrop: '#F2ECE1',
  backdropTint: '#F0E7D8',
  glow: 'rgba(156,124,64,0.22)',
  highlight: 'rgba(255,255,255,0.70)',
  accentMuted: 'rgba(156,124,64,0.35)',
};

export const THEME_NAMES = ['dark', 'light'] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
/** Thème servi par défaut (ADR-032). Le sombre reste disponible. */
export const DEFAULT_THEME: ThemeName = 'light';
export const colorSchemes: Readonly<Record<ThemeName, ColorScheme>> = { dark: darkColors, light: lightColors };
