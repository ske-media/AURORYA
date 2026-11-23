import { expose } from '@/server/runtime';
import { getConfig } from '@/server/routes/profile';

export const GET = expose(getConfig);
