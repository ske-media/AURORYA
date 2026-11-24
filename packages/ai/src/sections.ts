// Faits candidats de chaque section de la lecture complète (SPEC §7.4, §14.4).
import { type ChartPayload, type KbEntry, type Locale, type Result, type SectionKey, type SectionOutput, SectionOutputSchema, type ToneMode, err, ok } from '@aurorya/shared';
import type { Fact } from './facts/facts';
import { type ScoredFact, scoreFacts } from './facts/salience';
import { applyTypography } from './typography';

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

/** Version du gabarit de repli : entre dans la clé de cache des sections écrites sans LLM (ADR-021). */
export const SECTION_FALLBACK_VERSION = 'kb-1';
const MAX_SECTION_PARAGRAPHS = 4;

/**
 * Section écrite sans LLM (SPEC §14.9) : le résumé, dans le mode demandé, des faits les plus saillants de la section.
 * Un seul fait documenté : son essence fait le second paragraphe. Aucun : la section est indisponible.
 */
export function fallbackSection(
  ctx: Readonly<{ chart: ChartPayload; mode: ToneMode; locale: Locale; kb: (key: string) => KbEntry | null }>,
  key: SectionKey,
): Result<SectionOutput, { code: 'KB_MISSING'; detail: string }> {
  const paragraphs: string[] = [];
  const anchors: string[] = [];
  const seen = new Set<string>();
  let firstEssence: string | null = null;
  for (const { fact } of sectionFacts(ctx.chart, key, (kbKey) => ctx.kb(kbKey)?.roastWeight ?? 0)) {
    if (paragraphs.length === MAX_SECTION_PARAGRAPHS) break;
    const entry = ctx.kb(fact.kbKey);
    // Deux faits peuvent partager une fiche : jamais deux fois le même texte.
    const text = entry?.summary[ctx.mode];
    if (!entry || text === undefined || seen.has(fact.kbKey) || paragraphs.includes(text)) continue;
    seen.add(fact.kbKey);
    firstEssence ??= entry.essence;
    paragraphs.push(text);
    anchors.push(fact.factId);
  }
  if (paragraphs.length === 1 && firstEssence !== null) paragraphs.push(firstEssence);
  if (paragraphs.length < 2) return err({ code: 'KB_MISSING', detail: `section ${key}` });
  return ok(SectionOutputSchema.parse({ paragraphs: paragraphs.map((p) => applyTypography(p, ctx.locale)), anchors }));
}
