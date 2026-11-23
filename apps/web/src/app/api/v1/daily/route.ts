import { getDeps } from '@/server/runtime';
import { getDaily } from '@/server/routes/daily';

export const GET = (request: Request): Promise<Response> => getDaily(request, getDeps());
