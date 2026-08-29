import { useState, useLayoutEffect, useRef } from 'react';
import { HIGH_FETCH_PRIORITY } from '@/lib/fetch-priority';

// =====================================================================
// Association on Display, as the Dashboard's current happening.
// ---------------------------------------------------------------------
// This is NOT a picture of a banner. It is the banner, composed at run
// time from the association's own photograph and a sentence that reads
// the live registration state: deep purple on the left, the stand on the
// right, and a long dissolve between the two so neither edge is a seam.
//
// EVERYTHING VARIABLE IS VARIABLE. The date comes from the `aod_days`
// row whose registration is open, and the phrasing follows it: "today",
// "tomorrow", or "on the 14th of October". When the day passes or
// registration closes, the row stops qualifying upstream and the card
// falls back to whatever is next in the priority chain. Nothing here is
// hard coded, and there is no image of text anywhere.
//
// THE PHOTOGRAPH KEEPS ITS OWN PROPORTIONS. It is never stretched: it
// fills its frame by `object-cover` at its natural aspect ratio.
//
// AND THE PANEL IS SIZED TO THE PICTURE, which is what stops it looking
// zoomed in. `object-cover` scales by whichever of the two ratios is
// larger, so a panel WIDER than the photograph is the thing that crops
// its height: at 64% of the card the panel was about 1.7 to 2.0 wide for
// a 4:3 photograph and threw away a quarter to a third of it, heads
// included. Narrowing the panel to 54% brings the two ratios close
// enough that almost the whole photograph survives, and the framing
// point is set high rather than centred so what little is lost comes off
// the ground and not off the faces.
// =====================================================================

/**
 * The stand photograph, cropped to the group. It lives in `public/`, so
 * it is served as-is and nothing has to be imported or bundled.
 *
 * IF IT IS ABSENT the card still works: the purple runs the full width,
 * the sentence and the action stay exactly where they are, and no broken
 * image is ever shown. The photograph is an enrichment, not a
 * requirement.
 */
const AOD_PHOTO_SRC = '/media/aod/association-on-display.webp';
/** JPEG of the same crop, for anything that cannot decode WebP. */
const AOD_PHOTO_FALLBACK_SRC = '/media/aod/association-on-display.jpg';

/** 1st, 2nd, 3rd, 4th ... */
function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * How the sentence names the day, INCLUDING its preposition, because the
 * preposition depends on the day. "on the 14th of October" is right most
 * of the time, but "on today" is not English, so the two days a member is
 * most likely to be reading this get the words they would actually use.
 */
