import { expose } from '@/server/runtime';
import { postGroups } from '@/server/routes/groups';

export const POST = expose(postGroups);
