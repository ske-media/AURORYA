// Jetons de prénoms (SPEC §14.2). Aucun prénom n'est envoyé au fournisseur d'IA : le LLM écrit
// {{name}} ou {{m1}}…{{m8}}, et l'affichage les remplace.
export const NAME_TOKEN = '{{name}}';
export const MEMBER_TOKENS = ['{{m1}}', '{{m2}}', '{{m3}}', '{{m4}}', '{{m5}}', '{{m6}}', '{{m7}}', '{{m8}}'] as const;
export type MemberToken = (typeof MEMBER_TOKENS)[number];

const TOKEN_PATTERN = /\{\{[^}]*\}\}/g;

export const tokensIn = (text: string): string[] => text.match(TOKEN_PATTERN) ?? [];

/** Remplace les jetons connus ; un jeton inconnu est laissé tel quel (la validation V4 l'aura refusé). */
export function replaceTokens(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(TOKEN_PATTERN, (token) => values[token] ?? token);
}
