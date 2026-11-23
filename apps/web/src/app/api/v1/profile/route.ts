import { expose } from '@/server/runtime';
import { putProfile } from '@/server/routes/profile';

export const PUT = expose(putProfile);
