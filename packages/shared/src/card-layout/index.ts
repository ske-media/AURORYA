// Gabarit des cartes partageables, 1080 × 1920 (SPEC §16.7). Utilisé par l'app et par le rendu serveur.
export const CARD = {
  width: 1080,
  height: 1920,
  /** Zones à éviter : interfaces des réseaux. */
  safeTop: 250,
  safeBottom: 1760,
  centerX: 540,
  sideMargin: 96,
  symbol: { y: 330, size: 132 },
  title: { y: 470, fontSize: 72 },
  bigThree: { y: 560, fontSize: 30 },
  blocks: { starts: [700, 990, 1280], labelFontSize: 28, punchlineFontSize: 60, punchlineLineHeight: 72, maxLines: 3 },
  /** Si une punchline dépasse trois lignes, la taille descend par paliers jusqu'au minimum. */
  punchlineShrink: { step: 4, minFontSize: 48 },
  rule: { y: 1560, width: 120 },
  modeBadge: { y: 1610 },
  signature: { y: 1680, ctaFontSize: 40, hostFontSize: 28 },
  group: { maxMemberLines: 8, memberFontSize: 40 },
} as const;

/** La vue de carte fait 360 × 640 points, capturée à la densité 3 (SPEC §15.8). */
export const CARD_VIEW = { width: 360, height: 640, pixelRatio: 3 } as const;

/** Tailles de police à essayer pour une punchline, de la plus grande à la plus petite. */
export const punchlineFontSizes = (): number[] => {
  const sizes: number[] = [];
  for (let size = CARD.blocks.punchlineFontSize; size >= CARD.punchlineShrink.minFontSize; size -= CARD.punchlineShrink.step) sizes.push(size);
  return sizes;
};
