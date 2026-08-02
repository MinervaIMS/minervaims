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
      className="group relative flex flex-col items-center gap-4 px-4 py-2 text-background transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-soft))] focus-visible:ring-offset-4 focus-visible:ring-offset-black md:h-sm:gap-3"
    >
      {/* A single soft violet wash behind the words. Static: it is depth, not motion. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-40 w-[26rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--accent-soft)/0.18),transparent_68%)]"
      />

      <span className="flex items-center gap-4 md:gap-6">
        <span
          aria-hidden="true"
          className={`hidden h-px w-16 bg-gradient-to-r from-transparent to-white/80 transition-opacity duration-300 group-hover:opacity-90 sm:block md:w-24 ${ruleMotion}`}
        />
        <span className="font-serif text-[1.3rem] leading-none tracking-[0.01em] text-background sm:text-2xl md:text-[1.7rem] md:h-sm:text-2xl">
          {JOIN_HERO.scrollCue}
        </span>
        <span
          aria-hidden="true"
          className={`hidden h-px w-16 bg-gradient-to-l from-transparent to-white/80 transition-opacity duration-300 group-hover:opacity-90 sm:block md:w-24 ${ruleMotion}`}
        />
      </span>

      <span className="flex flex-col items-center gap-1">
        {/*
          The rail. Under reduced motion it carries a fixed gradient instead of
          a moving light, so the downward reading survives without animation.
        */}
        <span
          aria-hidden="true"
          className="relative block h-14 w-px overflow-hidden bg-white/20 transition-colors duration-300 group-hover:bg-white/35 md:h-16 md:h-sm:h-10"
        >
          {reduced ? (
            <span className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--accent-soft))] to-white" />
          ) : (
            <span className="absolute left-0 block h-1/2 w-px bg-gradient-to-b from-transparent via-[hsl(var(--accent-soft))] to-white motion-safe:animate-cueTrail" />
          )}
        </span>

        <svg
          width="20"
          height="12"
          viewBox="0 0 20 12"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 ${reduced ? 'opacity-90' : 'motion-safe:animate-cueChevron'}`}
        >
          <path
            d="M2 2.5 10 9.5 18 2.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

export default ScrollInvitation;
