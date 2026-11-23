import { expose } from '@/server/runtime';
import { postAccountExport } from '@/server/routes/account';

export const POST = expose(postAccountExport);
