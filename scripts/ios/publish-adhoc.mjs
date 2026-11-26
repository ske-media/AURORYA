// Publie l'app signée pour installation directe (ADR-027) : le fichier .ipa et le manifeste lu par iOS,
// à une adresse fixe, écrasés à chaque build. Lancé par le workflow iOS, jamais en local.
// Usage : node publish-adhoc.mjs <dossier contenant le .ipa> <version> <numéro de build>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { put } from '@vercel/blob';

const [dir, version, build] = process.argv.slice(2);
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!dir || !version || !build || !token) throw new Error('usage : publish-adhoc.mjs <dossier> <version> <build>, avec BLOB_READ_WRITE_TOKEN');
const ipaName = readdirSync(dir).find((f) => f.endsWith('.ipa'));
if (!ipaName) throw new Error(`aucun .ipa dans ${dir}`);

const options = { access: 'public', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60, token };
const ipa = await put('aurorya/Aurorya.ipa', readFileSync(join(dir, ipaName)), { ...options, contentType: 'application/octet-stream' });
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict>
<key>assets</key><array><dict><key>kind</key><string>software-package</string><key>url</key><string>${ipa.url}?b=${build}</string></dict></array>
<key>metadata</key><dict>
<key>bundle-identifier</key><string>com.aurorya.app</string>
<key>bundle-version</key><string>${version}</string>
<key>kind</key><string>software</string>
<key>title</key><string>Aurorya ${version} (${build})</string>
</dict></dict></array></dict></plist>
`;
const plist = await put('aurorya/manifest.plist', manifest, { ...options, contentType: 'application/xml' });
console.log(`manifeste : ${plist.url}`);
console.log(`lien : itms-services://?action=download-manifest&url=${encodeURIComponent(plist.url)}`);
