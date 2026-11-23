import { messages } from '@/messages';
import { getDeps } from '@/server/runtime';
import { unsubscribeWaitlist } from '@/server/waitlist';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const done = await unsubscribeWaitlist(getDeps(), new Request(`https://local.invalid/?token=${encodeURIComponent(token ?? '')}`));
  return (
    <main>
      <p className="accent">{messages.brand.name}</p>
      <h1>{done ? messages.waitlist.unsubscribed : messages.waitlist.unsubscribeInvalid}</h1>
    </main>
  );
}
