import { useMemo } from 'react';
import { pickGreeting, type GreetingVars } from './greetings';

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
  const line = useMemo(() => pickGreeting(new Date(), userId, vars), [userId, vars]);

  return (
    // VERTICALLY CENTRED IN THE WHITE SPACE ABOVE THE KPI ROW, which is
    // not the same as centred in this header. The band above the sentence
    // is the content pane's own top padding (24px); the band below it is
    // this header's padding plus the 12px grid gap. Left symmetric, the
    // sentence sat 8px low. Reclaiming that 8px above balances the two
    // bands exactly, and costs no height because it is taken back rather
    // than added.
    <header className="shrink-0 -mt-1 lg:-mt-2 pb-1">
      <h1 className="mx-auto max-w-4xl text-center font-serif text-xl sm:text-2xl xl:text-[2rem] leading-[1.15] text-accent text-balance">
        {line}
      </h1>
    </header>
  );
}

export default DashboardGreeting;
