import type { ReactNode } from 'react';

// =====================================================================
// The card of the Career pages: the same rounded, bordered card with a
// serif title and a rule under it that My Profile uses, so the section
// reads as part of the workspace rather than as a new design.
//
// `scroll` makes the card's BODY scroll inside it on a computer, with the
// title fixed, which is what lets a Career page fit the screen instead of
// growing past it (see CareerPage). Below `lg` it does nothing: the cards
// stack at their natural height and the page scrolls, as on My Profile.
// =====================================================================

export function CareerCard({
  title, subtitle, action, children, className = '', bodyClassName = '', scroll = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
}) {
  return (
    <section className={`w-full min-w-0 rounded-xl border border-separator bg-background p-5 flex flex-col ${scroll ? 'lg:min-h-0' : ''} ${className}`}>
      <div className="mb-4 pb-3 border-b border-separator shrink-0">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-xl text-accent leading-tight min-w-0">{title}</h2>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
        {subtitle && <div className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">{subtitle}</div>}
      </div>
      <div className={`font-body min-w-0 flex-1 flex flex-col ${scroll ? 'lg:min-h-0 lg:ws-card-scroll lg:-mr-2 lg:pr-2' : ''} ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}

/** A numbered step, for the "how it works" lists. */
export function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground font-body text-xs tabular-nums">{n}</span>
      <span className="text-sm text-foreground leading-relaxed min-w-0">{children}</span>
    </li>
  );
}

export default CareerCard;
