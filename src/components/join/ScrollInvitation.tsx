import { JOIN_HERO } from '@/lib/join-content';

/**
 * The invitation that closes the landing stage.
 *
 * It is built from the page's own vocabulary rather than a stock arrow: the
 * hairline rule that sits under every section heading on this site, reused
 * here as two rules flanking the phrase, and then turned through ninety
 * degrees into a vertical rail with a light travelling down it. The light is
 * the only thing that moves, it moves in one direction only, and it fades out
 * before it reaches the end, so the loop has no visible seam and nothing
 * bounces.
 *
 * White carries the composition; the light picks up --accent-soft, the pale
 * violet already used across the site, on its way down.
 *
 * IT IS DELIBERATELY SLIGHT. This is the last thing on the stage and the least
 * important: it should be found by a reader looking for the way down, not
 * compete with the title, the figures or the application card. Every dimension
 * is therefore about a third smaller than it was, and the block as a whole is
 * roughly 87px tall on a wide screen against about 139px before: the phrase is
 * set at 1.3rem rather than 1.7rem, the rail is 36px rather than 64px, the
 * flanking rules are 3.5rem rather than 6rem, the gaps between the three parts
 * are halved, and the violet wash behind it is smaller and weaker so it reads
 * as depth rather than as a panel.
 *
 * It is a real control, not decoration: clicking or pressing it takes the
 * reader to the first section, which is what the words promise.
 */
export function ScrollInvitation({ reduced }: { reduced: boolean }) {
  const goDown = () => {
    const target =
      document.getElementById('join-society-heading')?.closest('section') ?? null;
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
    if (target) {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior });
    } else {
      window.scrollBy({ top: window.innerHeight, behavior });
    }
  };

  const ruleMotion = reduced ? '' : 'motion-safe:animate-cueRule';

  return (
    <button
      type="button"
      onClick={goDown}
      className="group relative flex flex-col items-center gap-2 px-3 py-1 text-background transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-soft))] focus-visible:ring-offset-4 focus-visible:ring-offset-black md:h-sm:gap-1.5"
    >
      {/* A single soft violet wash behind the words. Static: it is depth, not
          motion. Smaller and weaker than it was, so it sits behind the phrase
          instead of reading as a panel the phrase is printed on. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-24 w-[19rem] max-w-[86vw] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--accent-soft)/0.13),transparent_70%)]"
      />

      <span className="flex items-center gap-3 md:gap-4">
        <span
          aria-hidden="true"
          className={`hidden h-px w-10 bg-gradient-to-r from-transparent to-white/80 transition-opacity duration-300 group-hover:opacity-90 sm:block md:w-14 ${ruleMotion}`}
        />
        <span className="font-serif text-[1.05rem] leading-none tracking-[0.01em] text-background sm:text-[1.15rem] md:text-[1.3rem] md:h-sm:text-[1.15rem]">
          {JOIN_HERO.scrollCue}
        </span>
        <span
          aria-hidden="true"
          className={`hidden h-px w-10 bg-gradient-to-l from-transparent to-white/80 transition-opacity duration-300 group-hover:opacity-90 sm:block md:w-14 ${ruleMotion}`}
        />
      </span>

      <span className="flex flex-col items-center gap-1">
        {/*
          The rail. Under reduced motion it carries a fixed gradient instead of
          a moving light, so the downward reading survives without animation.
        */}
        <span
          aria-hidden="true"
          className="relative block h-8 w-px overflow-hidden bg-white/20 transition-colors duration-300 group-hover:bg-white/35 md:h-9 md:h-sm:h-7"
        >
          {reduced ? (
            <span className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--accent-soft))] to-white" />
          ) : (
            <span className="absolute left-0 block h-1/2 w-px bg-gradient-to-b from-transparent via-[hsl(var(--accent-soft))] to-white motion-safe:animate-cueTrail" />
          )}
        </span>

        <svg
          width="16"
          height="10"
          viewBox="0 0 20 12"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 ${reduced ? 'opacity-90' : 'motion-safe:animate-cueChevron'}`}
        >
          <path
            d="M2 2.5 10 9.5 18 2.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

export default ScrollInvitation;
