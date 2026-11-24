// Textes du site. Le français seul est servi au lancement (D-005).
import fr from './fr.json';

export const messages = fr;
/** Remplace les variables `{{nom}}` d'un texte. */
export const fill = (text: string, values: Readonly<Record<string, string>>): string =>
  text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '');
