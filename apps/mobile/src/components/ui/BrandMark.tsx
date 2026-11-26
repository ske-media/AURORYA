// Symbole Aurorya, dessiné à partir de sa géométrie canonique : il se trace à l'apparition (Annexe C.5).
// Aucun halo autour du symbole : l'Annexe C.4 interdit de lui ajouter une lueur.
import { AuroraRise } from '@/components/astro/AuroraRise';

export function BrandMark({ size }: { size: number }) {
  return <AuroraRise stage={4} size={size} />;
}
