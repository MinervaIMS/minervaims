import { useEffect, useState } from 'react';
import { greetingDateKey, greetingPoolKey, pickGreeting, type GreetingVars } from './greetings';

// =====================================================================
// The greeting.
// ---------------------------------------------------------------------
// One shared pool for the whole association: the line a first-week
// analyst reads is the line the President reads. The copy lives in
// `greetings.ts` and is used verbatim; nothing here paraphrases it.
//
// It is CENTRED, and it is the only thing on its row. The Minerva mark
// that used to sit at the right is gone: the workspace already carries
// the association's mark in its own header, and a second one here was
// competing with the sentence rather than introducing it.
//
// A phone gets a size up and a little more air above and below, because
// this is the first thing a member reads and it was arriving squeezed
// between the chrome and the first card.
// =====================================================================

export function DashboardGreeting({ userId, vars }: { userId: string; vars: GreetingVars }) {
  const [romeDay, setRomeDay] = useState(() => greetingDateKey(new Date()));
  const [line, setLine] = useState(() => chooseGreeting(new Date(), userId, vars));

  // A dashboard can remain mounted indefinitely. Check the Rome calendar,
  // rather than waiting for unrelated data or visibility changes to cause a
  // render, and move to the current pool when Milan crosses midnight.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      const nextRomeDay = greetingDateKey(now);
      if (nextRomeDay === romeDay) return;
      setRomeDay(nextRomeDay);
      setLine(chooseGreeting(now, userId, vars));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [romeDay, userId, vars]);

  return (
    // VERTICALLY CENTRED IN THE WHITE SPACE ABOVE THE KPI ROW, which is
    // not the same as centred in this header. The band above the sentence
    // is the content pane's own top padding (24px) plus this header's;
    // the band below it is this header's bottom padding plus the 12px
    // grid gap that separates it from the first card. Twelve pixels more
    // below than above therefore puts the sentence exactly in the middle
    // of the two, and the 56px reclaimed by dropping the breadcrumb is
    // spent here rather than banked: the sentence now has real air on
    // both sides instead of sitting just under the chrome.
    // The two panes pad differently (24px on a desktop, 16px on a phone),
    // so the balance is struck separately at each breakpoint.
    <header className="shrink-0 pt-4 pb-5 lg:pt-5 lg:pb-8">
      <h1 className="mx-auto max-w-4xl text-center font-serif text-xl sm:text-2xl xl:text-[2rem] leading-[1.15] text-accent text-balance">
        {line}
      </h1>
    </header>
  );
}

const LAST_GREETING_PREFIX = 'minerva-dashboard-greeting:';

function chooseGreeting(now: Date, userId: string, vars: GreetingVars): string {
  const storageKey = `${LAST_GREETING_PREFIX}${userId}:${greetingPoolKey(now)}`;
  let previousLine: string | undefined;
  try {
    previousLine = window.localStorage.getItem(storageKey) ?? undefined;
  } catch {
    // Storage can be unavailable in privacy-restricted browsers. Rotation
    // still works; only guaranteed consecutive-visit exclusion is skipped.
  }

  const nextLine = pickGreeting(now, vars, previousLine);
  try {
    window.localStorage.setItem(storageKey, nextLine);
  } catch {
    // A greeting must never make the dashboard depend on browser storage.
  }
  return nextLine;
}

export default DashboardGreeting;
