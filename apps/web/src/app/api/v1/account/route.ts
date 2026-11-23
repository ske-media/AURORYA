import { expose } from '@/server/runtime';
import { deleteAccount } from '@/server/routes/account';

export const DELETE = expose(deleteAccount);
