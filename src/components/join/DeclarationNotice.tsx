import { useEffect, useState } from 'react';
import { ONE_ASSOCIATION, BOCCONI_ASSOCIATIONS_URL } from '@/lib/declaration-text';
import { DeclarationBody } from '@/components/shared/DeclarationBody';
import { declarationSwitches, type DeclarationSwitches } from '@/lib/declarations-api';
import { JOIN_DECLARATION, joinDeclarationParagraphs } from '@/lib/join-content';

// =====================================================================
// THE ONE-ASSOCIATION DECLARATION, explained on /join (Step 97).
// ---------------------------------------------------------------------
// Present only while "Explained on the Join page" is switched on in
// Recruiting > Application Page; otherwise the page is exactly as before.
// The switches are read on their own, so a database without them simply
// shows nothing. The full text is the one candidates sign
// (declaration-text.ts), behind a disclosure. Half rhythm at both ends: it
// continues the admissions sequence above it.
// =====================================================================
export default function DeclarationNotice() {
  const [switches, setSwitches] = useState<DeclarationSwitches | null>(null);
  useEffect(() => {
    let live = true;
    declarationSwitches().then((s) => { if (live) setSwitches(s); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!switches?.declaration_on_join) return null;

  return (
    <section aria-labelledby="join-declaration-heading" className="bg-background pt-10 md:pt-16 pb-10 md:pb-16">
      <div className="container">
        <h2 id="join-declaration-heading" className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
          {JOIN_DECLARATION.heading}
        </h2>
        <div className="max-w-3xl space-y-4">
          {joinDeclarationParagraphs(switches.declaration_at_offer, switches.declaration_at_commitment).map((p) => (
            <p key={p} className="font-body text-body-lg text-muted-foreground">{p}</p>
          ))}
          {/* The list the declaration refers to, kept by Bocconi: an
              association created later is covered once it is listed. */}
          <p className="font-body text-body text-muted-foreground">
            <a href={BOCCONI_ASSOCIATIONS_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
              {JOIN_DECLARATION.listLabel}
            </a>
            <span className="sr-only"> (opens in a new tab)</span>
          </p>
          <details className="group border border-separator">
            <summary className="cursor-pointer select-none px-5 py-4 font-body text-body text-accent">
              {JOIN_DECLARATION.readLabel}
            </summary>
            <DeclarationBody text={ONE_ASSOCIATION} className="px-5 pb-5 font-body text-body text-foreground space-y-3" clauseSpacing="space-y-2" />
          </details>
        </div>
      </div>
    </section>
  );
}
