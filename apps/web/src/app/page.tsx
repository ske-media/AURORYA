// Accueil (SPEC §7.10). Le mini-roast par signe arrivera avec ses textes relus (content/sign-roasts.*.json).
import { WaitlistForm } from '@/components/WaitlistForm';
import { messages } from '@/messages';

export default function Home() {
  return (
    <main>
      <p className="accent">{messages.brand.name}</p>
      <h1>{messages.brand.tagline}</h1>
      <WaitlistForm />
      <p className="muted">{messages.home.aiNotice}</p>
    </main>
  );
}
