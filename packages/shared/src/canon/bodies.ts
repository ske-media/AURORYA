// Corps et points (SPEC §3.1). Définis une seule fois, ici.

export const PLANET_IDS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
] as const;
export type PlanetId = (typeof PLANET_IDS)[number];

export const POINT_IDS = ['north_node', 'asc', 'mc'] as const;
export type PointId = (typeof POINT_IDS)[number];

/** Ordre canonique : sert notamment à ordonner les paires d'aspects (SPEC §14.2). */
export const BODY_IDS = [...PLANET_IDS, ...POINT_IDS] as const;
export type BodyId = PlanetId | PointId;

/** Corps reportés à la V1.1 (SPEC §3.1). Absents de `BodyId` tant qu'ils ne sont pas calculés. */
export const DEFERRED_BODY_IDS = ['chiron', 'lilith'] as const;

export const isPlanetId = (value: string): value is PlanetId =>
  (PLANET_IDS as readonly string[]).includes(value);
export const isBodyId = (value: string): value is BodyId =>
  (BODY_IDS as readonly string[]).includes(value);
