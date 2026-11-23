// Surface publique de @aurorya/ai (SPEC §14). Reçoit des faits ; n'importe jamais le moteur.
export { type Fact, type Mention, chartFacts, factLabel } from './facts/facts';
export { ROAST_SHEET_SIZE, type ScoredFact, scoreFacts, selectRoastFacts } from './facts/salience';
export type { LlmError, LlmPort, LlmRequest, TokenUsage } from './ports/llm-port';
export {
  HOOK_MAX_LENGTH, JudgeSchema, type JudgeVerdict, type KbLookup, ROAST_LIMITS, type RoastContext, type RoastPrompts, type RoastResult,
  buildRoastSheet, fallbackRoast, generateRoast, shortHash, validateRoast,
} from './roast/roast';
export { sectionFacts } from './sections';
export { MEMBER_TOKENS, type MemberToken, NAME_TOKEN, replaceTokens, tokensIn } from './tokens';
export { applyTypography } from './typography';
export { type Failure, type FailureCode, type TextContext, checkText } from './validation/checks';
