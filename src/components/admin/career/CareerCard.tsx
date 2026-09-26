import type { ReactNode } from 'react';

// =====================================================================
// The card of the Career pages: the same rounded, bordered card with a
// serif title and a rule under it that My Profile uses, so the new
// section reads as part of the workspace rather than as a new design.
// =====================================================================

export function CareerCard({
  title, subtitle, icon, action, children, className = '', bodyClassName = '',
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`w-full min-w-0 rounded-xl border border-separator bg-background p-5 sm:p-6 flex flex-col ${className}`}>
      <div className="mb-4 pb-3 border-b border-separator shrink-0">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-xl text-accent leading-tight min-w-0 flex items-center gap-2">
            {icon && <span className="shrink-0 text-accent">{icon}</span>}
            <span className="min-w-0">{title}</span>
          </h2>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {subtitle && <div className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">{subtitle}</div>}
      </div>
      <div className={`font-body min-w-0 flex-1 flex flex-col ${bodyClassName}`}>{children}</div>
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
