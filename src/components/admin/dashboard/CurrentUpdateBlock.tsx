import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import type { LatestUpdate } from './useDashboardData';

// =====================================================================
// The current update: the one thing on this page that asks for an action.
// ---------------------------------------------------------------------
// No section heading. A card titled "Latest update" above an item that
// already says what it is spends a line saying nothing; the item IS the
// card. What it resolves to is decided upstream, in priority order:
// the membership fee while a collection is open, then Association on
// Display while registration is open, then the next public event, then
// the next internal event, then the latest published report.
//
// THE WHOLE CARD IS THE LINK. It is the only clickable card on the page,
// so there is nothing to hunt for: the surface is the target and it says
// where it goes in its own corner.
//
// AN IMAGE KEEPS ITS OWN PROPORTIONS. A poster is portrait, a cover is
// A4, a landscape photograph is neither, and `object-cover` would crop
// or a fixed box would stretch. The image is given a box and fits INSIDE
// it, so a slightly smaller preview is the price of never distorting
// somebody's poster.
// =====================================================================

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  update: LatestUpdate | null;
  ok: boolean;
  /** Opens a workspace subsection in place. */
  onNavigate?: (section: string, sub: string | null) => void;
}

/** Where this update leads, and how that destination is reached. */
function destination(update: LatestUpdate): { kind: 'workspace'; section: string; sub: string; label: string }
| { kind: 'route'; to: string; label: string }
| { kind: 'external'; href: string; label: string } {
  switch (update.kind) {
    case 'fee':
      return { kind: 'workspace', section: 'operations', sub: 'ops-fee', label: 'Open membership fees' };
    case 'aod':
      return { kind: 'workspace', section: 'events', sub: 'events-on-display', label: 'Open registration' };
    case 'event-public':
      return { kind: 'route', to: '/events', label: 'Open the event' };
    case 'event-internal':
      return { kind: 'workspace', section: 'events', sub: 'events-archive', label: 'Open the event' };
    default:
      return { kind: 'external', href: update.pdfUrl ?? '#', label: 'Open the report' };
  }
}

export function CurrentUpdateBlock({ update, ok, onNavigate }: Props) {
  const shell = 'h-full min-h-0 overflow-hidden rounded-xl border border-accent bg-accent text-accent-foreground';

  if (!ok) {
    return (
      <section className={`${shell} p-4 font-body flex items-center justify-center`}>
        <p className="text-xs text-accent-foreground/70">Update unavailable.</p>
      </section>
    );
  }

  if (!update) {
    return <section className={`${shell} animate-pulse`} aria-hidden="true" />;
  }

  const target = destination(update);
  const hasImage = !!update.imageUrl || !!update.pdfUrl;

  const body = (
    <div className={`h-full w-full p-4 sm:p-5 font-body flex ${hasImage ? 'gap-4 sm:gap-5' : ''} text-left`}>
      {hasImage && (
        // A fixed WIDTH and a free height: the picture decides its own
        // proportions inside the column and is centred in what it leaves.
        <div className="shrink-0 w-[28%] max-w-[132px] flex items-center justify-center">
          {update.imageUrl ? (
            <img
              src={update.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full w-auto h-auto object-contain rounded-md shadow-[0_6px_18px_-8px_hsl(var(--overlay)/0.6)]"
            />
          ) : (
            <PdfThumbnail
              url={update.pdfUrl!}
              alt=""
              renderWidth={200}
              className="max-h-full max-w-full w-auto h-auto object-contain rounded-md shadow-[0_6px_18px_-8px_hsl(var(--overlay)/0.6)]"
            />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1 flex flex-col">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-accent-foreground/70">
          {update.category}
        </span>
        <h3 className="font-serif text-lg sm:text-xl leading-snug mt-1.5 line-clamp-2">{update.title}</h3>
        {update.detail && (
          <p className="text-xs text-accent-foreground/75 mt-2 line-clamp-3">{update.detail}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          {update.date && <span className="text-xs text-accent-foreground/70">{formatDate(update.date)}</span>}
          <span className="inline-flex items-center gap-1 text-xs text-accent-foreground/90 whitespace-nowrap">
            {target.label} <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );

  const interactive = `${shell} block text-left transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft`;

  if (target.kind === 'workspace') {
    return (
      <button type="button" className={interactive} onClick={() => onNavigate?.(target.section, target.sub)}>
        {body}
      </button>
    );
  }
  if (target.kind === 'route') {
    return <Link to={target.to} className={interactive}>{body}</Link>;
  }
  return (
    <a href={target.href} target="_blank" rel="noreferrer" className={interactive}>
      {body}
    </a>
  );
}

export default CurrentUpdateBlock;
