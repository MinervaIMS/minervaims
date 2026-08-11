import { JOIN_HERO } from '@/lib/join-content';

/**
 * A conventional scroll-down invitation: label plus a single chevron that
 * nudges downward. It is a real control, not decoration: clicking or pressing
 * it scrolls the reader to the first section.
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

  return (
    <button
      type="button"
      onClick={goDown}
      className="group flex flex-col items-center gap-2 text-background transition-opacity duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-soft))] focus-visible:ring-offset-4 focus-visible:ring-offset-black md:h-sm:gap-1.5"
    >
      <span className="font-body text-xs uppercase tracking-[0.14em] text-background/80 sm:text-sm md:text-body">
        {JOIN_HERO.scrollCue}
      </span>

      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 ${reduced ? 'opacity-90' : 'motion-safe:animate-bounce'}`}
      >
        <path
          d="M6 9 12 15 18 9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default ScrollInvitation;