function aodWhen(date: string): string {
  const event = new Date(date);
  if (Number.isNaN(event.getTime())) return '';
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(event.getFullYear(), event.getMonth(), event.getDate()).getTime();
  const days = Math.round((day - midnight) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `on the ${ordinal(event.getDate())} of ${event.toLocaleDateString('en-GB', { month: 'long' })}`;
}

/** The whole sentence, with the day already in it. */
function aodSentence(date: string | null): string {
  const when = date ? aodWhen(date) : '';
  return `Come share what Minerva means to you at Association on Display${when ? ` ${when}` : ''}, `
    + 'and help others discover what we\u2019re all about!';
}

/** The action's own height (h-11) plus the gap above it (pt-5). */
const ACTION_BLOCK_PX = 44 + 20;

export function AodPromoCard({ date }: { date: string | null }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = !photoFailed;

  // ═══════════════════════════════════════════════════════════════════
  // WHEN THE SENTENCE AND THE ACTION CANNOT BOTH FIT, THE ACTION MOVES.
  // -------------------------------------------------------------------
  // The two used to be stacked in one column: the sentence at the top,
  // the action pushed to the foot by `mt-auto`. On a short card that
  // column ran out of height, and because the heading carried `min-h-0`
  // its BOX shrank while its TEXT kept flowing - so the last line of the
  // sentence was painted straight over the white button.
  //
  // Two changes, and they do different jobs. The heading now clips its
  // own overflow, so text can never be drawn over the action whatever
  // happens. And when there is genuinely not enough height for both, the
  // action leaves the column and sits over the photograph on the right,
  // which gives the sentence the whole column and puts the button on the
  // one part of the card that has room to spare.
  //
  // THE MEASUREMENT CANNOT OSCILLATE. What is compared is the sentence's
  // natural height plus a CONSTANT for the action against the column's
  // own height. The column's height does not change when the action
  // leaves it, and the sentence's width does not either, so the answer is
  // stable: there is no state in which moving the button makes it fit and
  // fitting moves it back.
  // ═══════════════════════════════════════════════════════════════════
  const columnRef = useRef<HTMLDivElement>(null);
  const sentenceRef = useRef<HTMLHeadingElement>(null);
  const [actionOnPhoto, setActionOnPhoto] = useState(false);

  useLayoutEffect(() => {
    const column = columnRef.current;
    const sentence = sentenceRef.current;
    if (!column || !sentence) return;

    const measure = () => {
      // Only on a wide card: below `sm` the photograph is a band across
      // the top, so there is no right-hand side to move the action to.
      const wide = window.matchMedia('(min-width: 640px)').matches;
      if (!wide) { setActionOnPhoto(false); return; }
      const style = getComputedStyle(column);
      const inner = column.clientHeight
        - parseFloat(style.paddingTop || '0')
        - parseFloat(style.paddingBottom || '0');
      if (inner <= 0) return;
      setActionOnPhoto(sentence.scrollHeight + ACTION_BLOCK_PX > inner);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(column);
    ro.observe(sentence);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [date, showPhoto]);

  const action = (
    <span
      className="inline-flex w-fit items-center justify-center h-11 px-6 rounded-md
                 border border-background bg-background
                 font-serif text-[15px] text-accent whitespace-nowrap
                 transition-colors duration-200
                 group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-background"
    >
      Register Participation
    </span>
  );

  return (
    <div className="relative h-full w-full flex flex-col sm:block text-left">
      {showPhoto && (
        // A BAND ACROSS THE TOP ON A PHONE, THE RIGHT-HAND SIDE ON A WIDE
        // CARD. Not the same composition scaled down: on a phone the
        // sentence needs the full width, so the photograph takes a band
        // and dissolves downward into the purple instead of sideways.
        // ON A WIDE CARD THE PANEL IS THE PHOTOGRAPH'S OWN SHAPE. The card
        // is roughly 2.3 wide for its height, so a half-card panel filled
        // by `object-cover` threw away two fifths of a 4:3 photograph.
        // Giving the panel the picture's aspect ratio instead — full
        // height, width following from it, pinned to the right edge —
        // means `object-cover` has nothing left to crop: the whole
        // photograph is on screen, still bleeding to the card's edge.
        <div className="relative shrink-0 h-[40%] w-full sm:absolute sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-auto sm:aspect-[4/3]">
          {/* The framing point differs by breakpoint because the frame
              does. A wide card is almost exactly the crop's own shape, so
              it is centred and nothing is lost; a phone's band is much
              wider than it is tall, so it is framed high, on the faces. */}
          <img
            src={AOD_PHOTO_SRC}
            alt=""
            aria-hidden="true"
            decoding="async"
            {...HIGH_FETCH_PRIORITY}
            onError={(e) => {
              // WebP first for weight; the JPEG of the same crop is tried
              // once before the card gives the purple the full width.
              const img = e.currentTarget;
              if (!img.src.endsWith(AOD_PHOTO_FALLBACK_SRC)) img.src = AOD_PHOTO_FALLBACK_SRC;
              else setPhotoFailed(true);
            }}
            className="absolute inset-0 h-full w-full object-cover object-[50%_28%]"
          />

          {/* The dissolve. Two gradients rather than one rotated one, so
              each direction is exactly right at its own breakpoint. */}
          <div
            aria-hidden="true"
            className="sm:hidden absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-accent via-accent/62 to-transparent"
          />
          <div
            aria-hidden="true"
            className="hidden sm:block absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-accent via-accent/62 to-transparent"
          />
        </div>
      )}

      {/* THE SENTENCE STARTS AT THE TOP, and the action sits at the foot,
          which is the same skeleton the latest-report state uses: a
          `shrink-0` line at the top, all the slack collected by `mt-auto`
          into one band above the action, and the action itself last.
          Centring the pair left the sentence floating in the middle of
          the purple with nothing anchoring either end. */}
      <div
        ref={columnRef}
        className={`relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden p-5 sm:p-6 sm:h-full ${
          showPhoto ? 'sm:w-[58%]' : 'sm:w-full'
        }`}
      >
        {/* `overflow-hidden` HERE, not only on the column. A heading that is
            allowed to shrink below its content still PAINTS that content,
            and the thing directly beneath it is the action - which is how
            the last line of the sentence came to be drawn across the white
            button. Clipping its own box means the tail of a sentence can
            give way, quietly, and the action is never touched. */}
        <h3
          ref={sentenceRef}
          className="min-h-0 overflow-hidden font-serif text-accent-foreground text-[19px] sm:text-[22px] xl:text-[24px] leading-[1.22] text-balance"
        >
          {aodSentence(date)}
        </h3>
        {/* The site's button language, and EXACTLY the block the report
            state uses: same height, same padding, same serif, same
            inversion on hover, at the same distance from the foot. It is
            rendered here only while there is room for it; otherwise it is
            the copy over the photograph below. */}
        {!actionOnPhoto && <div className="mt-auto shrink-0 pt-5">{action}</div>}
      </div>

      {/* THE ACTION, OVER THE PHOTOGRAPH. Only when the sentence needs the
          whole column, and only on a wide card, where the picture is the
          right-hand panel. It is pinned to the panel's bottom-right corner,
          inside the same padding the column uses, and it keeps every one of
          the button's own styles including the hover inversion - it is the
          same element, in a different place. */}
      {actionOnPhoto && (
        <div className="pointer-events-none absolute bottom-6 right-6 z-20 hidden sm:block">
          {action}
        </div>
      )}
    </div>
  );
}

export default AodPromoCard;
