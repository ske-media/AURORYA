// Stockage sécurisé par morceaux (SPEC §15.4). Le trousseau iOS limite la taille d'une valeur ; la session
// Supabase la dépasse. Chaque valeur est donc découpée en morceaux, tous chiffrés par le trousseau.
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Taille d'un morceau, en caractères : sous la limite de 2048 octets même avec des caractères accentués. */
export const CHUNK_SIZE = 600;
/** Les clés du trousseau n'acceptent que lettres, chiffres, « . », « - » et « _ ». */
const safeKey = (key: string): string => key.replace(/[^A-Za-z0-9._-]/g, '_');

export function createChunkedStorage(store: KeyValueStore): KeyValueStore {
  const countKey = (key: string): string => `${safeKey(key)}.n`;
  const chunkKey = (key: string, index: number): string => `${safeKey(key)}.${index}`;
  const readCount = async (key: string): Promise<number> => Number((await store.getItem(countKey(key))) ?? 0) || 0;

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await store.getItem(chunkKey(key, i));
        if (part === null) return null; // valeur incomplète : traitée comme absente
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      const previous = await readCount(key);
      const chunks = [...value].reduce<string[]>((list, char) => {
        const last = list[list.length - 1];
        if (last !== undefined && last.length < CHUNK_SIZE) list[list.length - 1] = last + char;
        else list.push(char);
        return list;
      }, []);
      // Le compteur passe à zéro pendant l'écriture : une lecture concurrente voit « absent », jamais un mélange.
      await store.setItem(countKey(key), '0');
      for (let i = 0; i < chunks.length; i += 1) await store.setItem(chunkKey(key, i), chunks[i] ?? '');
      await store.setItem(countKey(key), String(chunks.length));
      for (let i = chunks.length; i < previous; i += 1) await store.removeItem(chunkKey(key, i));
    },
    async removeItem(key) {
      const count = await readCount(key);
      await store.removeItem(countKey(key));
      for (let i = 0; i < count; i += 1) await store.removeItem(chunkKey(key, i));
    },
  };
}
