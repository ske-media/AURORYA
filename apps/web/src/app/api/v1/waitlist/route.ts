import { expose } from '@/server/runtime';
import { postWaitlist } from '@/server/waitlist';

export const POST = expose(postWaitlist);
