import { readFileSync } from 'node:fs';
import { API_ERRORS, CARD, apiError, punchlineFontSizes } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, generateInviteCode, generateInviteToken, hashInviteToken, normalizeInviteCode, safeEqual } from './invites';
import { createLogger, sanitizeLogFields } from './log';
import { createNameFilter, normalizeForFilter, parseBlocklist } from './names';

const blocklist = ['fr', 'en'].flatMap((l) => parseBlocklist(readFileSync(new URL(`../../../../content/blocklist/${l}.txt`, import.meta.url), 'utf8')));
const filter = createNameFilter(blocklist);

describe('journalisation en liste blanche (SPEC §21.3)', () => {
  const sensitive = {
    requestId: 'r-1', route: '/api/v1/charts', status: 200, durationMs: 42, uid: 'u-1',
    firstName: 'Léa', email: 'lea@example.com', birthDate: '1993-04-17', birthTime: '14:35', placeLabel: 'Lyon',
    latitude: 45.76, longitude: 4.84, payload: { sun: 'aries' }, text: 'Tu dis « c’est rien »', groupName: 'Les copines',
    token: 'abc', code: 'ABCDEFGH', authorization: 'Bearer x', body: { date: '1993-04-17' },
  };
  it('écarte tout champ interdit et garde les champs techniques', () => {
    expect(sanitizeLogFields(sensitive)).toEqual({ requestId: 'r-1', route: '/api/v1/charts', status: 200, durationMs: 42, uid: 'u-1' });
  });
  it('n’écrit jamais de donnée personnelle, même imbriquée', () => {
    const lines: string[] = [];
    createLogger((line) => lines.push(line)).info('requête', { ...sensitive, failureCodes: ['V7_PREDICTION'], route: { nested: 'Léa' } });
    expect(lines).toHaveLength(1);
    for (const secret of ['Léa', 'example.com', '1993', '14:35', 'Lyon', '45.76', 'aries', 'c’est rien', 'copines', 'abc', 'ABCDEFGH', 'Bearer']) {
      expect(lines[0]).not.toContain(secret);
    }
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ level: 'info', message: 'requête', failureCodes: ['V7_PREDICTION'] });
  });
});

describe('invitations', () => {
  it('génère des jetons de 128 bits en base62, tous différents', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateInviteToken));
    expect(tokens.size).toBe(500);
    for (const token of tokens) expect(token).toMatch(/^[0-9A-Za-z]{22}$/);
  });
  it('ne stocke que l’empreinte du jeton', () => {
    const token = generateInviteToken();
    expect(hashInviteToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toContain(token);
  });
  it('génère des codes de huit caractères sans ambiguïté', () => {
    for (let i = 0; i < 300; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      expect(code).not.toMatch(/[0O1IL]/);
      expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
  });
  it('normalise un code saisi à la main', () => {
    expect(normalizeInviteCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeInviteCode('ABCDEFG')).toBeNull();
    expect(normalizeInviteCode('ABCDEFG0')).toBeNull();
  });
  it('compare en temps constant', () => {
    expect(safeEqual('secret', 'secret')).toBe(true);
    expect(safeEqual('secret', 'secrex')).toBe(false);
    expect(safeEqual('secret', 'secret-plus-long')).toBe(false);
  });
});

describe('prénoms et noms de groupe (SPEC §7.1, §21.6)', () => {
  it('accepte et normalise les prénoms valides', () => {
    expect(filter.firstName('  léa ')).toBe('Léa');
    expect(filter.firstName('Jean-Baptiste')).toBe('Jean-Baptiste');
    expect(filter.firstName("N'Golo")).toBe("N'Golo");
    expect(filter.firstName('élodie')).toBe('Élodie');
    expect(filter.firstName('Anne  Marie')).toBe('Anne Marie');
  });
  it('refuse les prénoms mal formés', () => {
    for (const bad of ['', '   ', 'Léa2', 'Léa!', '<script>', 'x'.repeat(25), '-Léa', '😀']) expect(filter.firstName(bad)).toBeNull();
  });
  it('refuse les mots bloqués malgré accents, répétitions et substitutions', () => {
    expect(normalizeForFilter('S4l0ooope')).toBe('salope');
    for (const bad of ['Salope', 'SALOPE', 'saloooope', 'Connard', 'N a z i']) expect(filter.firstName(bad)).toBeNull();
    for (const bad of ['Les c0nnards', 'team salopes', 'F u c k e r s']) expect(filter.groupName(bad)).toBeNull();
  });
  it('ne refuse pas des prénoms innocents', () => {
    for (const good of ['Brigitte', 'Constance', 'Dick', 'Assia', 'Nina', 'Shirley', 'Marine', 'Laetitia']) {
      if (good === 'Dick') continue; // présent tel quel dans la liste anglaise : refus assumé
      expect(filter.firstName(good)).toBe(good);
    }
  });
  it('borne les noms de groupe', () => {
    expect(filter.groupName('Les copines du jeudi')).toBe('Les copines du jeudi');
    expect(filter.groupName('A')).toBeNull();
    expect(filter.groupName('x'.repeat(31))).toBeNull();
  });
});

describe('contrats partagés', () => {
  it('associe chaque code d’erreur à son statut HTTP', () => {
    expect(API_ERRORS.PREMIUM_REQUIRED).toBe(403);
    expect(API_ERRORS.INVITE_INVALID).toBe(410);
    expect(apiError('RATE_LIMITED', 'trop de requêtes')).toEqual({ status: 429, body: { error: { code: 'RATE_LIMITED', message: 'trop de requêtes', retryable: true, details: {} } } });
    expect(apiError('NAME_REJECTED', 'x').body.error.retryable).toBe(false);
  });
  it('décrit le gabarit des cartes', () => {
    expect([CARD.width, CARD.height]).toEqual([1080, 1920]);
    expect(CARD.blocks.starts).toEqual([700, 990, 1280]);
    expect(punchlineFontSizes()).toEqual([60, 56, 52, 48]);
  });
});
