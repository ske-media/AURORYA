// Assemblage des prompts (SPEC §14.12) : identité + sécurité + méthode + style du mode + tâche.
// La version enregistrée est l'empreinte courte de l'assemblage.
import { type RoastPrompts, shortHash } from '@aurorya/ai';
import { LOCALES, type Locale, TONE_MODES, type ToneMode } from '@aurorya/shared';

/** Retire l'en-tête `--- … ---` d'un fichier de prompt. */
export const stripFrontMatter = (content: string): string => content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

export type PromptReader = (relativePath: string) => string | null;

export function buildRoastPrompts(read: PromptReader, personaName: string): Record<Locale, Record<ToneMode, RoastPrompts>> {
  const load = (locale: Locale, path: string): string => {
    // Tant que les prompts anglais ne sont pas écrits (T-080), l'anglais retombe sur le français.
    const content = read(`${locale}/${path}`) ?? read(`fr/${path}`);
    if (content === null) throw new Error(`Prompt introuvable : ${path}`);
    return stripFrontMatter(content).replaceAll('{{persona_name}}', personaName);
  };
  const out = {} as Record<Locale, Record<ToneMode, RoastPrompts>>;
  for (const locale of LOCALES) {
    const common = ['_system/identity.md', '_system/safety.md', '_system/method.md'].map((p) => load(locale, p));
    const judgeSystem = load(locale, 'judge.md');
    out[locale] = {} as Record<ToneMode, RoastPrompts>;
    for (const mode of TONE_MODES) {
      const system = [...common, load(locale, `_system/style-${mode}.md`), load(locale, 'roast.md')].join('\n\n');
      out[locale][mode] = { system, judgeSystem, promptVersion: shortHash(`${system}\n${judgeSystem}`) };
    }
  }
  return out;
}
