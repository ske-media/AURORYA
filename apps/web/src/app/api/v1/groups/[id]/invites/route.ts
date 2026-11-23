import { expose } from '@/server/runtime';
import { postGroupInvites } from '@/server/routes/groups';

export const POST = expose(postGroupInvites);
