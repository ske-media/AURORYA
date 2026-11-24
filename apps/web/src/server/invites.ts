// Jetons et codes d'invitation (SPEC §7.6, §13.4, §21.1).
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** Alphabet sans ambiguïté : pas de 0, O, 1, I, L. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;
export const INVITE_TTL_DAYS = 14;

/** Jeton de 128 bits aléatoires, encodé en base62. Renvoyé une seule fois ; seule son empreinte est stockée. */
export function generateInviteToken(): string {
  let value = BigInt(`0x${randomBytes(16).toString('hex')}`);
  let out = '';
  for (let i = 0; i < 22; i += 1) {
    out = BASE62[Number(value % 62n)] + out;
    value /= 62n;
  }
  return out;
}

export const hashInviteToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Normalise un code saisi à la main : majuscules, sans espaces ni tirets. Null s'il est mal formé. */
export function normalizeInviteCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

/** Comparaison en temps constant (jetons, secrets de webhook et de tâches planifiées). */
export function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}
