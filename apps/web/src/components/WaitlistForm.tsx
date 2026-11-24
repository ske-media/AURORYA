'use client';

import { type FormEvent, useState } from 'react';
import { messages } from '@/messages';

type Status = 'idle' | 'sending' | 'done' | 'error';

/** Formulaire de liste d'attente : la case de consentement n'est jamais précochée (SPEC §7.10). */
export function WaitlistForm() {
  const [status, setStatus] = useState<Status>('idle');
  const t = messages.waitlist;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    try {
      const response = await fetch('/api/v1/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), consent: data.get('consent') === 'on', locale: 'fr', source: 'home' }),
      });
      setStatus(response.status === 202 ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') return <p role="status">{t.done}</p>;
  return (
    <form className="card" onSubmit={(event) => void submit(event)}>
      <h2>{t.title}</h2>
      <label>
        {t.email}
        <input type="email" name="email" required autoComplete="email" maxLength={254} />
      </label>
      <label className="check">
        <input type="checkbox" name="consent" required />
        <span>{t.consent}</span>
      </label>
      <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? t.sending : t.submit}</button>
      {status === 'error' ? <p role="alert">{t.error}</p> : null}
    </form>
  );
}
