// Dictionnaires de la chaîne de validation (SPEC §14.7). Listes relues par un humain, enrichies au fil
// des évaluations. Un faux positif ne coûte qu'une relance ; un faux négatif laisse passer une faute.
import { type AspectId, type LabelBodyId, type Locale, type SignId, BODY_NAMES, SIGN_IDS, SIGN_NAMES } from '@aurorya/shared';
import type { Mention } from '../facts/facts';

/** Frontière de mot tenant compte des lettres accentuées (le \\b de JavaScript ne connaît que l'ASCII). */
const BOUNDARY = '(?:(?<![\\p{L}\\d])(?=[\\p{L}\\d])|(?<=[\\p{L}\\d])(?![\\p{L}\\d]))';
const u = (pattern: RegExp): RegExp => new RegExp(pattern.source.replaceAll('\\b', BOUNDARY), pattern.flags);
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BODY_IDS_LABEL = Object.keys(BODY_NAMES.fr) as LabelBodyId[];

/** Adjectifs dérivés des planètes, rattachés à leur corps. */
const BODY_ADJECTIVES: Record<Locale, Partial<Record<LabelBodyId, string>>> = {
  fr: { moon: 'lunaires?', sun: 'solaires?', venus: 'vénusien\\w*', mars: 'martien\\w*', saturn: 'saturnien\\w*', jupiter: 'jupitérien\\w*', mercury: 'mercurien\\w*', pluto: 'plutonien\\w*', neptune: 'neptunien\\w*', uranus: 'uranien\\w*' },
  en: { moon: 'lunar', sun: 'solar', venus: 'venusian', mars: 'martian', saturn: 'saturnian|saturnine', jupiter: 'jovian', mercury: 'mercurial', pluto: 'plutonian', neptune: 'neptunian', uranus: 'uranian' },
};
const ASPECT_TERMS: Record<Locale, Record<AspectId, string>> = {
  fr: { conjunction: 'conjonctions?|conjoint\\w*', opposition: 'oppositions?\\s+(?:à|au|aux|de|du|des|avec|entre)\\b|opposée?s?\\s+(?:à|au|aux)\\b', trine: 'trigones?', square: 'carrés?\\s+(?:à|au|aux|de|du|des|avec|entre)\\b|en carré', sextile: 'sextiles?' },
  en: { conjunction: 'conjunctions?|conjunct', opposition: 'oppositions?|opposes?|opposite', trine: 'trines?', square: 'squares?|squaring', sextile: 'sextiles?' },
};
const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

export type AstroTerm = Readonly<{ pattern: RegExp; mention: (match: RegExpExecArray) => Mention | null }>;

/** Termes astrologiques repérables dans un texte. Les noms propres sont sensibles à la casse (« Mars », « Lion »). */
export function astroTerms(locale: Locale): AstroTerm[] {
  const terms: AstroTerm[] = [];
  for (const id of BODY_IDS_LABEL) {
    const names = [BODY_NAMES[locale][id], ...(id === 'north_node' && locale === 'fr' ? ['Noeud Nord'] : [])];
    terms.push({ pattern: new RegExp(`(?<![\\p{L}])(?:${names.map(esc).join('|')})(?![\\p{L}])`, 'gu'), mention: () => `body:${id}` });
    const adjective = BODY_ADJECTIVES[locale][id];
    if (adjective) terms.push({ pattern: new RegExp(`(?<![\\p{L}])(?:${adjective})(?![\\p{L}])`, 'giu'), mention: () => `body:${id}` });
  }
  for (const id of SIGN_IDS) {
    terms.push({ pattern: new RegExp(`(?<![\\p{L}])${esc(SIGN_NAMES[locale][id])}(?![\\p{L}])`, 'gu'), mention: () => `sign:${id as SignId}` });
  }
  for (const [id, source] of Object.entries(ASPECT_TERMS[locale]) as [AspectId, string][]) {
    terms.push({ pattern: new RegExp(`(?<![\\p{L}])(?:${source})`, 'giu'), mention: () => `aspect:${id}` });
  }
  terms.push(
    locale === 'fr'
      ? { pattern: /(?<![\p{L}])maison\s+(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|\d{1,2})(?![\p{L}\d])/giu, mention: (m) => { const v = m[1] ?? ''; const n = ROMAN[v.toUpperCase()] ?? Number(v); return n >= 1 && n <= 12 ? `house:${n}` : null; } }
      : { pattern: /(?<![\p{L}\d])(\d{1,2})(?:st|nd|rd|th)\s+house(?![\p{L}])/giu, mention: (m) => { const n = Number(m[1]); return n >= 1 && n <= 12 ? `house:${n}` : null; } },
  );
  terms.push({ pattern: locale === 'fr' ? /rétrograd\p{L}*/giu : /retrograd\p{L}*/giu, mention: () => 'retrograde' });
  return terms;
}

