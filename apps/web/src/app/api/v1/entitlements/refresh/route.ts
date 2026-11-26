import { expose } from '@/server/runtime';
import { postEntitlementsRefresh } from '@/server/routes/entitlements';

export const POST = expose(postEntitlementsRefresh);
