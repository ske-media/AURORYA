// Faits : tout ce que le LLM peut affirmer d'astrologique (SPEC §14.2). Construits à partir du
// thème calculé par le moteur ; ce paquet ne fait aucun calcul astronomique.
import {
  type AspectId, type ChartPayload, type Element, type FactId, type House, type LabelBodyId, type Locale,
  type Modality, type SignId, BODY_NAMES, SIGN_NAMES, formatAspect, formatHouse, formatPlacement,
} from '@aurorya/shared';

/** Notion astrologique qu'un fait autorise à citer dans un texte (contrôle V3). */
export type Mention =
  | `body:${LabelBodyId}` | `sign:${SignId}` | `house:${number}` | `aspect:${AspectId}` | 'retrograde';

export type Fact = Readonly<{
  factId: FactId;
  kind: 'placement' | 'angle' | 'aspect' | 'dominant' | 'stellium' | 'ruler' | 'angular' | 'retrograde';
  /** Corps concernés, pour la règle « pas plus de deux faits par corps » et la couverture des ancres. */
  bodies: readonly LabelBodyId[];
  /** Clé de l'entrée correspondante dans la base de règles (SPEC §14.3). */
  kbKey: string;
  mentions: readonly Mention[];
  /** Orbe en degrés, pour un aspect. */
  orb: number | null;
  data: Readonly<Record<string, string | number | boolean | null>>;
}>;