/** V7 — prédictions : futur affirmatif d'événement, dates, promesses, formules de certitude. */
const PREDICTION_SOURCES: Record<Locale, RegExp[]> = {
  fr: [
    // Futur proche : « tu vas » suivi d'un infinitif. Le présent de mouvement (« où tu vas ») reste permis.
    /\b(?:tu vas|vous allez|il va|elle va|ça va|cela va|on va)\s+(?:(?:te|t’|vous|se|s’|en|y|le|la|les|lui|bien|enfin|vite)\s*)*\p{L}+(?:er|ir|re|oir)\b/iu,
    // Futur simple à la deuxième personne : terminaisons régulières et verbes irréguliers courants.
    // Le présent des verbes en -rer (« vous montrez », « vous préférez ») n'est pas un futur.
    /\b(?:tu|vous)\s+(?:(?:ne|n’|te|t’|vous|se|s’|en|y|le|la|les|lui)\s*)*(?:\p{L}+(?:eras|iras|erez|irez)|(?:ser|aur|fer|verr|pourr|devr|viendr|saur|voudr|faudr|tiendr|recevr|conna[iî]tr|prendr|mettr|dir|vivr|rencontrer|trouver)(?:as|ez))\b/iu,
    /\b(?:il|elle|ça|cela)\s+(?:t’|te |vous )(?:arrivera|attendra|tombera dessus)\b/iu,
    /\b(?:bientôt|prochainement|demain|d’ici (?:peu|là|quelques)|l’an prochain|l’année prochaine|le mois prochain|la semaine prochaine|cette année|dans (?:les|quelques|\p{L}+) (?:jours|semaines|mois|années|ans))\b/iu,
    /\b(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(?:19|20)\d\d\b/iu,
    /\b(?:19|20)\d\d\b/u,
    /\b(?:c’est sûr|c’est certain|sans aucun doute|à coup sûr|forcément|garanti\p{L}*|promis|inévitable\p{L}*|je te (?:le )?promets|je vous (?:le )?promets|il t’arrivera|il vous arrivera)\b/iu,
  ],
  en: [
    /\b(?:you will|you’ll|you are going to|you’re going to|will happen|is going to happen)\b/iu,
    /\b(?:soon|tomorrow|next (?:week|month|year)|this year|in the coming|within (?:days|weeks|months))\b/iu,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:19|20)\d\d\b/iu,
    /\b(?:19|20)\d\d\b/u,
    /\b(?:guaranteed|for sure|without a doubt|inevitabl\p{L}*|i promise|certainly will|destined to)\b/iu,
  ],
};

export const PREDICTION_PATTERNS: Record<Locale, RegExp[]> = { fr: PREDICTION_SOURCES.fr.map(u), en: PREDICTION_SOURCES.en.map(u) };

