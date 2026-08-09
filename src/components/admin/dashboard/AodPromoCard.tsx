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
// fills its frame by `object-cover` at its natural aspect ratio, and the
// framing point is chosen so the whole group stays in shot with the
// association's banner beside them.
// =====================================================================

/**
 * The stand photograph. It lives in `public/`, so it is served as-is and
 * nothing has to be imported or bundled.
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
 * How the sentence names the day. A date is right most of the time, but
 * "on the 9th of August" on the 9th of August reads like a mistake, so
 * the two days a member is most likely to be reading this get the words
 * they would actually use.
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
  return `Tell students what Minerva is for you at Association on Display${when ? ` ${when}` : ''}!`;
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
          <img
            src={AOD_PHOTO_SRC}
            alt=""
            aria-hidden="true"
            decoding="async"
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-[50%_43%]"
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

      <div
        className={`relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-4 sm:gap-5 p-5 sm:p-6 sm:h-full ${
          showPhoto ? 'sm:w-[62%]' : 'sm:w-full'
        }`}
      >
        <h3 className="font-serif text-accent-foreground text-[21px] sm:text-[25px] xl:text-[29px] leading-[1.2] text-balance">
          {aodSentence(date)}
        </h3>
        {/* The site's button language: white fill, purple label, set in the
            serif, no icon, and the full inversion on hover. */}
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
  );
}

export default AodPromoCard;