const ELEMENT_NAMES: Record<Locale, Record<Element, string>> = {
  fr: { fire: 'Feu', earth: 'Terre', air: 'Air', water: 'Eau' },
  en: { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water' },
};
const MODALITY_NAMES: Record<Locale, Record<Modality, string>> = {
  fr: { cardinal: 'cardinale', fixed: 'fixe', mutable: 'mutable' },
  en: { cardinal: 'cardinal', fixed: 'fixed', mutable: 'mutable' },
};

/** Élément ou modalité strictement dominant, ou null en cas d'égalité. */
const strictMax = <K extends string>(counts: Partial<Record<K, number>>): K | null => {
  const sorted = (Object.entries(counts) as [K, number][]).sort((a, b) => b[1] - a[1]);
  const [first, second] = sorted;
  return first && (!second || first[1] > second[1]) ? first[0] : null;
};

/** Tous les faits d'un thème, dans l'ordre canonique (qui sert de départage). */
export function chartFacts(chart: ChartPayload): Fact[] {
  const facts: Fact[] = [];
  const bodyById = new Map(chart.bodies.map((b) => [b.id as string, b]));
  for (const b of chart.bodies) {
    if (b.signUncertain) continue;
    facts.push({
      factId: `placement:${b.id}`, kind: 'placement', bodies: [b.id], kbKey: `planet_sign:${b.id}:${b.sign}`,
      mentions: [`body:${b.id}`, `sign:${b.sign}`, ...(b.house ? [`house:${b.house}` as const] : []), ...(b.retrograde ? ['retrograde' as const] : [])],
      orb: null, data: { body: b.id, sign: b.sign, house: b.house, degree: b.degree, minute: b.minute, retrograde: b.retrograde },
    });
  }
  if (chart.angles) {
    for (const id of ['asc', 'mc'] as const) {
      const sign = chart.angles[id].sign;
      facts.push({ factId: `angle:${id}`, kind: 'angle', bodies: [id], kbKey: `${id}_sign:${sign}`, mentions: [`body:${id}`, `sign:${sign}`], orb: null, data: { body: id, sign } });
    }
  }
  for (const a of chart.aspects) {
    if (a.a === 'asc' || a.a === 'mc' || a.b === 'asc' || a.b === 'mc') continue;
    facts.push({
      factId: `aspect:${a.a}-${a.b}`, kind: 'aspect', bodies: [a.a, a.b], kbKey: `aspect:${a.a}:${a.b}:${a.type}`,
      mentions: [`body:${a.a}`, `body:${a.b}`, `aspect:${a.type}`], orb: a.orb, data: { a: a.a, b: a.b, type: a.type, orb: a.orb, applying: a.applying },
    });
  }
  const element = strictMax(chart.dominants.elements);
  if (element) facts.push({ factId: `dominant:element:${element}`, kind: 'dominant', bodies: [], kbKey: `element_dominant:${element}`, mentions: [], orb: null, data: { element } });
  const modality = strictMax(chart.dominants.modalities);
  if (modality) facts.push({ factId: `dominant:modality:${modality}`, kind: 'dominant', bodies: [], kbKey: `modality_dominant:${modality}`, mentions: [], orb: null, data: { modality } });
  for (const s of chart.dominants.stelliums) {
    facts.push({
      factId: `stellium:${s.kind}:${s.key}`, kind: 'stellium', bodies: s.bodies, kbKey: `stellium_${s.kind}:${s.key}`,
      mentions: [...s.bodies.map((b) => `body:${b}` as const), s.kind === 'sign' ? (`sign:${s.key as SignId}` as const) : (`house:${Number(s.key)}` as const)],
      orb: null, data: { kind: s.kind, key: s.key, bodies: s.bodies.join(',') },
    });
  }
  if (chart.dominants.chartRuler && chart.angles) {
    const ruler = chart.dominants.chartRuler.modern;
    const placed = bodyById.get(ruler);
    facts.push({
      factId: 'ruler:chart', kind: 'ruler', bodies: [ruler], kbKey: placed ? `planet_sign:${ruler}:${placed.sign}` : `planet_sign:${ruler}:aries`,
      mentions: [`body:${ruler}`, 'body:asc', `sign:${chart.angles.asc.sign}`, ...(placed ? [`sign:${placed.sign}` as const] : [])],
      orb: null, data: { ruler, ascSign: chart.angles.asc.sign, rulerSign: placed?.sign ?? null },
    });
  }
  for (const id of chart.dominants.angular) facts.push({ factId: `angular:${id}`, kind: 'angular', bodies: [id], kbKey: `angular:${id}`, mentions: [`body:${id}`], orb: null, data: { body: id } });
  for (const id of chart.dominants.retrogrades) {
    if (id === 'sun' || id === 'moon') continue;
    facts.push({ factId: `retrograde:${id}`, kind: 'retrograde', bodies: [id], kbKey: `retrograde:${id}`, mentions: [`body:${id}`, 'retrograde'], orb: null, data: { body: id } });
  }
  return facts;
}

/** Libellé d'un fait, rédigé par le code dans la langue voulue. */
export function factLabel(fact: Fact, locale: Locale): string {
  const d = fact.data;
  const fr = locale === 'fr';
  switch (fact.kind) {
    case 'placement':
      return formatPlacement(locale, d.body as LabelBodyId, d.sign as SignId, (d.house as House | null) ?? null) + (d.retrograde ? (fr ? ', rétrograde' : ', retrograde') : '');
    case 'angle':
      return formatPlacement(locale, d.body as LabelBodyId, d.sign as SignId, null);
    case 'aspect':
      return formatAspect(locale, d.a as LabelBodyId, d.b as LabelBodyId, d.type as AspectId);
    case 'dominant':
      if (d.element) return fr ? `Dominante ${ELEMENT_NAMES.fr[d.element as Element]}` : `${ELEMENT_NAMES.en[d.element as Element]} dominant`;
      return fr ? `Dominante ${MODALITY_NAMES.fr[d.modality as Modality]}` : `${MODALITY_NAMES.en[d.modality as Modality]} dominant`;
    case 'stellium': {
      const where = d.kind === 'sign' ? SIGN_NAMES[locale][d.key as SignId] : formatHouse(locale, Number(d.key) as House);
      return fr ? `Stellium en ${where}` : `Stellium in ${where}`;
    }
    case 'ruler':
      return fr ? `${BODY_NAMES.fr[d.ruler as LabelBodyId]}, maître de l’Ascendant` : `${BODY_NAMES.en[d.ruler as LabelBodyId]}, chart ruler`;
    case 'angular':
      return fr ? `${BODY_NAMES.fr[d.body as LabelBodyId]} angulaire` : `Angular ${BODY_NAMES.en[d.body as LabelBodyId]}`;
    case 'retrograde':
      return fr ? `${BODY_NAMES.fr[d.body as LabelBodyId]} rétrograde` : `${BODY_NAMES.en[d.body as LabelBodyId]} retrograde`;
  }
}
