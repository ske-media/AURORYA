// Liens légaux du paywall (SPEC §7.8). Les conditions sont celles du contrat de licence standard d'Apple
// tant que des conditions propres à Aurorya ne sont pas publiées (O-05, T-073).
import { siteHost } from '@/features/share/card-model';

export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const privacyUrl = (): string | null => {
  const host = siteHost(process.env.EXPO_PUBLIC_SITE_HOST);
  return host ? `https://${host}/confidentialite` : null;
};
