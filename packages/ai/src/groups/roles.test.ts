import { type ChartPayload, ChartPayloadSchema } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import catalogJson from '../../../../content/roles/roles.v1.json';
import exactJson from '../__fixtures__/chart-exact.json';
import unknownJson from '../__fixtures__/chart-unknown-time.json';
import { checkText } from '../validation/checks';
import { type Role, RoleCatalogSchema, assignRoles, criterionAnchors, pickDuos, scoreRole } from './roles';

const catalog = RoleCatalogSchema.parse(catalogJson);
const exact: ChartPayload = ChartPayloadSchema.parse(exactJson);
const unknown: ChartPayload = ChartPayloadSchema.parse(unknownJson);
const role = (id: string): Role => {
  const found = catalog.types.friends.find((r) => r.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('catalogue des rôles (Annexe B)', () => {
  it('est valide, avec huit rôles par type et six pour le couple', () => {
    expect(catalog.types.friends).toHaveLength(10);
    expect(catalog.types.couple).toHaveLength(6);
    expect(catalog.types.family).toHaveLength(8);
    expect(catalog.types.colleagues).toHaveLength(8);
    for (const roles of Object.values(catalog.types)) expect(new Set(roles.map((r) => r.id)).size).toBe(roles.length);
  });
});

describe('critères', () => {
  // Thème de test : Soleil, Mercure, Vénus en Bélier ; Lune en Poissons, maison VII ; Ascendant Lion ;
  // Saturne angulaire ; dominantes feu et cardinale ; stellium en Bélier.
  it('évalue chaque prédicat et renvoie les faits qui le satisfont', () => {
    expect(criterionAnchors(exact, { predicate: 'in_sign', bodies: ['sun', 'moon', 'asc'], signs: ['aries', 'leo'], weight: 1 })).toEqual(['placement:sun', 'angle:asc']);
    expect(criterionAnchors(exact, { predicate: 'in_house', bodies: ['moon'], houses: [7], weight: 1 })).toEqual(['placement:moon']);
    expect(criterionAnchors(exact, { predicate: 'angular', body: 'saturn', weight: 1 })).toEqual(['angular:saturn']);
    expect(criterionAnchors(exact, { predicate: 'angular', body: 'mars', weight: 1 })).toEqual([]);
    expect(criterionAnchors(exact, { predicate: 'dominant', key: 'fire', weight: 1 })).toEqual(['dominant:element:fire']);
    expect(criterionAnchors(exact, { predicate: 'dominant', key: 'cardinal', weight: 1 })).toEqual(['dominant:modality:cardinal']);
    expect(criterionAnchors(exact, { predicate: 'dominant', key: 'water', weight: 1 })).toEqual([]);
    expect(criterionAnchors(exact, { predicate: 'stellium', kind: 'sign', key: 'aries', weight: 1 })).toEqual(['stellium:sign:aries']);
    expect(criterionAnchors(exact, { predicate: 'aspect', a: 'mars', b: 'sun', types: ['square'], weight: 1 })).toEqual(['aspect:sun-mars']);
    expect(criterionAnchors(exact, { predicate: 'aspect', a: 'sun', b: 'mars', types: ['trine'], weight: 1 })).toEqual([]);
  });
  it('ignore les critères dépendant de l’heure quand elle manque', () => {
    expect(criterionAnchors(unknown, { predicate: 'in_house', bodies: ['moon'], houses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], weight: 1 })).toEqual([]);
    expect(criterionAnchors(unknown, { predicate: 'angular', body: 'saturn', weight: 1 })).toEqual([]);
    expect(criterionAnchors(unknown, { predicate: 'in_sign', bodies: ['asc'], signs: ['leo'], weight: 1 })).toEqual([]);
  });
  it('additionne les poids des critères remplis', () => {
    // spark : Soleil/Mars/Ascendant en Bélier ou Sagittaire (3) + dominante feu (2) + dominante cardinale (1) ; Mars non angulaire.
    expect(scoreRole(exact, role('spark'))).toEqual({ score: 6, anchors: ['placement:sun', 'dominant:element:fire', 'dominant:modality:cardinal'] });
    expect(scoreRole(exact, role('ghost')).score).toBe(2);
  });
});

describe('affectation', () => {
  const roles = catalog.types.friends;
  it('donne un rôle différent à chacun et maximise le total', () => {
    const charts = [exact, unknown, exact, unknown, exact];
    const result = assignRoles(charts, roles);
    expect(result.map((r) => r.memberIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(result.map((r) => r.roleId)).size).toBe(5);
    // Comparaison à une recherche exhaustive indépendante.
    const scores = charts.map((c) => roles.map((r) => scoreRole(c, r).score));
    let bestTotal = -1;
    const walk = (member: number, used: Set<number>, total: number): void => {
      if (member === charts.length) { bestTotal = Math.max(bestTotal, total); return; }
      for (let r = 0; r < roles.length; r += 1) if (!used.has(r)) { used.add(r); walk(member + 1, used, total + (scores[member]?.[r] ?? 0)); used.delete(r); }
    };
    walk(0, new Set(), 0);
    expect(result.reduce((sum, r) => sum + r.score, 0)).toBe(bestTotal);
  });
  it('est déterministe et départage par ancienneté puis ordre alphabétique', () => {
    const a = assignRoles([exact, exact], roles);
    expect(assignRoles([exact, exact], roles)).toEqual(a);
    const flat: Role[] = ['b_role', 'a_role', 'c_role'].map((id) => ({ id, labels: { fr: null, en: null }, fallbackLine: null, criteria: [{ predicate: 'dominant', key: 'fire', weight: 1 }] }));
    expect(assignRoles([exact, exact], flat).map((r) => r.roleId)).toEqual(['a_role', 'b_role']);
  });
  it('refuse un groupe plus grand que le catalogue', () => {
    expect(() => assignRoles(Array.from({ length: 7 }, () => exact), catalog.types.couple)).toThrow();
  });
});

describe('duos', () => {
  it('choisit le plus harmonieux puis le plus tendu parmi les autres', () => {
    const pairs = [{ a: 0, b: 1, harmony: 5, tension: 9 }, { a: 0, b: 2, harmony: 8, tension: 12 }, { a: 1, b: 2, harmony: 2, tension: 7 }];
    expect(pickDuos(pairs)).toEqual({ fusion: pairs[1], sparks: pairs[0] });
  });
  it('à deux, les deux lectures portent sur la même paire', () => {
    const only = { a: 0, b: 1, harmony: 3, tension: 4 };
    expect(pickDuos([only])).toEqual({ fusion: only, sparks: only });
  });
  it('à égalité, garde la première paire', () => {
    const pairs = [{ a: 0, b: 1, harmony: 5, tension: 1 }, { a: 0, b: 2, harmony: 5, tension: 1 }, { a: 1, b: 2, harmony: 5, tension: 1 }];
    expect(pickDuos(pairs)).toEqual({ fusion: pairs[0], sparks: pairs[1] });
  });
});

describe('contenus du catalogue', () => {
  const all = Object.values(catalog.types).flat();
  const lines = [...all.flatMap((r) => Object.values(r.fallbackLine ?? {})), ...Object.values(catalog.duos).flatMap((d) => Object.values(d.fallbackLine))];
  it('donne à chaque rôle un libellé français et une phrase de repli par mode', () => {
    for (const r of all) {
      expect(r.labels.fr, r.id).not.toBeNull();
      expect(r.fallbackLine, r.id).not.toBeNull();
    }
    expect(lines).toHaveLength((all.length + 2) * 3);
  });
  it('garde des phrases courtes, uniques, sans prédiction, santé ni conseil', () => {
    expect(new Set(lines).size).toBe(lines.length);
    const problems = lines.flatMap((text) => {
      const failures = checkText(text, { field: 'role', locale: 'fr', mode: 'cash', gender: 'n', allowedMentions: new Set(), allowedTokens: [], maxLength: 110 });
      return failures.map((f) => `${text} → ${f.code}:${f.detail}`);
    });
    expect(problems).toEqual([]);
  });
});
