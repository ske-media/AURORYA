import { expose } from '@/server/runtime';
import { deleteGroupMember } from '@/server/routes/groups';

export const DELETE = expose(deleteGroupMember);
