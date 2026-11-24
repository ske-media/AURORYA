// Seule surface publique du moteur (SPEC §11.3). Tout le reste du projet passe par ici.
import type { BirthInput, ChartPayload, Result } from '@aurorya/shared';
import { createAstronomyEngineEphemeris } from './adapters/astronomy-engine-ephemeris';
import { type EngineError, computeChartWith } from './chart';
import type { EngineConfig } from './config';
import type { UtcInstant } from './ports/ephemeris-port';
import { type SkyOfDay, type TransitResult, computeSkyWith, computeTransitsWith } from './transits';

/** Version verrouillée de la bibliothèque d'astronomie (package.json), reportée dans chaque thème. */
export const EPHEMERIS_LIBRARY_VERSION = '2.1.19';
const ephemeris = createAstronomyEngineEphemeris(EPHEMERIS_LIBRARY_VERSION);

export const computeChart = (input: BirthInput, config: EngineConfig): Result<ChartPayload, EngineError> =>
  computeChartWith(ephemeris, input, config);
export const computeTransits = (chart: ChartPayload, at: UtcInstant, config: EngineConfig): TransitResult =>
  computeTransitsWith(ephemeris, chart, at, config);
export const computeSky = (dateUtc: string, config: EngineConfig): SkyOfDay => computeSkyWith(ephemeris, dateUtc, config);

export { ENGINE_VERSION, type EngineError } from './chart';
export { DEFAULT_ENGINE_CONFIG, type EngineConfig } from './config';
export type { UtcInstant } from './ports/ephemeris-port';
export { type BirthInputError, type ResolvedInstant, TZDATA_VERSION, resolveBirthInstant } from './resolve-birth-instant';
export { type SkyOfDay, type SynastryAspect, type SynastryResult, type TransitHit, type TransitResult, computeSynastry, moonPhaseFromElongation } from './transits';
