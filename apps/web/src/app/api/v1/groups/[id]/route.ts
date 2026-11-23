import { expose } from '@/server/runtime';
import { deleteGroup, patchGroup } from '@/server/routes/groups';

export const PATCH = expose(patchGroup);
export const DELETE = expose(deleteGroup);
