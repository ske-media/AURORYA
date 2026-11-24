// Post-traitement typographique déterministe (SPEC §5.4). Jamais laissé au LLM.
import type { Locale } from '@aurorya/shared';

const NNBSP = String.fromCharCode(0x202f);

export function applyTypography(text: string, locale: Locale): string {
  let out = text.replace(/[ \t\u00A0\u202F]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
  out = out.replace(/\.{3}/g, '…').replace(/'/g, '’');
  // Degrés : 23°14' ou 23° 14 → 23°14′
  out = out.replace(/(\d+)° ?(\d{1,2})[’′]?/g, (_m, d: string, m: string) => `${d}°${m.padStart(2, '0')}′`);
  if (locale === 'fr') {
    out = out.replace(/"([^"]*)"/g, '«$1»').replace(/[“”]/g, '"').replace(/"([^"]*)"/g, '«$1»');
    out = out.replace(/« ?/g, `«${NNBSP}`).replace(/ ?»/g, `${NNBSP}»`);
    out = out.replace(/ ?([;:!?])/g, `${NNBSP}$1`);
    // Incises : tiret demi-cadratin entouré d'espaces.
    out = out.replace(/ [-—] /g, ' – ');
  } else {
    out = out.replace(/"([^"]*)"/g, '“$1”');
    out = out.replace(/ ?[–-]{1,2} ?(?=\S)/g, (m) => (/^ .* $/.test(m) || m.includes('--') ? '—' : m)).replace(/ — /g, '—');
  }
  return out.replace(/ {2,}/g, ' ');
}
