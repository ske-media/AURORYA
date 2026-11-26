// Politique de confidentialité, version provisoire (ADR-026). Texte dans content/legal : une seule source.
import privacy from '../../../../../content/legal/privacy.fr.json';
import { messages } from '@/messages';

export const metadata = { title: `${privacy.title} · ${messages.brand.name}` };

export default function Page() {
  return (
    <main>
      <p className="accent">{messages.brand.name}</p>
      <h1>{privacy.title}</h1>
      <p className="muted">{privacy.status}</p>
      {privacy.sections.map((section) => (
        <section key={section.heading} className="card">
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
    </main>
  );
}
