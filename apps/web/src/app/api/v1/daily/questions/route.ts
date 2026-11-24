import { getDeps } from '@/server/runtime';
import { getDailyQuestions } from '@/server/routes/daily';

export const GET = (request: Request): Promise<Response> => getDailyQuestions(request, getDeps());
