// Attribution déterministe des rôles et choix des duos (SPEC §14.6, Annexe B). Aucun LLM ici :
// à thèmes donnés, rôles et duos sont fixes.
import {
  ASPECT_IDS, type ChartPayload, ELEMENTS, type FactId, GROUP_TYPES, type GroupType, MODALITIES, PLANET_IDS, SIGN_IDS, TONE_MODES,
} from '@aurorya/shared';
import { z } from 'zod';

const planet = z.enum(PLANET_IDS);
const CriterionSchema = z.discriminatedUnion('predicate', [
  z.strictObject({ predicate: z.literal('in_sign'), bodies: z.array(z.enum([...PLANET_IDS, 'asc'])).min(1), signs: z.array(z.enum(SIGN_IDS)).min(1), weight: z.number().int().positive() }),
  z.strictObject({ predicate: z.literal('in_house'), bodies: z.array(planet).min(1), houses: z.array(z.number().int().min(1).max(12)).min(1), weight: z.number().int().positive() }),
  z.strictObject({ predicate: z.literal('angular'), body: planet, weight: z.number().int().positive() }),
  z.strictObject({ predicate: z.literal('dominant'), key: z.enum([...ELEMENTS, ...MODALITIES]), weight: z.number().int().positive() }),
  z.strictObject({ predicate: z.literal('stellium'), kind: z.enum(['sign', 'house']), key: z.string(), weight: z.number().int().positive() }),
  z.strictObject({ predicate: z.literal('aspect'), a: planet, b: planet, types: z.array(z.enum(ASPECT_IDS)).min(1), weight: z.number().int().positive() }),
]);
export type Criterion = z.infer<typeof CriterionSchema>;

const genderLabels = z.strictObject({ f: z.string().min(1), m: z.string().min(1), n: z.string().min(1) });
const RoleSchema = z.strictObject({
  id: z.string().regex(/^[a-z_]+$/),
  labels: z.strictObject({ fr: genderLabels.nullable(), en: genderLabels.nullable() }),
  /** Phrase type de repli par mode ; null tant qu'elle n'est pas rédigée. */
  fallbackLine: z.strictObject(Object.fromEntries(TONE_MODES.map((m) => [m, z.string().min(1)])) as Record<(typeof TONE_MODES)[number], z.ZodString>).nullable(),
  criteria: z.array(CriterionSchema).min(1),
});
export type Role = z.infer<typeof RoleSchema>;

export const RoleCatalogSchema = z.strictObject({
  version: z.string(),
  status: z.enum(['draft', 'approved']),
  notes: z.string(),
  types: z.strictObject(Object.fromEntries(GROUP_TYPES.map((t) => [t, z.array(RoleSchema).min(6)])) as Record<GroupType, z.ZodArray<typeof RoleSchema>>),
});
export type RoleCatalog = z.infer<typeof RoleCatalogSchema>;

const strictMax = (counts: Record<string, number>): string | null => {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [first, second] = sorted;
  return first && (!second || first[1] > second[1]) ? first[0] : null;
};

/** Faits du thème qui satisfont un critère ; liste vide si le critère n'est pas rempli ou n'est pas évaluable. */
export function criterionAnchors(chart: ChartPayload, criterion: Criterion): FactId[] {
  const body = (id: string) => chart.bodies.find((b) => b.id === id && !b.signUncertain);
  switch (criterion.predicate) {
    case 'in_sign':
      return criterion.bodies.flatMap((id) => {
        if (id === 'asc') return chart.angles && criterion.signs.includes(chart.angles.asc.sign) ? ['angle:asc'] : [];
        const b = body(id);
        return b && criterion.signs.includes(b.sign) ? [`placement:${id}`] : [];
      });
    case 'in_house':
      return criterion.bodies.flatMap((id) => {
        const b = body(id);
        return b && b.house !== null && criterion.houses.includes(b.house) ? [`placement:${id}`] : [];
      });
    case 'angular':
      return chart.dominants.angular.includes(criterion.body) ? [`angular:${criterion.body}`] : [];
    case 'dominant': {
      const isElement = (ELEMENTS as readonly string[]).includes(criterion.key);
      const dominant = strictMax(isElement ? chart.dominants.elements : chart.dominants.modalities);
      return dominant === criterion.key ? [`dominant:${isElement ? 'element' : 'modality'}:${criterion.key}`] : [];
    }
    case 'stellium':
      return chart.dominants.stelliums.some((s) => s.kind === criterion.kind && s.key === criterion.key) ? [`stellium:${criterion.kind}:${criterion.key}`] : [];
    case 'aspect': {
      const hit = chart.aspects.find((a) => ((a.a === criterion.a && a.b === criterion.b) || (a.a === criterion.b && a.b === criterion.a)) && criterion.types.includes(a.type));
      return hit ? [`aspect:${hit.a}-${hit.b}`] : [];
    }
  }
}

