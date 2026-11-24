import { CARD, CARD_VIEW, type RoastResponse, SECTION_KEYS } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import { buildRoastCard, cardPt, siteHost } from './card-model';

const roast: RoastResponse = {
  readingId: '00000000-0000-4000-8000-000000000001', mode: 'cash', variant: 0, status: 'ok',
  punchlines: [
    { anchor: 'placement:sun', label: 'Soleil en Bélier', text: 'Un.' },
    { anchor: 'placement:moon', label: 'Lune en Scorpion', text: 'Deux.' },
    { anchor: 'angle:asc', label: 'Ascendant Lion', text: 'Trois.' },
  ],
  hooks: Object.fromEntries(SECTION_KEYS.map((k) => [k, 'Accroche.'])) as RoastResponse['hooks'],
};
const texts = { title: (name: string) => `Le ciel de ${name}`, titleAnonymous: 'Mon ciel', modeName: 'Mars', cta: 'Fais le tien' };
const base = { roast, firstName: ' Léa ', hideName: false, bigThree: ['Soleil Bélier', 'Lune Scorpion'], host: null, texts };

describe('carte du roast', () => {
  it('ramène le gabarit 1080 × 1920 à la vue 360 × 640', () => {
    expect(cardPt(CARD.width)).toBe(CARD_VIEW.width);
    expect(cardPt(CARD.height)).toBe(CARD_VIEW.height);
    expect(CARD_VIEW.width * CARD_VIEW.pixelRatio).toBe(CARD.width);
  });
  it('pose le prénom, ou le titre anonyme si elle le masque', () => {
    expect(buildRoastCard(base).title).toBe('Le ciel de Léa');
    expect(buildRoastCard({ ...base, hideName: true }).title).toBe('Mon ciel');
    expect(buildRoastCard({ ...base, firstName: '  ' }).title).toBe('Mon ciel');
  });
  it('ne contient que le titre, le Big Three, trois blocs, le mode et la signature', () => {
    const card = buildRoastCard(base);
    expect(Object.keys(card).sort()).toEqual(['bigThree', 'blocks', 'cta', 'host', 'mode', 'modeName', 'title']);
    expect(card.blocks).toEqual([{ label: 'Soleil en Bélier', text: 'Un.' }, { label: 'Lune en Scorpion', text: 'Deux.' }, { label: 'Ascendant Lion', text: 'Trois.' }]);
    expect(card.bigThree).toBe('Soleil Bélier · Lune Scorpion');
  });
  it('n’affiche un domaine que s’il est configuré', () => {
    expect(siteHost(undefined)).toBeNull();
    expect(siteHost('')).toBeNull();
    expect(siteHost('localhost')).toBeNull();
    expect(siteHost('https://Aurorya.Vercel.app/')).toBe('aurorya.vercel.app');
    expect(siteHost('aurorya.app')).toBe('aurorya.app');
  });
});
