// Espacements, rayons, mouvement (SPEC §16.4). Valeurs en points et en millisecondes.

export const spacing = {
  s2: 2, s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s56: 56,
} as const;
export const SCREEN_MARGIN = spacing.s20;

export const radii = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const BORDER_WIDTH = 1;
/** Cible tactile minimale (SPEC §15.7). */
export const MIN_TOUCH_TARGET = 44;

export const durations = { instant: 120, fast: 220, base: 360, slow: 600 } as const;

/** Courbes de Bézier cubiques : sortie douce pour les entrées, entrée douce pour les sorties. */
export const easings = {
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const;
