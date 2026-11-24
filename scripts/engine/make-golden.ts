// `pnpm engine:golden:fetch` — télécharge les valeurs de référence du moteur auprès du service
// JPL Horizons de la NASA (éphémérides DE441, données publiques) et les enregistre avec la requête
// exacte utilisée (SPEC §11.8, ADR-001). Ne dépend pas du moteur : la référence reste indépendante.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const OUT = 'packages/astro-engine/__fixtures__/golden/horizons.v1.json';

const TARGETS: Record<string, string> = {
  sun: '10', moon: '301', mercury: '199', venus: '299', mars: '499',
  jupiter: '599', saturn: '699', uranus: '799', neptune: '899', pluto: '999',
};

// 48 instants répartis de 1900 à 2030, à des heures variées.
const JD_START = 2415020.5; // 1900-01-01T00:00Z
const instants = Array.from({ length: 48 }, (_, i) => Number((JD_START + i * 1010.3713).toFixed(4)));

// curl plutôt que fetch : il respecte le proxy et les certificats de l'environnement d'exécution.
async function query(params: Record<string, string>): Promise<{ url: string; rows: string[][] }> {
  const url = `${API}?${new URLSearchParams({ format: 'text', OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", CSV_FORMAT: "'YES'", ...params })}`;
  for (let attempt = 1; ; attempt += 1) {
    let text: string;
    try {
      text = execFileSync('curl', ['-sS', '--fail', '-m', '90', url], { encoding: 'utf8' });
    } catch (error) {
      text = error instanceof Error ? error.message : String(error);
    }
    const start = text.indexOf('$$SOE');
    const end = text.indexOf('$$EOE');
    if (start >= 0 && end > start) {
      const rows = text.slice(start + 5, end).trim().split('\n').map((line) => line.split(',').map((cell) => cell.trim()));
      return { url, rows };
    }
    if (attempt === 4) throw new Error(`Horizons a refusé la requête : ${url}\n${text.slice(0, 600)}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
}

const tlist = instants.map((jd) => `'${jd}'`).join(',');

// 1. Longitude et latitude écliptiques apparentes de la date, géocentriques (quantité 31), temps universel.
const positions: Record<string, { url: string; rows: { jdUt: number; longitude: number; latitude: number }[] }> = {};
for (const [body, command] of Object.entries(TARGETS)) {
  const { url, rows } = await query({
    COMMAND: `'${command}'`, EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", TLIST: tlist,
    QUANTITIES: "'31'", ANG_FORMAT: "'DEG'", EXTRA_PREC: "'YES'", CAL_FORMAT: "'JD'",
  });
  if (rows.length !== instants.length) throw new Error(`${body} : ${rows.length} lignes reçues`);
  positions[body] = { url, rows: rows.map((r) => ({ jdUt: Number(r[0]), longitude: Number(r[3]), latitude: Number(r[4]) })) };
  console.log(`positions ${body} : ${rows.length} lignes`);
}

// 2. Nœud ascendant de l'orbite osculatrice de la Lune, écliptique J2000, instants en TDB.
const node = await query({
  COMMAND: "'301'", EPHEM_TYPE: "'ELEMENTS'", CENTER: "'500@399'", TLIST: tlist, REF_PLANE: "'ECLIPTIC'",
});
const moonNode = { url: node.url, rows: node.rows.map((r) => ({ jdTdb: Number(r[0]), ascendingNodeJ2000: Number(r[5]) })) };
console.log(`nœud lunaire : ${moonNode.rows.length} lignes`);

// 3. Temps sidéral apparent de Greenwich (quantité 7, site à 0° E, 0° N), en heures.
const sidereal = await query({
  COMMAND: "'10'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'coord@399'", COORD_TYPE: "'GEODETIC'", SITE_COORD: "'0,0,0'",
  TLIST: tlist, QUANTITIES: "'7'", ANG_FORMAT: "'DEG'", EXTRA_PREC: "'YES'", CAL_FORMAT: "'JD'",
});
const siderealTime = {
  url: sidereal.url,
  rows: sidereal.rows.map((r) => {
    const cell = r[3] ?? '';
    const parts = cell.split(/\s+/).map(Number);
    const hours = parts.length === 3 ? (parts[0] ?? 0) + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600 : Number(cell);
    return { jdUt: Number(r[0]), gastHours: hours };
  }),
};
console.log(`temps sidéral : ${siderealTime.rows.length} lignes, exemple ${JSON.stringify(sidereal.rows[0])}`);

writeFileSync(OUT, `${JSON.stringify({
  source: 'NASA/JPL Horizons API (https://ssd.jpl.nasa.gov/api/horizons.api), éphémérides DE441',
  fetchedAt: new Date().toISOString().slice(0, 10),
  positions, moonNode, siderealTime,
}, null, 1)}\n`);
console.log(`écrit ${OUT}`);
