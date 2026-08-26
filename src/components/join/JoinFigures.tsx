import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useKeyFigures } from '@/hooks/useKeyFigures';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

/**
 * The figures line, using the homepage implementation: the count-up only runs
 * against a real value, a skeleton holds the space until then, and the "+"
 * suffix only ever appears next to a real number. No figure is hardcoded and
 * nothing renders "0+".
 *
 * `tone="dark"` is the variant used on the black hero stage, where the numbers
 * are set in white for contrast.
 */
const AnimatedFigure = ({
  value,
  isLoading,
  dark,
}: {
  value: number;
  isLoading: boolean;
  dark: boolean;
}) => {
  const animatedValue = useAnimatedCounter(value, 3200, !isLoading && value > 0);

  if (isLoading || value <= 0) {
    // Sized to the type it stands in for, so the count-up arriving does not
    // move the line: the figure is set at leading-none, so its box is exactly
    // its font size, 1.875rem small and 4rem from md up.
    //
    // A SPAN, NOT A <Skeleton>, WHICH IS A DIV. This stands inside the <p>
    // that carries the numeral's typography, and a <div> is not allowed
    // inside a <p>: the parser closed the paragraph early and let the
    // placeholder out of it, so during loading the figure's box sat outside
    // the type context it is measured against - inside an <a> that then held
    // three block children instead of two. The classes below are exactly
    // what `Skeleton` renders, and `cn` is used for the same reason it uses
    // it: `bg-white/15` has to REPLACE `bg-muted`, not merely follow it.
    return (
      <span
        aria-hidden="true"
        className={cn(
          'mx-auto block h-8 w-20 animate-pulse rounded-md bg-muted md:h-16 md:w-24',
          dark && 'bg-white/15',
        )}
      />
    );
  }

  return <>{animatedValue}+</>;
};

export function JoinFigures({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { counts, isLoading } = useKeyFigures();
  const dark = tone === 'dark';

  const items = [
    { to: '/people/members', value: counts.members, label: 'Active Members' },
    { to: '/archive', value: counts.reports, label: 'Published Reports' },
    { to: '/people/alumni', value: counts.alumni, label: 'Alumni' },
  ];

  return (
    <div className="grid w-full grid-cols-3 gap-1 sm:gap-6 md:gap-12">
      {items.map((item, i) => (
        <Link
          key={item.label}
          to={item.to}
          className={`px-1 py-3 text-center transition-opacity hover:opacity-80 md:py-5 ${
            i < items.length - 1
              ? dark
                ? 'border-r border-white/25'
                : 'border-r border-separator'
              : ''
          }`}
        >
          {/*
            THE SAME SCALE AS THE HOMEPAGE. The dark variant used to be set a
            step larger than the homepage band (4.5rem against 4rem, with a
            1.1rem label against 1rem), which made the two sets of key figures
            read as two different things on two pages of one site. Both now use
            text-3xl / sm:text-5xl / md:text-hero for the numeral and
            0.65rem / xs / body for the label, exactly as Index.tsx does. On a
            short viewport the dark variant still steps down, now to the sm
            size rather than to a bespoke one.
          */}
          <p
            className={`font-serif leading-none md:mb-2 ${
              dark
                ? 'text-[2.25rem] text-background sm:text-5xl md:text-hero md:h-sm:text-5xl'
                : 'text-[2rem] text-primary sm:text-5xl md:text-hero'
            }`}
          >
            <AnimatedFigure value={item.value} isLoading={isLoading} dark={dark} />
          </p>
          <p
            className={`font-body mt-2 uppercase leading-tight tracking-wider ${
              dark
                ? 'text-[0.7rem] text-background/80 sm:text-xs md:text-body md:h-sm:text-sm'
                : 'text-[0.65rem] text-muted-foreground sm:text-xs md:text-body'
            }`}
          >
            {item.label}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default JoinFigures;
