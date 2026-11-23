// Maisons et aspects (SPEC §3.3). Les orbes exactes et leurs ajustements vivent dans la
// configuration du moteur (SPEC §11.5) ; seuls les angles sont canoniques ici.

export const HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type House = (typeof HOUSES)[number];

export const ASPECT_IDS = ['conjunction', 'opposition', 'trine', 'square', 'sextile'] as const;
export type AspectId = (typeof ASPECT_IDS)[number];

export const ASPECT_ANGLES: Readonly<Record<AspectId, number>> = {
  conjunction: 0,
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

/** Les maisons s'affichent en chiffres romains (SPEC §3.3, §5.4). */
export const houseToRoman = (house: House): string => {
  const roman = ROMAN[house - 1];
  if (roman === undefined) throw new Error(`Maison invalide : ${house}`);
  return roman;
};
