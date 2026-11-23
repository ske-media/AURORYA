import { expose } from '@/server/runtime';
import { postGroupsJoin } from '@/server/routes/groups';

export const POST = expose(postGroupsJoin);
