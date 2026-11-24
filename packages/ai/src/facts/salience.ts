// Sélection déterministe des faits du roast (SPEC §14.4). Le choix de ce dont on parle
// n'est jamais laissé au LLM seul.
import type { ChartPayload, LabelBodyId } from '@aurorya/shared';
import { type Fact, chartFacts } from './facts';

const BASE_WEIGHT: Readonly<Record<LabelBodyId, number>> = {
  sun: 5, moon: 5, asc: 5, mercury: 4, venus: 4, mars: 4, mc: 3,
  jupiter: 2, saturn: 2, uranus: 1, neptune: 1, pluto: 1, north_node: 1,
};
const BIG_THREE: readonly string[] = ['placement:sun', 'placement:moon', 'angle:asc'];
export const ROAST_SHEET_SIZE = 6;
const MAX_FACTS_PER_BODY = 2;

export type ScoredFact = Readonly<{ fact: Fact; salience: number }>;

/** `roastWeightOf` lit le champ roastWeight (0 à 3) de la base de règles ; 0 si l'entrée manque. */
export function scoreFacts(chart: ChartPayload, roastWeightOf: (kbKey: string) => number): ScoredFact[] {
  const angular = new Set<string>(chart.dominants.angular);
  const inStellium = new Set<string>(chart.dominants.stelliums.flatMap((s) => s.bodies));
  const ruler = chart.dominants.chartRuler?.modern ?? null;
  return chartFacts(chart).map((fact) => {
    const weights = fact.bodies.map((b) => BASE_WEIGHT[b]);
    const base = fact.kind === 'dominant' || fact.kind === 'stellium' || weights.length === 0
      ? 3
      : weights.reduce((a, b) => a + b, 0) / weights.length;
    let salience = base;
    if (fact.kind !== 'stellium' && fact.kind !== 'dominant') {
      if (fact.bodies.some((b) => angular.has(b))) salience += 3;
      if (fact.bodies.some((b) => inStellium.has(b))) salience += 2;
      if (ruler !== null && fact.bodies.includes(ruler)) salience += 2;
    }
    if (fact.kind === 'aspect' && fact.orb !== null && fact.orb < 3) salience += 3 - fact.orb;
    salience += roastWeightOf(fact.kbKey);
    return { fact, salience: Math.round(salience * 1e4) / 1e4 };
  });
}

/** Les six faits de la fiche du roast : au moins un du Big Three, deux faits au plus par corps. */
export function selectRoastFacts(chart: ChartPayload, roastWeightOf: (kbKey: string) => number): ScoredFact[] {
  const scored = scoreFacts(chart, roastWeightOf);
  // Tri stable : à égalité, l'ordre canonique de construction des faits départage.
  const ranked = scored.map((s, index) => ({ ...s, index })).sort((a, b) => b.salience - a.salience || a.index - b.index);
  const perBody = new Map<string, number>();
  const selected: typeof ranked = [];
  for (const candidate of ranked) {
    if (selected.length === ROAST_SHEET_SIZE) break;
    if (candidate.fact.bodies.some((b) => (perBody.get(b) ?? 0) >= MAX_FACTS_PER_BODY)) continue;
    for (const b of candidate.fact.bodies) perBody.set(b, (perBody.get(b) ?? 0) + 1);
    selected.push(candidate);
  }
  if (!selected.some((s) => BIG_THREE.includes(s.fact.factId))) {
    const bigThree = ranked.find((s) => BIG_THREE.includes(s.fact.factId));
    if (bigThree) selected[selected.length === ROAST_SHEET_SIZE ? ROAST_SHEET_SIZE - 1 : selected.length] = bigThree;
  }
  return selected.map(({ fact, salience }) => ({ fact, salience }));
}
