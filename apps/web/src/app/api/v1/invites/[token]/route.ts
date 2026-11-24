import { expose } from '@/server/runtime';
import { deleteInvite, getInvite } from '@/server/routes/groups';

// GET : aperçu public par jeton. DELETE : révocation par identifiant d'invitation (même segment d'URL).
export const GET = expose(getInvite);
export const DELETE = async (request: Request, context: { params: Promise<{ token: string }> }): Promise<Response> =>
  expose(deleteInvite)(request, { params: context.params.then((p) => ({ id: p.token })) });
