// Mémoïsation en mémoire, bornée, pour les calculs purs partagés par toutes les utilisatrices
// (ciel du jour). Une instance de fonction serveur garde ses résultats tant qu'elle vit ; au-delà de
// `max` entrées, la plus ancienne est oubliée. Rien de personnel n'y est jamais rangé.
export function memoize<A extends string, R>(compute: (key: A) => R, max = 64): ((key: A) => R) & { size: () => number } {
  const cache = new Map<A, R>();
  const get = (key: A): R => {
    const hit = cache.get(key);
    if (hit !== undefined) {
      // Rafraîchit l'ordre : l'entrée devient la plus récente.
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const value = compute(key);
    cache.set(key, value);
    if (cache.size > max) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return value;
  };
  return Object.assign(get, { size: () => cache.size });
}
