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
// The mark is the full Minerva roundel, at a size that holds its own
// against the sentence beside it. BELOW `sm` IT IS NOT DRAWN AT ALL: a
// phone has no width to present it properly, and a roundel shrunk into a
// corner is worse than an absent one.
//
// The block is deliberately short. It sits directly under the workspace
// breadcrumb with no spacer of its own, because the gap that opened
// there was empty height on the one screen that has none to spare.
// =====================================================================

export function DashboardGreeting({ userId, vars }: { userId: string; vars: GreetingVars }) {
  const line = useMemo(() => pickGreeting(new Date(), userId, vars), [userId, vars]);

  return (
    <header className="shrink-0 flex items-center justify-between gap-6">
      <h1 className="font-serif text-lg sm:text-2xl xl:text-[2rem] leading-[1.15] text-accent max-w-3xl text-balance">
        {line}
      </h1>
      <img
        src={minervaMark}
        alt="Minerva Investment Management Society"
        className="hidden sm:block shrink-0 h-[68px] w-[68px] xl:h-[84px] xl:w-[84px]"
      />
    </header>
  );
}

export default DashboardGreeting;
