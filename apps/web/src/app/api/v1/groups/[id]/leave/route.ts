import { expose } from '@/server/runtime';
import { postGroupLeave } from '@/server/routes/groups';

export const POST = expose(postGroupLeave);
