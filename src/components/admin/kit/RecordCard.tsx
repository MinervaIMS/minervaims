import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// =====================================================================
// A register's rows on a phone, one card each (Step 98 kit).
// ---------------------------------------------------------------------
// A table four screens wide puts the column that matters off the edge
// and the action after it. On a phone each row becomes a card:
//
//   the name, as the title, with the status on the right;
//   one or two lines of what is read most;
//   every other column in "Details", folded, so nothing is lost;
//   the row's own action at the foot, 44 px tall.
//
// The table stays as it is on a computer: `RecordList` is hidden from
// `lg` up and the page hides its table below it, so each reader gets
// one of the two and the data under both is the same.
// =====================================================================

export function RecordList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y divide-separator border border-separator lg:hidden">
      {children}
    </ul>
  );
}

export function RecordCard({ title, meta, aside, lines, details, actions }: {
  /** The name of the record. */
  title: ReactNode;
  /** One small line under the title (an email address). */
  meta?: ReactNode;
  /** On the right of the title: the status. */
  aside?: ReactNode;
  /** One or two lines of the fields read most. */
  lines?: ReactNode;
  /** Everything else the row holds, folded under "Details". */
  details?: ReactNode;
  /** The row's actions, at the foot. */
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="px-3 py-3 font-body text-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-base text-foreground">{title}</div>
          {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
        </div>
        {/* At most under half the width, so a long status wraps in its own
            column rather than squeezing the name and the address. */}
        {aside && <div className="max-w-[45%] shrink-0 text-right">{aside}</div>}
      </div>
      {lines && <div className="mt-2 space-y-1 text-sm text-foreground">{lines}</div>}
      {details && (
        <>
          <button
            type="button"
            data-ro
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex h-11 items-center gap-1 text-xs text-accent"
          >
            {open ? 'Fewer details' : 'Details'}
            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <dl id={id} hidden={!open} className="pb-2">{details}</dl>
        </>
      )}
      {actions && <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div>}
    </li>
  );
}

/** A label and its value inside "Details". */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 py-1 text-sm">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

export default RecordCard;
