// Faits candidats de chaque section de la lecture complète (SPEC §7.4, §14.4).
import type { ChartPayload, SectionKey } from '@aurorya/shared';
import type { Fact } from './facts/facts';
import { type ScoredFact, scoreFacts } from './facts/salience';

const MAX_SECTION_FACTS = 8;
const withBody = (body: string) => (f: Fact): boolean => f.kind === 'aspect' && (f.bodies as readonly string[]).includes(body);
const ids = (...list: string[]) => (f: Fact): boolean => list.includes(f.factId);
const tense = (f: Fact): boolean => f.kind === 'aspect' && (f.data.type === 'square' || f.data.type === 'opposition');
const any = (...tests: ((f: Fact) => boolean)[]) => (f: Fact): boolean => tests.some((t) => t(f));

const SECTION_FILTERS: Readonly<Record<SectionKey, (f: Fact) => boolean>> = {
  big_three: any(ids('placement:sun', 'placement:moon', 'angle:asc', 'aspect:sun-moon', 'ruler:chart')),
  love: any(ids('placement:venus', 'placement:mars', 'aspect:venus-mars', 'stellium:house:7', 'angular:venus'), withBody('venus')),
  mind: any(ids('placement:mercury', 'stellium:house:3', 'retrograde:mercury', 'angular:mercury'), withBody('mercury')),
  drive: any(ids('placement:mars', 'placement:saturn', 'angle:mc', 'stellium:house:6', 'stellium:house:10', 'angular:mars', 'angular:saturn', 'aspect:mars-saturn')),
  inner_world: any(ids('placement:moon', 'stellium:house:4', 'stellium:house:12', 'angular:moon'), withBody('moon')),
  growth: any(ids('placement:jupiter', 'placement:saturn', 'placement:north_node', 'aspect:jupiter-saturn', 'angular:jupiter')),
  shadow: any(ids('placement:pluto', 'stellium:house:8', 'angular:pluto'), tense),
  synthesis: (f) => f.kind === 'dominant' || f.kind === 'stellium' || f.kind === 'ruler' || f.kind === 'angular',
};

/** Faits d'une section, filtrés par ce qui existe dans le thème, les plus saillants d'abord, huit au plus. */
export function sectionFacts(chart: ChartPayload, key: SectionKey, roastWeightOf: (kbKey: string) => number): ScoredFact[] {
  return scoreFacts(chart, roastWeightOf)
    .map((s, index) => ({ ...s, index }))
    .filter((s) => SECTION_FILTERS[key](s.fact))
    .sort((a, b) => b.salience - a.salience || a.index - b.index)
    .slice(0, MAX_SECTION_FACTS)
    .map(({ fact, salience }) => ({ fact, salience }));
}
