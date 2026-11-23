// Seul point d'accès aux fichiers visuels du site (SPEC §17.1).
import { type WebAssetId, assetUrls } from './assets.generated';

export type { WebAssetId };

/** URL publique d'un fichier du registre, relative à la racine du site. */
export const assetUrl = (id: WebAssetId): string => assetUrls[id];
