// Contenu de la carte du roast (SPEC §7.3, §15.8). Fonctions pures : aucune donnée de naissance n'entre ici,
// seulement le prénom (ou le titre anonyme), le Big Three, les punchlines, le mode et la signature.
import { CARD, CARD_VIEW, type RoastResponse, type ToneMode } from '@aurorya/shared';

/** Conversion des pixels du gabarit (1080 × 1920) en points de la vue (360 × 640). */
export const cardPt = (px: number): number => (px * CARD_VIEW.width) / CARD.width;

export type RoastCardModel = Readonly<{
  mode: ToneMode;
  title: string;
  bigThree: string;
  blocks: readonly Readonly<{ label: string; text: string }>[];
  modeName: string;
  cta: string;
  /** Null tant que le domaine n'est pas connu : la ligne est alors absente, jamais inventée. */
  host: string | null;
}>;

export function buildRoastCard(input: Readonly<{
  roast: RoastResponse; firstName: string; hideName: boolean; bigThree: readonly string[]; host: string | null;
  texts: Readonly<{ title: (name: string) => string; titleAnonymous: string; modeName: string; cta: string }>;
}>): RoastCardModel {
  const name = input.firstName.trim();
  return {
    mode: input.roast.mode,
    title: input.hideName || name.length === 0 ? input.texts.titleAnonymous : input.texts.title(name),
    bigThree: input.bigThree.join(' · '),
    blocks: input.roast.punchlines.map((p) => ({ label: p.label, text: p.text })),
    modeName: input.texts.modeName,
    cta: input.texts.cta,
    host: input.host,
  };
}

/** Nom d'hôte du site à partir de la configuration publique ; null si elle manque ou n'est pas un nom d'hôte. */
export function siteHost(value: string | undefined): string | null {
  const host = (value ?? '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}
