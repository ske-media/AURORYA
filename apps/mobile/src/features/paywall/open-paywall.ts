// Point d'entrée unique vers le paywall (SPEC §7.8) : chaque contenu verrouillé y mène avec son déclencheur.
import type { Href } from 'expo-router';

export const PAYWALL_TRIGGERS = ['after_roast', 'section', 'daily', 'group', 'sky', 'settings'] as const;
export type PaywallTrigger = (typeof PAYWALL_TRIGGERS)[number];

export const paywallHref = (trigger: PaywallTrigger, context?: string): Href =>
  ({ pathname: '/paywall', params: { trigger, ...(context ? { context } : {}) } });
