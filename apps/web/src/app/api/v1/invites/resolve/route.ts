import { expose } from '@/server/runtime';
import { postInvitesResolve } from '@/server/routes/groups';

export const POST = expose(postInvitesResolve);
