import { expose } from '@/server/runtime';
import { getSection } from '@/server/routes/readings';

export const GET = expose(getSection);
