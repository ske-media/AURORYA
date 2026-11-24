import { expose } from '@/server/runtime';
import { postRoasts } from '@/server/routes/roasts';

// Les routes d'IA peuvent durer : génération, juge, une relance (SPEC §9).
export const maxDuration = 60;
export const POST = expose(postRoasts);
