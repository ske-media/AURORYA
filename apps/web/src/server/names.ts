// Prénoms et noms de groupe : contenus visibles par d'autres personnes (SPEC §7.1, §21.6).
const NAME_PATTERN = /^[\p{L}][\p{L} '’-]*$/u;
const LEET: Readonly<Record<string, string>> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

/** Forme de comparaison : minuscules, sans accents, substitutions courantes défaites, répétitions réduites. */
export const normalizeForFilter = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]+/g, ' ')
    .replace(/(.)\1{2,}/g, '$1')
    .trim();

export function createNameFilter(blocklist: readonly string[]) {
  const blocked = new Set(blocklist.map(normalizeForFilter).filter((w) => w.length > 0));
  const isBlocked = (text: string): boolean => {
    const normalized = normalizeForFilter(text);
    const words = normalized.split(' ');
    const joined = normalized.replaceAll(' ', '');
    return words.some((w) => blocked.has(w)) || blocked.has(joined) || [...blocked].some((b) => b.length >= 5 && joined.includes(b));
  };

  return {
    isBlocked,
    /** Prénom : 1 à 24 caractères, lettres, espaces, tirets, apostrophes ; première lettre en capitale. Null s'il est refusé. */
    firstName(input: string): string | null {
      const trimmed = input.trim().replace(/\s+/g, ' ');
      const length = [...trimmed].length;
      if (length < 1 || length > 24 || !NAME_PATTERN.test(trimmed) || isBlocked(trimmed)) return null;
      return trimmed.charAt(0).toLocaleUpperCase('fr') + trimmed.slice(1);
    },
    /** Nom de groupe : 2 à 30 caractères, sans caractère de contrôle. Null s'il est refusé. */
    groupName(input: string): string | null {
      const trimmed = input.trim().replace(/\s+/g, ' ');
      const length = [...trimmed].length;
      if (length < 2 || length > 30 || /\p{C}/u.test(trimmed) || isBlocked(trimmed)) return null;
      return trimmed;
    },
  };
}

/** Lit un fichier de liste : un mot par ligne, commentaires en # ignorés. */
export const parseBlocklist = (content: string): string[] =>
  content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith('#'));
