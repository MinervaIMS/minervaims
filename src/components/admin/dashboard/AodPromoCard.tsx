import { useState } from 'react';

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
// AND IT IS ALREADY THE RIGHT SHAPE. The first version framed a 3:4
// PORTRAIT inside a landscape panel, so `object-cover` had to throw away
// more than half the height and it took faces with it. The file is now a
// LANDSCAPE crop of the same photograph, 1200x710, framed on the group:
// its 1.69 ratio is within a few per cent of the panel's, so on a wide
// card almost the whole picture survives and every one of the seven
// people is in shot, with the association's roll-up banner beside them.
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
const AOD_PHOTO_SRC = '/media/aod/association-on-display.jpg';

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

export function AodPromoCard({ date }: { date: string | null }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = !photoFailed;

  return (
    <div className="relative h-full w-full flex flex-col sm:block text-left">
      {showPhoto && (
        // A BAND ACROSS THE TOP ON A PHONE, THE RIGHT-HAND SIDE ON A WIDE
        // CARD. Not the same composition scaled down: on a phone the
        // sentence needs the full width, so the photograph takes a band
        // and dissolves downward into the purple instead of sideways.
        <div className="relative shrink-0 h-[36%] w-full sm:absolute sm:inset-0 sm:left-[36%] sm:h-auto">
          {/* The framing point differs by breakpoint because the frame
              does. A wide card is almost exactly the crop's own shape, so
              it is centred and nothing is lost; a phone's band is much
              wider than it is tall, so it is framed high, on the faces. */}
          <img
            src={AOD_PHOTO_SRC}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-[50%_30%] sm:object-center"
          />
          {/* The dissolve. Two gradients rather than one rotated one, so
              each direction is exactly right at its own breakpoint. */}
          <div
            aria-hidden="true"
            className="sm:hidden absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-accent via-accent/62 to-transparent"
          />
          <div
            aria-hidden="true"
            className="hidden sm:block absolute inset-y-0 left-0 w-[64%] bg-gradient-to-r from-accent via-accent/65 to-transparent"
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
        className={`relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden p-5 sm:p-6 sm:h-full ${
          showPhoto ? 'sm:w-[62%]' : 'sm:w-full'
        }`}
      >
        {/* Sized so the whole sentence, the gap and the action all stand
            inside the card at every width. `min-h-0` with the column's
            `overflow-hidden` means that if a very narrow phone ever runs
            out of room, it is the tail of the sentence that gives way and
            never the action. */}
        <h3 className="min-h-0 font-serif text-accent-foreground text-[19px] sm:text-[22px] xl:text-[24px] leading-[1.22] text-balance">
          {aodSentence(date)}
        </h3>
        {/* The site's button language, and EXACTLY the block the report
            state uses: same height, same padding, same serif, same
            inversion on hover, at the same distance from the foot. */}
        <div className="mt-auto shrink-0 pt-5">
          <span
            className="inline-flex w-fit items-center justify-center h-11 px-6 rounded-md
                       border border-background bg-background
                       font-serif text-[15px] text-accent whitespace-nowrap
                       transition-colors duration-200
                       group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-background"
          >
            Register Participation
          </span>
        </div>
      </div>
    </div>
  );
}

export default AodPromoCard;
