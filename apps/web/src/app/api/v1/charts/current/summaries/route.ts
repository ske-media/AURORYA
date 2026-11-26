import { expose } from '@/server/runtime';
import { getChartSummaries } from '@/server/routes/summaries';

export const GET = expose(getChartSummaries);
