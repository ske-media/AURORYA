import { expose } from '@/server/runtime';
import { postCharts } from '@/server/routes/charts';

export const POST = expose(postCharts);
