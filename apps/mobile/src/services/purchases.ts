// Achats (SPEC §18.2) : RevenueCat, identifié par l'identifiant Supabase. Tout est inactif tant que la clé
// publique n'est pas fournie : l'app le dit au lieu de simuler une offre. Les prix viennent de StoreKit, jamais du code.
import { OFFERING_IDS } from '@aurorya/shared';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
export const purchasesEnabled = apiKey.length > 0;
let identified: string | null = null;

/** Rattache les achats à l'utilisatrice (A-003 : l'identifiant ne change pas à la création du compte). */
export async function identifyPurchaser(uid: string): Promise<void> {
  if (!purchasesEnabled || identified === uid) return;
  if (identified === null) Purchases.configure({ apiKey, appUserID: uid });
  else await Purchases.logIn(uid);
  identified = uid;
}

export type Offer = Readonly<{ pkg: PurchasesPackage; trialEligible: boolean }>;
export type Offers = Readonly<{ annual: Offer | null; monthly: Offer | null }>;

/** Les offres de l'offre `default`, avec l'éligibilité réelle à l'essai (une fois par compte Apple). */
export async function loadOffers(): Promise<Offers> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[OFFERING_IDS.default] ?? offerings.current;
  const packages = [offering?.annual ?? null, offering?.monthly ?? null];
  const ids = packages.flatMap((p) => (p ? [p.product.identifier] : []));
  const eligibility = ids.length > 0 ? await Purchases.checkTrialOrIntroductoryPriceEligibility(ids) : {};
  const offer = (pkg: PurchasesPackage | null): Offer | null => (pkg ? {
    pkg,
    trialEligible: pkg.product.introPrice !== null && pkg.product.introPrice.price === 0
      && eligibility[pkg.product.identifier]?.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
  } : null);
  return { annual: offer(packages[0] ?? null), monthly: offer(packages[1] ?? null) };
}

/** Lance l'achat. `cancelled` si l'utilisatrice referme la feuille d'Apple ; toute autre erreur est levée. */
export async function purchase(pkg: PurchasesPackage): Promise<'purchased' | 'cancelled'> {
  try {
    await Purchases.purchasePackage(pkg);
    return 'purchased';
  } catch (error) {
    if ((error as { code?: string }).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    throw error;
  }
}

export const restorePurchases = async (): Promise<void> => void (await Purchases.restorePurchases());