export type RoleScore = Readonly<{ score: number; anchors: FactId[] }>;
export const scoreRole = (chart: ChartPayload, role: Role): RoleScore => {
  let score = 0;
  const anchors: FactId[] = [];
  for (const criterion of role.criteria) {
    const found = criterionAnchors(chart, criterion);
    if (found.length > 0) {
      score += criterion.weight;
      anchors.push(...found);
    }
  }
  return { score, anchors: [...new Set(anchors)] };
};

export type RoleAssignment = Readonly<{ memberIndex: number; roleId: string; score: number; anchors: FactId[] }>;

/**
 * Affecte un rôle différent à chaque membre en maximisant le total des scores. Recherche exacte par
 * programmation dynamique sur les sous-ensembles de rôles (8 membres et 10 rôles au plus), équivalente à
 * l'algorithme hongrois. Départage : les membres sont pris par ancienneté (ordre du tableau), et à total
 * égal le membre le plus ancien reçoit le rôle au plus petit identifiant alphabétique.
 */
export function assignRoles(charts: readonly ChartPayload[], roles: readonly Role[]): RoleAssignment[] {
  if (charts.length > roles.length) throw new Error(`Pas assez de rôles (${roles.length}) pour ${charts.length} membres`);
  const sorted = [...roles].sort((a, b) => (a.id < b.id ? -1 : 1));
  const scores = charts.map((chart) => sorted.map((role) => scoreRole(chart, role)));
  const memo = new Map<string, number>();
  const best = (member: number, used: number): number => {
    if (member === charts.length) return 0;
    const key = `${member}:${used}`;
    const known = memo.get(key);
    if (known !== undefined) return known;
    let top = -1;
    for (let r = 0; r < sorted.length; r += 1) {
      if (used & (1 << r)) continue;
      top = Math.max(top, (scores[member]?.[r]?.score ?? 0) + best(member + 1, used | (1 << r)));
    }
    memo.set(key, top);
    return top;
  };
  const result: RoleAssignment[] = [];
  let used = 0;
  for (let member = 0; member < charts.length; member += 1) {
    const target = best(member, used);
    for (let r = 0; r < sorted.length; r += 1) {
      if (used & (1 << r)) continue;
      const cell = scores[member]?.[r];
      const role = sorted[r];
      if (cell && role && cell.score + best(member + 1, used | (1 << r)) === target) {
        result.push({ memberIndex: member, roleId: role.id, score: cell.score, anchors: cell.anchors });
        used |= 1 << r;
        break;
      }
    }
  }
  return result;
}

export type PairScore = Readonly<{ a: number; b: number; harmony: number; tension: number }>;
export type Duos = Readonly<{ fusion: PairScore; sparks: PairScore }>;

/**
 * Duo le plus harmonieux et duo le plus tendu (SPEC §14.6). Avec trois membres ou plus, les deux duos
 * diffèrent ; à deux, ils portent sur la même paire. À égalité, la première paire dans l'ordre d'ancienneté gagne.
 */
export function pickDuos(pairs: readonly PairScore[]): Duos {
  const [first] = pairs;
  if (!first) throw new Error('Au moins une paire est nécessaire');
  const top = (list: readonly PairScore[], key: 'harmony' | 'tension'): PairScore =>
    list.reduce((bestSoFar, pair) => (pair[key] > bestSoFar[key] ? pair : bestSoFar), list[0] ?? first);
  const fusion = top(pairs, 'harmony');
  const others = pairs.filter((p) => p !== fusion);
  return { fusion, sparks: others.length > 0 ? top(others, 'tension') : fusion };
}
