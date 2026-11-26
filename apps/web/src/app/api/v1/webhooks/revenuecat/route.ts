import { expose } from '@/server/runtime';
import { postRevenueCatWebhook } from '@/server/routes/entitlements';

export const POST = expose(postRevenueCatWebhook);
