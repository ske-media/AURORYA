// Contrôles élémentaires V3 à V8 sur un texte (SPEC §14.7). Chaque échec porte un code et un détail
// sans le texte lui-même, pour pouvoir être journalisé.
import type { GrammaticalGender, Locale, ToneMode } from '@aurorya/shared';
import type { Mention } from '../facts/facts';
import { tokensIn } from '../tokens';
import { FORBIDDEN_PATTERNS, FORMAL_FR, GENDERED_FR, INFORMAL_FR, PREDICTION_PATTERNS, astroTerms } from './lexicons';

export type FailureCode =
  | 'V1_SCHEMA' | 'V2_ANCHORS' | 'V3_CLAIMS' | 'V4_TOKENS' | 'V5_FORM' | 'V6_ADDRESS' | 'V7_PREDICTION' | 'V8_FORBIDDEN' | 'V9_JUDGE';
export type Failure = Readonly<{ code: FailureCode; field: string; detail: string }>;

export type TextContext = Readonly<{
  field: string;
  locale: Locale;
  mode: ToneMode;
  gender: GrammaticalGender;
  /** Notions astrologiques autorisées dans ce passage. */
  allowedMentions: ReadonlySet<Mention>;
  allowedTokens: readonly string[];
  minLength?: number;
  maxLength: number;
}>;

const EMOJI = /\p{Extended_Pictographic}/u;
const MARKDOWN = /(\*\*|__|`|^#{1,6}\s|^\s*[-*+]\s|\[[^\]]+\]\([^)]+\)|^>\s)/mu;
const URL = /(https?:\/\/|www\.|\b[\p{L}\d-]+\.(?:com|fr|net|org|app|io)\b)/iu;

export function checkText(text: string, ctx: TextContext): Failure[] {
  const failures: Failure[] = [];
  const fail = (code: FailureCode, detail: string): void => void failures.push({ code, field: ctx.field, detail });
  const plain = text.replace(/'/g, '’');

  // V3 — toute notion astrologique citée doit figurer dans les faits autorisés.
  for (const term of astroTerms(ctx.locale)) {
    term.pattern.lastIndex = 0;
    for (let m = term.pattern.exec(plain); m !== null; m = term.pattern.exec(plain)) {
      const mention = term.mention(m);
      if (mention && !ctx.allowedMentions.has(mention)) fail('V3_CLAIMS', mention);
    }
  }

  // V4 — jetons connus uniquement.
  for (const token of tokensIn(text)) if (!ctx.allowedTokens.includes(token)) fail('V4_TOKENS', 'jeton non autorisé');
  if (/[{}]/.test(text.replace(/\{\{[^}]*\}\}/g, ''))) fail('V4_TOKENS', 'accolade isolée');

  // V5 — forme.
  const length = [...text].length;
  if (length > ctx.maxLength) fail('V5_FORM', `longueur ${length} > ${ctx.maxLength}`);
  if (ctx.minLength !== undefined && length < ctx.minLength) fail('V5_FORM', `longueur ${length} < ${ctx.minLength}`);
  if (EMOJI.test(text)) fail('V5_FORM', 'emoji');
  if (text.includes('#')) fail('V5_FORM', 'hashtag');
  if (MARKDOWN.test(text)) fail('V5_FORM', 'markdown');
  if (URL.test(text)) fail('V5_FORM', 'url');
  if (text !== text.trim() || /^\n|\n$/.test(text)) fail('V5_FORM', 'espace ou retour en bordure');
  // Chiffres admis : degrés (23°14′) et numéros de maison.
  const withoutAllowedDigits = plain.replace(/\d+°(?:\d{1,2}[′’])?/g, '').replace(/maison\s+\d{1,2}/giu, '').replace(/\d{1,2}(?:st|nd|rd|th)\s+house/giu, '');
  if (/\d/.test(withoutAllowedDigits)) fail('V5_FORM', 'chiffre');

  // V6 — adresse et écriture épicène.
  if (ctx.locale === 'fr') {
    if (ctx.mode === 'expert' && INFORMAL_FR.test(plain)) fail('V6_ADDRESS', 'tutoiement en mode expert');
    if (ctx.mode !== 'expert' && FORMAL_FR.test(plain)) fail('V6_ADDRESS', 'vouvoiement hors mode expert');
    if (ctx.gender === 'n' && GENDERED_FR.some((p) => p.test(plain))) fail('V6_ADDRESS', 'forme genrée avec accord neutre');
    if (/\p{L}+·\p{L}+/u.test(plain)) fail('V6_ADDRESS', 'point médian');
  }

  // V7 — pas de prédiction.
  PREDICTION_PATTERNS[ctx.locale].forEach((pattern, index) => {
    if (pattern.test(plain)) fail('V7_PREDICTION', `motif ${index}`);
  });

  // V8 — sujets interdits.
  for (const [topic, pattern] of Object.entries(FORBIDDEN_PATTERNS[ctx.locale])) {
    if (pattern.test(plain)) fail('V8_FORBIDDEN', topic);
  }
  return failures;
}
