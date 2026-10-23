import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useKeyNumbers } from '@/hooks/useKeyNumbers';
import { KeyFigureValue } from '@/components/numbers/KeyFigureValue';
import { describeKeyNumber } from '@/lib/key-numbers';

/**
 * The figures line, from the key numbers registry (Step 92).
 *
 * THE NUMBER RULE: each figure's text is its exact, final value from the
 * first frame (the build embeds the registry in the page), the same value
 * the homepage, the stats sections and the machine-readable files show.
 * No count-up, no "+", no placeholder that becomes a number. The
 * definition and the as-of date are the tooltip.
 *
 * `tone="dark"` is the variant used on the black hero stage, where the numbers
 * are set in white for contrast.
 */
export function JoinFigures({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const snap = useKeyNumbers();
  const dark = tone === 'dark';

  const items = [
    { to: '/people/members', figure: snap?.numbers.active_members ?? null, label: 'Active Members' },
    { to: '/archive', figure: snap?.numbers.reports_published ?? null, label: 'Published Reports' },
    { to: '/people/alumni', figure: snap?.numbers.alumni ?? null, label: 'ALUMNI NETWORK' },
  ];

  return (
    <div className="grid w-full grid-cols-3 gap-1 sm:gap-6 md:gap-12">
      {items.map((item, i) => (
        <Link
          key={item.label}
          to={item.to}
          title={item.figure ? describeKeyNumber(item.figure) : undefined}
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
            <KeyFigureValue figure={item.figure} />
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
