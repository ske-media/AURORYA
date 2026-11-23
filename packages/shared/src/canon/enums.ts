// Énumérations produit (SPEC §3.4).

/** Affichés « Lune », « Mars », « Saturne ». Les IDs évitent toute confusion avec les planètes. */
export const TONE_MODES = ['soft', 'cash', 'expert'] as const;
export type ToneMode = (typeof TONE_MODES)[number];
export const DEFAULT_TONE_MODE: ToneMode = 'cash';

/** Accord des textes uniquement. `n` = écriture épicène. */
export const GRAMMATICAL_GENDERS = ['f', 'm', 'n'] as const;
export type GrammaticalGender = (typeof GRAMMATICAL_GENDERS)[number];

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const TIME_PRECISIONS = ['exact', 'approx', 'unknown'] as const;
export type TimePrecision = (typeof TIME_PRECISIONS)[number];

export const TIME_WINDOWS = ['night', 'morning', 'afternoon', 'evening'] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const GROUP_TYPES = ['friends', 'couple', 'family', 'colleagues'] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const READING_KINDS = ['roast', 'full_section', 'daily_personal'] as const;
export type ReadingKind = (typeof READING_KINDS)[number];

export const SECTION_KEYS = [
  'big_three', 'love', 'mind', 'drive', 'inner_world', 'growth', 'shadow', 'synthesis',
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const GROUP_READING_KINDS = ['roles_duos', 'weekly_weather'] as const;
export type GroupReadingKind = (typeof GROUP_READING_KINDS)[number];

export const KB_REVIEW_STATUSES = ['draft_ai', 'reviewed', 'approved'] as const;
export type KbReviewStatus = (typeof KB_REVIEW_STATUSES)[number];

/** `judge` sert uniquement au contrôle de conformité (SPEC §14.7). */
export const AI_TIERS = ['light', 'strong', 'judge'] as const;
export type AiTier = (typeof AI_TIERS)[number];

export const ENTITLEMENTS = ['premium'] as const;
export type Entitlement = (typeof ENTITLEMENTS)[number];
