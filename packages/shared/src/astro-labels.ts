// Noms affichés des corps, signes et aspects, et construction des libellés de placement.
// Seul endroit où ces noms existent : l'app et le serveur passent par ces fonctions (SPEC §15.6).
import { type AspectId, type House, type Locale, type SignId, houseToRoman } from './canon';

export type LabelBodyId = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'north_node' | 'asc' | 'mc';

export const BODY_NAMES: Readonly<Record<Locale, Readonly<Record<LabelBodyId, string>>>> = {
  fr: {
    sun: 'Soleil', moon: 'Lune', mercury: 'Mercure', venus: 'Vénus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturne',
    uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluton', north_node: 'Nœud Nord', asc: 'Ascendant', mc: 'Milieu du Ciel',
  },
  en: {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
    uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', north_node: 'North Node', asc: 'Ascendant', mc: 'Midheaven',
  },
};

export const SIGN_NAMES: Readonly<Record<Locale, Readonly<Record<SignId, string>>>> = {
  fr: {
    aries: 'Bélier', taurus: 'Taureau', gemini: 'Gémeaux', cancer: 'Cancer', leo: 'Lion', virgo: 'Vierge',
    libra: 'Balance', scorpio: 'Scorpion', sagittarius: 'Sagittaire', capricorn: 'Capricorne', aquarius: 'Verseau', pisces: 'Poissons',
  },
  en: {
    aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo',
    libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
  },
};

export const ASPECT_NAMES: Readonly<Record<Locale, Readonly<Record<AspectId, string>>>> = {
  fr: { conjunction: 'Conjonction', opposition: 'Opposition', trine: 'Trigone', square: 'Carré', sextile: 'Sextile' },
  en: { conjunction: 'Conjunction', opposition: 'Opposition', trine: 'Trine', square: 'Square', sextile: 'Sextile' },
};

const ordinalEn = (n: number): string => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

/** « Maison VIII » / « 8th house » (SPEC §3.3). */
export const formatHouse = (locale: Locale, house: House): string =>
  locale === 'fr' ? `Maison ${houseToRoman(house)}` : `${ordinalEn(house)} house`;

/** « 14°32′ » (SPEC §5.4). */
export const formatDegrees = (degree: number, minute: number): string => `${degree}°${String(minute).padStart(2, '0')}′`;

/** « Lune en Scorpion, maison VIII » / « Moon in Scorpio, 8th house ». */
export function formatPlacement(locale: Locale, body: LabelBodyId, sign: SignId, house: House | null): string {
  const base = `${BODY_NAMES[locale][body]} ${locale === 'fr' ? 'en' : 'in'} ${SIGN_NAMES[locale][sign]}`;
  if (house === null) return base;
  return `${base}, ${locale === 'fr' ? formatHouse(locale, house).toLowerCase().replace(/ [ivx]+$/, (m) => m.toUpperCase()) : formatHouse(locale, house)}`;
}

/** « Conjonction Lune–Pluton » / « Moon–Pluto conjunction ». Tournure sans accord de genre. */
export function formatAspect(locale: Locale, a: LabelBodyId, b: LabelBodyId, type: AspectId): string {
  const pair = `${BODY_NAMES[locale][a]}–${BODY_NAMES[locale][b]}`;
  return locale === 'fr' ? `${ASPECT_NAMES.fr[type]} ${pair}` : `${pair} ${ASPECT_NAMES.en[type].toLowerCase()}`;
}
