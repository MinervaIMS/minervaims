import { useEffect, useState } from 'react';
import { ONE_ASSOCIATION } from '@/lib/declaration-text';
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
          <details className="group border border-separator">
            <summary className="cursor-pointer select-none px-5 py-4 font-body text-body text-accent">
              {JOIN_DECLARATION.readLabel}
            </summary>
            <div className="px-5 pb-5 font-body text-body text-foreground space-y-3">
              <p>{ONE_ASSOCIATION.intro}</p>
              <ol className="list-decimal pl-5 space-y-2">{ONE_ASSOCIATION.clauses.map((c) => <li key={c}>{c}</li>)}</ol>
              <p>{ONE_ASSOCIATION.closing}</p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
