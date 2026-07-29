import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useKeyFigures } from '@/hooks/useKeyFigures';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

/**
 * The figures line, using the homepage implementation: the count-up only runs
 * against a real value, a skeleton holds the space until then, and the "+"
 * suffix only ever appears next to a real number. No figure is hardcoded and
 * nothing renders "0+".
 */
const AnimatedFigure = ({ value, isLoading }: { value: number; isLoading: boolean }) => {
  const animatedValue = useAnimatedCounter(value, 3200, !isLoading && value > 0);

  if (isLoading || value <= 0) {
    return <Skeleton className="h-10 w-20 mx-auto md:h-14 md:w-24" />;
  }

  return <>{animatedValue}+</>;
};

export function JoinFigures() {
  const { counts, isLoading } = useKeyFigures();

  const items = [
    { to: '/people/members', value: counts.members, label: 'Active Members' },
    { to: '/archive', value: counts.reports, label: 'Published Reports' },
    { to: '/people/alumni', value: counts.alumni, label: 'Alumni' },
  ];

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-6 md:gap-12">
      {items.map((item, i) => (
        <Link
          key={item.label}
          to={item.to}
          className={`px-1 py-4 text-center transition-opacity hover:opacity-80 md:py-6 ${
            i < items.length - 1 ? 'border-r border-separator' : ''
          }`}
        >
          <p className="font-serif text-[1.75rem] leading-none text-primary sm:text-5xl md:text-hero md:mb-2">
            <AnimatedFigure value={item.value} isLoading={isLoading} />
          </p>
          <p className="font-body mt-2 text-[0.6rem] uppercase leading-tight tracking-wider text-muted-foreground sm:text-xs md:text-body">
            {item.label}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default JoinFigures;
