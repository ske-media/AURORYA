// Géométrie canonique du symbole Aurorya (SPEC Annexe C.1), dans un repère 200 × 200.
// Seule source des cotes : le fichier SVG du registre et l'animation AuroraRise en dérivent.
import { palette } from './colors';

export const LOGO = {
  box: 200,
  circle: { cx: 100, cy: 100, r: 80, strokeWidth: 1, opacity: 0.28 },
  horizon: { x1: 22, x2: 178, y: 118, strokeWidth: 1.2 },
  ascendant: { cx: 22, cy: 118, r: 3.2 },
  sun: { cx: 100, r: 22 },
  halos: [{ r: 42, opacity: 0.35 }, { r: 32, opacity: 0.65 }],
  letter: { apex: { x: 100, y: 20 }, left: { x: 54.1, y: 165.5 }, right: { x: 145.9, y: 165.5 }, strokeWidth: 2.4 },
  star: 'M100 11 Q101 19 108 20 Q101 21 100 29 Q99 21 92 20 Q99 19 100 11 Z',
} as const;

/** Couleurs du symbole sur fond sombre (Annexe C.1). Le logo ne se recolore pas hors palette. */
const logoOnDark = {
  ring: palette.ivory,
  halo: palette.lavenderGrey,
  sunFrom: palette.dustyRose,
  sunTo: palette.champagneLight,
  horizon: palette.ivory,
  letter: palette.champagne,
  star: palette.ivory,
} as const;
/** Sur fond clair, les traits ivoire deviennent encre nuit et le doré s'approfondit pour rester lisible. */
const logoOnLight = { ...logoOnDark, ring: palette.midnight, halo: palette.lavenderDeep, horizon: palette.midnight, letter: palette.champagneDeep, star: palette.midnight } as const;
export const logoColorsFor = { dark: logoOnDark, light: logoOnLight } as const;
/** Couleurs du logo sur fond nuit (carte de partage, visuels de marque). */
export const logoColors = logoOnDark;
