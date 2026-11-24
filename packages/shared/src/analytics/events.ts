// Liste fermée des événements analytics (SPEC §20.3). Un événement hors liste ne compile pas.
// Jamais de prénom, e-mail, date, heure, lieu, signe, texte généré ni nom de groupe (SPEC §20.2).
import type { GroupReadingKind, GroupType, PlanetId, SectionKey, TimePrecision, ToneMode } from '../canon';

export type AnalyticsEvents = {
  app_opened: { source: 'direct' | 'notification' | 'link' };
  onboarding_started: Record<string, never>;
  onboarding_step_completed: { step: 'welcome' | 'birth_date' | 'birth_time' | 'birth_place' | 'quiz' };
  birth_time_precision_chosen: { precision: TimePrecision };
  chart_computed: { hasExactTime: boolean; durationMs: number };
  roast_viewed: { mode: ToneMode; status: 'ok' | 'fallback'; durationMs: number };
  roast_mode_switched: { from: ToneMode; to: ToneMode };
  roast_regenerated: { mode: ToneMode };
  share_opened: { kind: 'roast' | 'group'; mode: ToneMode };
  share_completed: { kind: 'roast' | 'group'; mode: ToneMode };
  wheel_body_selected: { body: PlanetId | 'north_node' };
  section_opened: { section: SectionKey; locked: boolean };
  daily_viewed: { hasPersonal: boolean };
  notif_permission_answered: { granted: boolean };
  group_created: { type: GroupType };
  invite_created: { channel: 'link' | 'code' };
  invite_shared: { channel: 'link' | 'code' };
  invite_opened: { hasApp: boolean };
  group_joined: { type: GroupType; membersCount: number; viaCode: boolean };
  ghost_added: { type: GroupType };
  ghost_converted: { type: GroupType };
  group_reading_viewed: { kind: GroupReadingKind; membersCount: number; ghostsCount: number };
  paywall_viewed: { trigger: 'after_roast' | 'locked_section' | 'locked_group' | 'locked_daily' | 'settings'; offering: string };
  purchase_started: { productId: string; isTrial: boolean };
  purchase_completed: { productId: string; isTrial: boolean };
  purchase_cancelled: { productId: string; isTrial: boolean };
  purchase_failed: { productId: string; isTrial: boolean };
  restore_completed: { restored: boolean };
  account_created: { method: 'apple' | 'email'; trigger: 'after_roast' | 'group_creation' | 'settings' };
  /** Envoyé seulement si le consentement est accordé. */
  analytics_consent_answered: { granted: true };
  account_deleted: Record<string, never>;
};
export type AnalyticsEventName = keyof AnalyticsEvents;

/** Propriétés communes à tous les événements. */
export type AnalyticsCommonProps = { appVersion: string; locale: 'fr' | 'en'; mode: ToneMode; isAnonymous: boolean; isPremium: boolean };
