// Aiguillage : onboarding ou onglets (SPEC §6.1). L'onboarding arrive au ticket T-013 ;
// d'ici là, l'app ouvre directement les onglets.
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/today" />;
}
