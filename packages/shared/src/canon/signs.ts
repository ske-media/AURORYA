// Signes, éléments, modalités (SPEC §3.2). L'index d'un signe est sa position dans SIGN_IDS (0 à 11).

export const SIGN_IDS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;
export type SignId = (typeof SIGN_IDS)[number];

export const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
export type Element = (typeof ELEMENTS)[number];

export const MODALITIES = ['cardinal', 'fixed', 'mutable'] as const;
export type Modality = (typeof MODALITIES)[number];

export const signIndex = (sign: SignId): number => SIGN_IDS.indexOf(sign);

/** Les éléments se suivent dans l'ordre feu, terre, air, eau à partir du Bélier. */
export const signElement = (sign: SignId): Element => {
  const element = ELEMENTS[signIndex(sign) % 4];
  if (element === undefined) throw new Error(`Signe inconnu : ${sign}`);
  return element;
};

/** Les modalités se suivent dans l'ordre cardinal, fixe, mutable à partir du Bélier. */
export const signModality = (sign: SignId): Modality => {
  const modality = MODALITIES[signIndex(sign) % 3];
  if (modality === undefined) throw new Error(`Signe inconnu : ${sign}`);
  return modality;
};

/** Signe correspondant à une longitude écliptique en degrés (toute valeur réelle finie). */
export const signFromLongitude = (longitude: number): SignId => {
  if (!Number.isFinite(longitude)) throw new Error('Longitude non finie');
  const normalized = ((longitude % 360) + 360) % 360;
  const sign = SIGN_IDS[Math.floor(normalized / 30) % 12];
  if (sign === undefined) throw new Error(`Longitude invalide : ${longitude}`);
  return sign;
};

export const isSignId = (value: string): value is SignId =>
  (SIGN_IDS as readonly string[]).includes(value);