/** V8 — sujets interdits dans tous les modes (SPEC §5.3). */
const FORBIDDEN_SOURCES: Record<Locale, Readonly<Record<string, RegExp>>> = {
  fr: {
    body: /\b(?:poids|gross\p{L}*|maigr\p{L}*|mince\p{L}*|kilos?|laid\p{L}*|moche\p{L}*|belle|beau|beauté|jolie?|physique|rides?|silhouette|ton corps|votre corps|tes fesses|ton visage|votre visage)\b/iu,
    health: /\b(?:malad(?:e|es|ie|ies|if|ive)|cancer(?:s|eux|euse)?(?= du| de la| des| d’)|santé|médica\p{L}*|médecin\p{L}*|thérap\p{L}*|traitement\p{L}*|dépress\p{L}*|anxi\p{L}*|bipolaire\p{L}*|trouble\p{L}*|diagnosti\p{L}*|mort\p{L}*|mourir|meur\p{L}*|décès|décéd\p{L}*|deuil\p{L}*|suicid\p{L}*|enceinte\p{L}*|grossesse\p{L}*|accident\p{L}*|hôpita\p{L}*)\b/iu,
    advice: /\b(?:investi(?:r|s|ssement|ssements|sseur)\b(?! dans (?:une|la|cette|sa|ta) (?:relation|amitié))|placement financier|bourse|crypto\p{L}*|démissionn\p{L}*|quitte ton (?:travail|job|mec|mari|copain)|quittez votre|divorc\p{L}*|avocat\p{L}*|procès|porte plainte|arrête ton traitement)\b/iu,
    identity: /\b(?:religi\p{L}*|musulman\p{L}*|chrétien\p{L}*|catholique\p{L}*|juif\p{L}*|juive\p{L}*|athée\p{L}*|homosexuel\p{L}*|hétéro\p{L}*|lesbienne\p{L}*|gay|bisexuel\p{L}*|handicap\p{L}*|origine ethnique|race|raciale?|politique\p{L}*|de gauche|de droite)\b/iu,
    explicit: /\b(?:sexe|sexuel\p{L}*|orgasm\p{L}*|baise\p{L}*|coucher avec|au lit avec|nue?s?|porno\p{L}*)\b/iu,
    insult: /\b(?:idiot\p{L}*|stupide\p{L}*|con|conne|connard\p{L}*|débile\p{L}*|nul|nulle|pathétique\p{L}*|minable\p{L}*|raté\p{L}*|salope\p{L}*|pute\p{L}*|bête comme)\b/iu,
  },
  en: {
    body: /\b(?:weight|fat|skinny|thin|ugly|pretty|beautiful|handsome|looks|wrinkles?|your body|your face)\b/iu,
    health: /\b(?:sick\p{L}*|illness\p{L}*|disease\p{L}*|health|medic\p{L}*|doctor\p{L}*|therap\p{L}*|depress\p{L}*|anxiety|anxious|bipolar|disorder\p{L}*|diagnos\p{L}*|death|dead|die|dies|dying|grief|griev\p{L}*|suicid\p{L}*|pregnan\p{L}*|accident\p{L}*|hospital\p{L}*)\b/iu,
    advice: /\b(?:investi(?:r|s|ssement|ssements|sseur)\b(?! dans (?:une|la|cette|sa|ta) (?:relation|amitié))|stocks?|crypto\p{L}*|quit your (?:job|husband|boyfriend)|resign|divorc\p{L}*|lawyer\p{L}*|lawsuit\p{L}*|sue|stop your medication)\b/iu,
    identity: /\b(?:religio\p{L}*|muslim\p{L}*|christian\p{L}*|catholic\p{L}*|jewish|atheist\p{L}*|homosexual\p{L}*|straight|lesbian\p{L}*|gay|bisexual\p{L}*|disab\p{L}*|ethnic\p{L}*|race|racial|politic\p{L}*|left-wing|right-wing)\b/iu,
    explicit: /\b(?:sex|sexual\p{L}*|orgasm\p{L}*|in bed with|naked|nude|porn\p{L}*)\b/iu,
    insult: /\b(?:idiot\p{L}*|stupid\p{L}*|dumb|moron\p{L}*|pathetic|loser\p{L}*|worthless|bitch\p{L}*|slut\p{L}*)\b/iu,
  },
};

const mapValues = (o: Readonly<Record<string, RegExp>>): Record<string, RegExp> => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, u(v)]));
export const FORBIDDEN_PATTERNS: Record<Locale, Readonly<Record<string, RegExp>>> = { fr: mapValues(FORBIDDEN_SOURCES.fr), en: mapValues(FORBIDDEN_SOURCES.en) };

/** V6 — adresse. Tutoiement en Lune et Mars, vouvoiement en Saturne (D-009). L'anglais n'a pas cette distinction. */
export const FORMAL_FR = u(/(?<!rendez-)\b(?:vous|votre|vos|vôtres?)\b/iu);
export const INFORMAL_FR = u(/\b(?:tu|te|toi|ton|ta|tes|tien(?:ne)?s?)\b|\bt’/iu);

/** V6 — écriture épicène quand l'accord est neutre : formes genrées repérables. */
export const GENDERED_FR: RegExp[] = ([
  /\p{L}+·\p{L}+/u, /\p{L}+\(e\)/iu, /\p{L}+\.e\b/iu,
  /\b(?:tu es|t’es|vous êtes|tu restes|tu deviens|tu sembles|tu parais)\s+(?:(?:très|trop|si|plutôt|tellement|vraiment|un peu)\s+)?(?:\p{L}+(?:euse|eux|trice|teur|ive|if|ée|és|ées|ente|ent|ante|ant|ière|ier|onne|elle|ette)|têtue?|seule?|prête?|sûre?|forte?|douce|doux|folle|fou|jalouse|jaloux|franche?|grande?|petite?|née?)\b/iu,
  /\b(?:une|la|cette) (?:fille|femme|reine|princesse|amie|copine|experte|championne)\b/iu,
  /\b(?:un|le|ce) (?:garçon|homme|roi|prince|ami|copain|expert|champion)\b/iu,
] as RegExp[]).map(u);
