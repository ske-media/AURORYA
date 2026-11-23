import { describe, expect, it } from 'vitest';
import {
  ASPECT_ANGLES, ASPECT_IDS, BODY_IDS, ELEMENTS, MODALITIES, PLANET_IDS, SIGN_IDS,
  houseToRoman, signElement, signFromLongitude, signModality,
} from './index';

describe('identifiants canoniques (SPEC §3)', () => {
  it('compte dix planètes, treize corps et douze signes, sans doublon', () => {
    expect(PLANET_IDS).toHaveLength(10);
    expect(BODY_IDS).toHaveLength(13);
    expect(new Set(BODY_IDS).size).toBe(13);
    expect(SIGN_IDS).toHaveLength(12);
    expect(new Set(SIGN_IDS).size).toBe(12);
  });

  it('répartit trois signes par élément et quatre par modalité', () => {
    for (const element of ELEMENTS) {
      expect(SIGN_IDS.filter((s) => signElement(s) === element)).toHaveLength(3);
    }
    for (const modality of MODALITIES) {
      expect(SIGN_IDS.filter((s) => signModality(s) === modality)).toHaveLength(4);
    }
  });

  it('classe les signes de référence', () => {
    expect([signElement('aries'), signModality('aries')]).toEqual(['fire', 'cardinal']);
    expect([signElement('scorpio'), signModality('scorpio')]).toEqual(['water', 'fixed']);
    expect([signElement('virgo'), signModality('virgo')]).toEqual(['earth', 'mutable']);
    expect([signElement('aquarius'), signModality('aquarius')]).toEqual(['air', 'fixed']);
  });

  it('convertit une longitude en signe, bornes comprises', () => {
    expect(signFromLongitude(0)).toBe('aries');
    expect(signFromLongitude(29.9999)).toBe('aries');
    expect(signFromLongitude(30)).toBe('taurus');
    expect(signFromLongitude(359.9999)).toBe('pisces');
    expect(signFromLongitude(360)).toBe('aries');
    expect(signFromLongitude(-1)).toBe('pisces');
    expect(() => signFromLongitude(Number.NaN)).toThrow();
  });

  it('associe un angle à chaque aspect', () => {
    expect(ASPECT_IDS.map((id) => ASPECT_ANGLES[id])).toEqual([0, 180, 120, 90, 60]);
  });

  it('écrit les maisons en chiffres romains', () => {
    expect(houseToRoman(1)).toBe('I');
    expect(houseToRoman(8)).toBe('VIII');
    expect(houseToRoman(12)).toBe('XII');
  });
});
