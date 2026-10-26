import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// =====================================================================
// The pieces My Profile is built from (Step 97B).
// ---------------------------------------------------------------------
// ProfileCard, Field, Bullets and Group are the ones the page has always
// used, moved here unchanged so the applicant's profile looks exactly as
// it did. The rest are the vocabulary of the three member pages: a
// summary row with its own action, a status chip, a list that shows its
// first items and offers the rest, an empty state that says what will
// appear and where it comes from, and a section that opens and closes.
// Nothing here adds a colour or a typeface: the accent, the hairline and
// the two families of the design system.
// =====================================================================

export function Field({ label, value }: { label: string; value: string }) {
  return (
    // `min-w-0` and `break-words` together: an email address is one unbroken
    // token, and without both of them it sets the card's minimum width and
    // everything else is pushed out of the frame with it.
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-foreground text-sm break-words">{value || 'Not set'}</div>
    </div>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-foreground leading-relaxed">
          <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-accent shrink-0" />
          <span className="text-foreground/85">{t}</span>
        </li>
      ))}
    </ul>
  );
}

// =====================================================================
// The profile is built from ONE card shape.
// ---------------------------------------------------------------------
// The same rounded container, the same hairline, the same padding and the
// same serif heading on every page, so the three pages read as one
// instrument rather than as a stack of unrelated panels. Rounded corners
// and the separator hairline are the workspace's own card, as used on the
// Dashboard.
// =====================================================================
export function ProfileCard({ title, titleItalic = false, subtitle, action, children, className = '', scrollBody = false, headingId }: {
  title: string;
  /** Set the heading in italic. Used where the title is a person's role. */
  titleItalic?: boolean;
  /**
   * The line that qualifies the title - a division, an organ, a body. It
   * belongs to the header, not to the body, so it can never be clipped by
   * a scrolling body or scroll away with it.
   */
  subtitle?: string;
  /** A single action, aligned to the right of the heading. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * On a laptop, let the card's CONTENT scroll inside it. Used by the
   * applicant's profile, whose four quarters fill the screen; the member
   * pages flow at their natural height instead. Below `lg` it does nothing.
   */
  scrollBody?: boolean;
  /** Names the section after its heading, for assistive technology. */
  headingId?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={`w-full rounded-xl border border-separator bg-background p-5 sm:p-6 ${
        scrollBody ? 'flex flex-col lg:min-h-0' : ''
      } ${className}`}
    >
      <div className="mb-4 pb-3 border-b border-separator shrink-0">
        <div className="flex items-start justify-between gap-3">
          <h2 id={headingId} className={`font-serif text-xl text-accent leading-tight min-w-0 ${titleItalic ? 'italic' : ''}`}>{title}</h2>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {subtitle && (
          <div className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {scrollBody ? (
        <div className="lg:ws-card-scroll lg:min-h-0 lg:-mr-2 lg:pr-2">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

/** A hairline-topped group inside a card, for its secondary sections. */
export function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2 pb-1.5 border-b border-separator">
        {label}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------
export type Tone = 'positive' | 'waiting' | 'negative' | 'neutral' | 'accent';

// The tones the commitment register already uses (CommitmentBoard), so a
// "Pending" here is the same "Pending" a Head of Division reads there.
const TONE: Record<Tone, string> = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  waiting: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  negative: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  neutral: 'bg-muted text-muted-foreground border-separator',
  accent: 'bg-accent/5 text-accent border-accent/30',
};

export function StatusChip({ tone, children, className = '' }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-xs border ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------
// A summary row: what it is, what it says, and the one thing to do.
// ---------------------------------------------------------------------
// Read first, change on request. The value is shown as text, and its
// action ("Change", "Add") opens the field in place; the row is a <div>
// inside a <dl> so the label and the value stay a pair for a screen
// reader whichever state the row is in.
export function SummaryRow({ label, children, action, hint }: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
  /** One short line under the value: what it is for, or why it is fixed. */
  hint?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3.5 first:pt-0 last:pb-0">
      <dt className="col-span-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground break-words">{children}</dd>
      <dd className="row-span-2 self-start justify-self-end">{action}</dd>
      {hint && <dd className="col-start-1 text-xs leading-relaxed text-muted-foreground">{hint}</dd>}
    </div>
  );
}

// ---------------------------------------------------------------------
// A list that shows its first items and offers the rest.
// ---------------------------------------------------------------------
// A Head's responsibilities run to nine or ten lines. The first few say
// what the role is; the rest are one press away, with their number on the
// button, so the reader knows what they are not yet reading.
export function ShowMore<T>({ items, initial, render, noun, className = '', as: List = 'ul' }: {
  items: T[];
  initial: number;
  /** Each item, as an `<li>`. */
  render: (item: T, index: number) => ReactNode;
  /** What the items are, for the button: "responsibilities", "reports". */
  noun: string;
  className?: string;
  as?: 'ul' | 'ol';
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // Hiding a single item saves nothing and costs a press: the list folds
  // only when at least two would wait behind the button.
  const foldable = items.length > initial + 1;
  const shown = open || !foldable ? items : items.slice(0, initial);
  return (
    <>
      <List id={id} className={className}>{shown.map(render)}</List>
      {foldable && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-accent underline-offset-4 hover:underline lg:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {open ? 'Show fewer' : `Show all ${items.length} ${noun}`}
          <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// A section that opens and closes: secondary reading, one level deep.
// ---------------------------------------------------------------------
export function Disclosure({ title, children, defaultOpen = false, meta }: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** A short note beside the title, such as a count or an article. */
  meta?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-t border-separator">
      <h3 className="font-body">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={meta ? `${title}, ${meta}` : undefined}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm text-foreground hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="min-w-0">
            <span className="font-semibold">{title}</span>
            {meta && <span className="ml-2 text-xs text-muted-foreground">{meta}</span>}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </h3>
      <div id={id} hidden={!open} className="pb-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// An empty state that explains, rather than a blank.
// ---------------------------------------------------------------------
// What will appear here, where it comes from, and what to do about it if
// anything: an empty list is the first thing a new member sees on two of
// these pages, and it should read as "not yet", not as "broken".
export function EmptyState({ icon, title, children, action }: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-dashed border-separator px-4 py-4">
      <div className="mt-0.5 shrink-0 text-accent" aria-hidden="true">{icon}</div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
        {action && <div className="pt-1.5">{action}</div>}
      </div>
    </div>
  );
}

/** The small caps label over a block inside a card. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] uppercase tracking-wider text-accent font-semibold ${className}`}>{children}</div>;
}

/** 12 April 2027. */
export const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
/** April 2027. */
export const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
