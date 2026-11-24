// Seul point d'accès aux fichiers visuels et sonores de l'app (SPEC §17.1). Jamais de chemin littéral ailleurs.
import { type GlyphId, glyphPaths } from './glyphs.generated';
import { type AssetId, assetModules } from './registry.generated';
import { type SvgAssetId, svgSources } from './svg.generated';

export type { AssetId, GlyphId, SvgAssetId };

/** Module du bundler pour une image, un son ou une police. */
export const getAsset = (id: AssetId): number => assetModules[id];

/** Source SVG d'un élément de marque ou d'une icône d'interface. */
export const getSvg = (id: SvgAssetId): string => svgSources[id];

/** Tracé d'un glyphe astrologique, dans un repère 24 × 24. */
export const getGlyphPath = (id: GlyphId): string => glyphPaths[id];
