import { useMemo } from 'react';
import minervaMark from '@/assets/legal-hero-logo.svg';
import { pickGreeting, type GreetingVars } from './greetings';

// =====================================================================
// The greeting.
// ---------------------------------------------------------------------
// One shared pool for the whole association: the line a first-week
// analyst reads is the line the President reads. The copy lives in
// `greetings.ts` and is used verbatim; nothing here paraphrases it.
//
// The mark is the full Minerva roundel. It NEVER compresses the greeting:
// above the `sm` breakpoint it sits at the right of the same row, and
// below it moves onto its own line above the text rather than squeezing
// the heading into a column.
// =====================================================================

export function DashboardGreeting({ userId, vars, ready }: { userId: string; vars: GreetingVars; ready: boolean }) {
  // Recomputed only when a variable actually resolves, so the line does
  // not flicker between pool members as the queries land.
  const line = useMemo(() => pickGreeting(new Date(), userId, vars), [userId, vars]);

  return (
    <header className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6 animate-in fade-in slide-in-from-top-1 duration-500 motion-reduce:animate-none">
      {/* Sized so the longest line in the pool holds to three lines on a
          phone and one on a wide screen. */}
      {ready ? (
        <h1 className="font-serif text-xl sm:text-2xl xl:text-4xl leading-tight text-accent max-w-4xl text-balance">
          {line}
        </h1>
      ) : (
        <span className="block h-7 sm:h-8 xl:h-10 w-full max-w-xl bg-muted/50 animate-pulse" aria-hidden="true" />
      )}
      <img
        src={minervaMark}
        alt="Minerva Investment Management Society"
        className="shrink-0 self-start h-10 w-10 sm:h-16 sm:w-16"
      />
    </header>
  );
}

export default DashboardGreeting;
