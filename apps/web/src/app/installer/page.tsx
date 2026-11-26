// Installation directe de l'app de test sur un iPhone enregistré (ADR-027). Page non référencée.
import install from '../../../../../content/ios/install.json';
import { messages } from '@/messages';

export const metadata = { title: `${messages.installer.pageTitle} · ${messages.brand.name}`, robots: { index: false, follow: false } };

const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(install.manifestUrl)}`;

export default function Page() {
  return (
    <main>
      <p className="accent">{messages.brand.name}</p>
      <h1>{messages.installer.title}</h1>
      <p className="muted">{messages.installer.body}</p>
      <a className="button" href={installUrl}>{messages.installer.action}</a>
    </main>
  );
}
