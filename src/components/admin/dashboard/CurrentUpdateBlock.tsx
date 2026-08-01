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
    <div className={`h-full w-full p-5 sm:p-6 font-body flex ${hasImage ? 'gap-5 sm:gap-6' : ''} text-left`}>
      {hasImage && (
        // A fixed WIDTH and a free height: the picture decides its own
        // proportions inside the column and is centred in what it leaves,
        // so a portrait poster and an A4 cover both fit undistorted.
        <div className="shrink-0 w-[38%] max-w-[210px] flex items-center justify-center">
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

      {/* The content column is centred against the preview rather than
          stretched to the card's full height, which is what left a band
          of unused purple under the text and the action stranded at the
          very bottom edge. */}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-3">
        {/* No category heading. The report, the event or the reminder IS
            the content; a label above it saying so spends a line to
            repeat what the next line already says. */}
        <h3 className="font-serif text-[22px] sm:text-[26px] leading-snug line-clamp-3">{update.title}</h3>
        {update.detail && (
          <p className="text-sm sm:text-[15px] leading-relaxed text-accent-foreground/80 line-clamp-4">
            {update.detail}
          </p>
        )}
        {update.date && (
          <span className="text-[13px] text-accent-foreground/70">{formatDate(update.date)}</span>
        )}
        {/* The site's button language: white fill and purple label, and
            on hover the full inversion to the deep purple with a white
            border. No icon: the site's buttons do not carry one. */}
        <span
          className="mt-1 inline-flex w-fit items-center justify-center h-11 px-6 rounded-md
                     border border-background bg-background
                     font-serif text-[15px] text-accent whitespace-nowrap
                     transition-colors duration-200
                     group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-background"
        >
          {target.label}
        </span>
      </div>
    </div>
  );

  // The card does not lighten on hover. The purple is the brand's, and
  // washing it out was the one interaction on this page that did not
  // look like the rest of the site. The button carries the whole state
  // change instead.
  const interactive = `${shell} group block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft`;

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
