import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { myForms, type MyFormSummary } from '@/lib/internal-forms-api';

// The internal forms open to this member, for the Dashboard's form card
// (FormsStackBlock.tsx). Part of the Dashboard's one load.

/** How long the Dashboard waits for this before appearing without it. */
const WAIT_MS = 1500;
let cache: { userId: string; forms: MyFormSummary[] } | null = null;

/**
 * A form this member has just answered, from its own page: the Dashboard
 * stops offering it at once, without waiting for its next refresh.
 */
export function noteAnswered(formId: string) {
  if (!cache) return;
  const now = new Date().toISOString();
  cache = { ...cache, forms: cache.forms.map((f) => (f.id === formId ? { ...f, answered_at: f.answered_at ?? now } : f)) };
}

export function useMyForms(userId: string | null) {
  const { session } = useAuth();
  const cached = cache && cache.userId === userId ? cache.forms : null;
  const [forms, setForms] = useState<MyFormSummary[]>(cached ?? []);
  const [settled, setSettled] = useState<boolean>(!userId || !!cached);

  useEffect(() => {
    if (!userId) { setSettled(true); return; }
    let active = true;
    const timer = window.setTimeout(() => { if (active) setSettled(true); }, WAIT_MS);
    myForms(session)
      .then((list) => {
        if (!active) return;
        cache = { userId, forms: list };
        setForms(list);
      })
      .catch((e) => { console.warn('Could not read the open forms', e); })
      .finally(() => { if (active) { window.clearTimeout(timer); setSettled(true); } });
    return () => { active = false; window.clearTimeout(timer); };
    // The session object changes on every token refresh; the user does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // The forms still waiting for an answer, closing soonest first. One
  // whose deadline passes while the Dashboard is open leaves at that
  // moment, and Research by division (or Getting started) comes back.
  const [now, setNow] = useState(() => Date.now());
  const waiting = forms
    .filter((f) => !f.answered_at && (!f.closes_at || new Date(f.closes_at).getTime() > now))
    .sort((a, b) => (a.closes_at ?? '9999').localeCompare(b.closes_at ?? '9999'));
  const nextEnd = waiting.reduce<number | null>((m, f) => {
    const t = f.closes_at ? new Date(f.closes_at).getTime() : null;
    return t !== null && (m === null || t < m) ? t : m;
  }, null);
  useEffect(() => {
    if (nextEnd === null) return;
    const wait = nextEnd - Date.now();
    if (wait > 24 * 3600000) return;
    const t = window.setTimeout(() => setNow(Date.now()), Math.max(0, wait) + 500);
    return () => window.clearTimeout(t);
  }, [nextEnd]);

  return { forms, waiting, settled };
}
