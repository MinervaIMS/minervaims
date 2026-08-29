import { Link } from 'react-router-dom';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import AodPromoCard from './AodPromoCard';
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
      return { kind: 'workspace', section: 'events', sub: 'events-on-display', label: 'Register Participation' };
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

  // ASSOCIATION ON DISPLAY TAKES THE WHOLE CARD. It is the one state that
  // is a promotion rather than a notice, so it gets its own composition
  // edge to edge instead of the text-and-preview layout. Everything about
  // it is still live: it only appears while a day's registration is open,
  // and the day is in the sentence.
  // ---------------------------------------------------------------------
  // The pieces, defined once and composed twice.
  //
  // A PHONE IS NOT A NARROW DESKTOP. The desktop card is a cover beside a
  // column of text, which is right at 400px of width and wrong at 300: the
  // cover took 38% of the card, the title wrapped to two lines in what was
  // left, the description was cut mid-word ("Minerva Investment..."), and
  // `mt-auto` then dropped the button into a band of empty purple below.
  //
  // The phone gets its own arrangement instead: a compact top row where the
  // cover sits beside the title and the date, the description underneath at
  // the FULL width of the card, and the action anchored across the foot.
  // The description gains about a hundred points of measure that way, which
  // is the difference between two truncated lines and two whole ones.
  //
  // Both arrangements are built from the same five constants, so the phone
  // and the desktop cannot drift apart in what they say.
  // ---------------------------------------------------------------------
  // `fit` names WHICH AXIS THE BOX CONSTRAINS, and it has to be given
  // rather than inferred: on a phone the row has a fixed height and the
  // cover takes it (`h-full`); on a desktop the column has a fixed width
  // and the cover takes that (`w-full`). Setting both and letting `max-*`
  // decide produces a box that is neither - 210 by 370 rather than 210 by
  // 297 - because the cap wins over the aspect ratio.
  const cover = (size: string, fit: 'h-full' | 'w-full') => (
    <div className={`shrink-0 flex items-center justify-center ${size}`}>
      {update.imageUrl ? (
        // A poster has intrinsic proportions, so `object-contain` inside the
        // box is enough: it fits, centred, undistorted.
        <img
          src={update.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="max-h-full max-w-full w-auto h-auto object-contain rounded-md shadow-[0_6px_18px_-8px_hsl(var(--overlay)/0.6)]"
        />
      ) : (
        // A PDF THUMBNAIL HAS NO INTRINSIC SIZE, and that is what broke the
        // phone card. PdfThumbnail does not measure its container: it sets
        // the canvas to `renderWidth` by the A4 ratio, in device pixels, and
        // the canvas is `w-full h-full` of a wrapper that was being given
        // `w-auto h-auto` with `max-*` caps. An automatically sized box round
        // a canvas whose intrinsic width is 400 physical pixels on a retina
        // phone is not a 100px cover; it filled the card and pushed the title
        // and the button out of it.
        //
        // The box is now DEFINITE: the constrained axis is the one it is
        // given, and the other follows from the PAGE'S OWN RATIO, which
        // `PdfThumbnail` sets on itself as an inline `aspect-ratio` (A4
        // until the first page has been read, then whatever the document
        // actually is). Nothing here depends on what the canvas turns out
        // to measure, so the composition holds whether the PDF renders,
        // fails or has not arrived yet.
        //
        // The extra wrapper this used to have is gone. It forced
        // `aspect-[1/1.4142]`, which meant a cover that is not A4 was
        // squeezed into an A4 frame - the very thing this is meant to
        // prevent. The thumbnail IS the box now; the two `max-*` caps stay,
        // because a cap beats an aspect ratio and that is what keeps a wide
        // cover inside the card rather than pushing the text out of it.
        <PdfThumbnail
          url={update.pdfUrl!}
          alt=""
          renderWidth={200}
          className={`${fit} max-h-full max-w-full rounded-md shadow-[0_6px_18px_-8px_hsl(var(--overlay)/0.6)]`}
        />
      )}
    </div>
  );

  const title = (cls: string) => (
    <h3 className={`shrink-0 font-serif leading-[1.16] ${cls}`}>{update.title}</h3>
  );
  const detail = (cls: string) => (update.detail ? (
    <p className={`min-h-0 overflow-hidden leading-[1.45] text-accent-foreground/80 ${cls}`}>{update.detail}</p>
  ) : null);
  const when = (cls: string) => (update.date ? (
    <span className={`shrink-0 text-accent-foreground/70 ${cls}`}>{formatDate(update.date)}</span>
  ) : null);
  // The site's button language: white fill and purple label, and on hover the
  // full inversion to the deep purple with a white border. No icon: the
  // site's buttons do not carry one.
  const cta = (cls: string) => (
    <span
      className={`inline-flex items-center justify-center h-11 px-6 rounded-md
                  border border-background bg-background
                  font-serif text-[15px] text-accent whitespace-nowrap
                  transition-colors duration-200
                  group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-background ${cls}`}
    >
      {target.label}
    </span>
  );

  // ASSOCIATION ON DISPLAY TAKES THE WHOLE CARD. It is the one state that
  // is a promotion rather than a notice, so it gets its own composition
  // edge to edge instead of the text-and-preview layout. Everything about
  // it is still live: it only appears while a day's registration is open,
  // and the day is in the sentence.
  const body = update.kind === 'aod' ? (
    <AodPromoCard date={update.date} />
  ) : (
    <>
      {/* ---- Phone: cover beside the title, then the full-width text ---- */}
      <div className="sm:hidden h-full w-full p-5 font-body flex flex-col text-left">
        <div className={`flex items-start ${hasImage ? 'gap-4' : ''}`}>
          {/* A fixed HEIGHT here rather than a width: whatever the cover's
              proportions, the row is the same depth, so the text beside it
              always starts and ends in the same place. */}
          {hasImage && cover('h-[8.5rem] w-[6.05rem]', 'h-full')}
          <div className="min-w-0 flex-1">
            {title('text-[21px] line-clamp-3')}
            {when('mt-2 block text-[13px]')}
          </div>
        </div>

        {/* THE FULL WIDTH OF THE CARD, not what is left beside a cover. */}
        {detail('mt-3.5 text-[13px] line-clamp-3')}

        {/* Anchored across the foot: a full-width bar reads as the card's
            action, where a small button floating in purple did not. */}
        <div className="mt-auto shrink-0 pt-4">{cta('w-full')}</div>
      </div>

      {/* ---- Tablet and desktop: unchanged ----------------------------- */}
      <div className={`hidden sm:flex h-full w-full p-5 sm:p-6 font-body ${hasImage ? 'gap-5 sm:gap-6' : ''} text-left`}>
        {/* A fixed WIDTH and a free height: the picture decides its own
            proportions inside the column and is centred in what it leaves,
            so a portrait poster and an A4 cover both fit undistorted. */}
        {hasImage && cover('w-[38%] max-w-[210px]', 'w-full')}

        {/* THE CONTENT COLUMN IS ALIGNED TO THE COVER, top and bottom.
            The title's first line starts at the top edge of the cover; the
            description and the date follow it immediately, keeping their
            own spacing; the slack is collected by `mt-auto` into one wide
            band of purple ABOVE the action; and the action itself sits at
            the foot of the column, level with the bottom of the cover.

            IT HOLDS AT EVERY CARD HEIGHT. The title, the date and the
            action are `shrink-0`, so none of them can ever be squeezed or
            clipped; the description is the one flexible element, and on a
            short window it gives up its second line rather than pushing
            anything out of the card. */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          {title('text-[24px] line-clamp-2')}
          {detail('mt-3 text-sm line-clamp-2')}
          {when('mt-2.5 block text-[13px]')}
          <div className="mt-auto shrink-0 pt-5">{cta('w-fit')}</div>
        </div>
      </div>
    </>
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
