import { ExternalLink } from 'lucide-react';
import type { DeclarationText } from '@/lib/declaration-text';

// =====================================================================
// The words of a signed text, exactly as they are signed (Step 97B).
// ---------------------------------------------------------------------
// The opening line, the numbered clauses, the closing line and, where the
// text refers to a page (the one-association declaration names Bocconi's
// list of student associations), the link to that page. Every place that
// shows a declaration or a commitment draws it with this, so the Join
// page, the offer, the commitment, the settings and the copy a member
// reads back can never differ by a word.
// =====================================================================

export function DeclarationBody({ text, className = '', clauseSpacing = 'space-y-1' }: {
  text: Pick<DeclarationText, 'intro' | 'clauses' | 'closing' | 'source'>;
  className?: string;
  /** The gap between clauses: tighter in a dialog, looser on a page. */
  clauseSpacing?: string;
}) {
  return (
    <div className={className}>
      <p>{text.intro}</p>
      <ol className={`list-decimal pl-5 ${clauseSpacing}`}>{text.clauses.map((c) => <li key={c}>{c}</li>)}</ol>
      {text.closing && <p>{text.closing}</p>}
      {text.source && (
        <p>
          <a
            href={text.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-baseline gap-1 text-accent underline underline-offset-2"
          >
            {text.source.label}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 self-center" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
      )}
    </div>
  );
}
