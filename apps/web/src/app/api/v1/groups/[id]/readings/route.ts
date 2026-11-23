import { expose } from '@/server/runtime';
import { postGroupReadings } from '@/server/routes/group-readings';

export const maxDuration = 60;
export const POST = expose(postGroupReadings);
