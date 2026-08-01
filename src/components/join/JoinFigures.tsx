import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
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
    return (
      <Skeleton
        className={`mx-auto h-10 w-20 md:h-14 md:w-24 ${dark ? 'bg-white/15' : ''}`}
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
          <p
            className={`font-serif leading-none md:mb-2 ${
              dark
                ? 'text-[1.95rem] text-background sm:text-[3.35rem] md:text-[4.5rem] md:h-sm:text-[3.3rem]'
                : 'text-[1.75rem] text-primary sm:text-5xl md:text-hero'
            }`}
          >
            <AnimatedFigure value={item.value} isLoading={isLoading} dark={dark} />
          </p>
          <p
            className={`font-body mt-2 uppercase leading-tight tracking-wider ${
              dark
                ? 'text-[0.66rem] text-background/80 sm:text-[0.82rem] md:text-[1.1rem] md:h-sm:text-[0.85rem]'
                : 'text-[0.6rem] text-muted-foreground sm:text-xs md:text-body'
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
