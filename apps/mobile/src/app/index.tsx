// Aiguillage : onboarding ou onglets (SPEC §6.1), une fois le brouillon relu depuis le trousseau.
import { Redirect } from 'expo-router';
import { firstIncompleteStep } from '@/features/onboarding/draft';
import { useOnboarding } from '@/store/onboarding';

const ROUTE = { welcome: '/welcome', 'birth-date': '/birth-date', 'birth-time': '/birth-time', 'birth-place': '/birth-place', quiz: '/quiz' } as const;

export default function Index() {
  const { hydrated, completed, draft, chart } = useOnboarding();
  if (!hydrated) return null;
  if (completed) return <Redirect href="/today" />;
  if (chart) return <Redirect href="/reveal" />;
  // Reprise là où la saisie s'était arrêtée.
  const step = firstIncompleteStep(draft);
  return <Redirect href={step ? ROUTE[step] : '/quiz'} />;
}
