import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useIsDesktop } from '@/hooks/use-desktop';
import { useKeyFigures } from '@/hooks/useKeyFigures';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

const SpecularFx = lazy(() =>
  import('@/components/shared/SpecularFx').then((m) => ({ default: m.SpecularFx })),
);

// =====================================================================
// 01 · The Society
//
// Lede, then three labelled statements revealed one after another, then a
// quiet figures line.
//
// Statement B is the Society's proudest fact and gets the block's
// strongest typographic moment: the two fund names set large inside a
// hairline frame, with the existing SpecularFx sheen passing along it
// once as they enter view. It is mounted on entry and unmounted when the
// sweep is done, so nothing on this page loops except the ambient layers.
// =====================================================================

const STATEMENTS = [
  {
    key: 'A',
    title: 'Five specialised divisions',
    body: 'Equity Research, Investment Research, Macro Research, Portfolio Management and Quantitative Research, each built to the standard of a professional investment house, and supported by Media and Communication and by Operations.',
  },
  {
    key: 'B',
    title: 'Two student-managed funds',
    body: "The Multi-Asset Global Opportunities Fund and the Long-Short Equity Fund, run across global markets and asset classes on the Society's own research and views.",
  },
  {
    key: 'C',
    title: 'A global alumni network',
    body: 'Former members now work across major financial centres, in leading investment banks, hedge funds, asset managers and consultancies, and pursue graduate study at leading academic programmes worldwide.',
  },
];

const FUND_NAMES = ['Multi-Asset Global Opportunities Fund', 'Long-Short Equity Fund'];

interface Props {
  still: boolean;
}

export function SocietyBlock({ still }: Props) {
  return (
    <section aria-labelledby="join-society" className="container py-20 md:py-28">
      <div className="join-reveal flex items-baseline gap-5 pb-5 join-rule border-t-0 border-b" style={{ borderBottom: '1px solid var(--join-hairline)' }}>
        <span className="join-label">01</span>
        <h2 id="join-society" className="font-serif text-heading" style={{ color: 'var(--join-ink)' }}>
          The Society
        </h2>
      </div>

      <div className="mt-10 md:mt-14 max-w-3xl space-y-6">
        <p className="join-reveal font-body text-body-lg leading-relaxed" style={{ color: 'var(--join-body)' }}>
          Minerva Investment Management Society is promoted and run by students of Bocconi University. Founded in
          2019, it is Bocconi's first association dedicated to asset management, and the only one with
          student-managed virtual funds.
        </p>
        <p className="join-reveal font-body text-body-lg leading-relaxed" style={{ color: 'var(--join-body)' }}>
          We are organised as an investment management firm. Members work within specialised research divisions and
          in portfolio management, and each team's output is consolidated into research structured to the standards
          of professional investment publications or academic work.
        </p>
      </div>

      <div className="mt-14 md:mt-20 space-y-12 md:space-y-16">
        {STATEMENTS.map((s, i) =>
          s.key === 'B' ? (
            <FundStatement key={s.key} statement={s} still={still} index={i} />
          ) : (
            <div
              key={s.key}
              className="join-reveal grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
              data-reveal-delay={i * 90}
            >
              <h3 className="font-serif text-subheading" style={{ color: 'var(--join-ink)' }}>
                <span className="join-label mr-3 align-middle">{s.key}</span>
                {s.title}
              </h3>
              <p className="font-body text-body-lg leading-relaxed" style={{ color: 'var(--join-body)' }}>
                {s.body}
              </p>
            </div>
          ),
        )}
      </div>

      <FiguresLine still={still} />
    </section>
  );
}

/** Statement B: the two funds, given the block's typographic weight. */
function FundStatement({
  statement,
  still,
  index,
}: {
  statement: (typeof STATEMENTS)[number];
  still: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [sheen, setSheen] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const el = ref.current;
    // A WebGL context spun up for a four-second border sheen is not worth
    // it on a phone, so the frame simply stays a hairline there.
    if (!el || still || !isDesktop || typeof IntersectionObserver === 'undefined') return;
    let stop = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setSheen(true);
        // One pass, then the canvas is released.
        stop = window.setTimeout(() => setSheen(false), 4200);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(stop);
    };
  }, [still, isDesktop]);

  return (
    <div ref={ref} className="join-reveal" data-reveal-delay={index * 90}>
      <h3 className="font-serif text-subheading" style={{ color: 'var(--join-ink)' }}>
        <span className="join-label mr-3 align-middle">{statement.key}</span>
        {statement.title}
      </h3>

      <div
        className="relative mt-7 px-6 py-9 md:px-10 md:py-12"
        style={{ border: '1px solid var(--join-hairline)' }}
      >
        {sheen && (
          <Suspense fallback={null}>
            <SpecularFx
              lineColor="#FFFFFF"
              baseColor="#05030F"
              intensity={1.35}
              shineSize={14}
              shineFade={42}
              speed={1.5}
              followMouse={false}
              autoAnimate
            />
          </Suspense>
        )}
        <p className="font-serif leading-[1.15] text-[clamp(1.65rem,4.4vw,3rem)]" style={{ color: 'var(--join-ink)' }}>
          {FUND_NAMES[0]}
          <span className="block" style={{ color: 'var(--join-muted)' }}>
            {FUND_NAMES[1]}
          </span>
        </p>
      </div>

      <p className="font-body text-body-lg leading-relaxed mt-7 max-w-3xl" style={{ color: 'var(--join-body)' }}>
        {statement.body}
      </p>
    </div>
  );
}

/**
 * The figures line. Real data only: a figure is printed with its "+"
 * suffix once the count is a real number, and simply omitted otherwise.
 * There is no hardcoded fallback and no path that can print "0+".
 */
function FiguresLine({ still }: { still: boolean }) {
  const { counts, isLoading } = useKeyFigures();
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [inView, setInView] = useState(still);

  useEffect(() => {
    if (still) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still]);

  const items = [
    { value: counts.members, label: 'active members' },
    { value: counts.reports, label: 'published reports' },
    { value: counts.alumni, label: 'alumni' },
  ].filter((f) => f.value > 0);

  // Nothing real to show yet, or the query failed: render a neutral
  // placeholder while loading and nothing at all afterwards. The block
  // above it is complete either way.
  if (isLoading) {
    return (
      <p ref={ref} aria-hidden className="mt-16 md:mt-20 h-5 w-72 max-w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
    );
  }
  if (items.length === 0) return <p ref={ref} className="mt-16 md:mt-20" />;

  return (
    <p
      ref={ref}
      className="mt-16 md:mt-20 font-body text-small tracking-wide"
      style={{ color: 'var(--join-dim)' }}
    >
      {items.map((f, i) => (
        <span key={f.label}>
          {i > 0 && <span className="mx-3" aria-hidden>&middot;</span>}
          {/* Before the line is in view the final figure is rendered
              invisibly, so the count-up starts from the right width and
              no placeholder number is ever shown. */}
          {inView ? (
            <Figure value={f.value} />
          ) : (
            <span style={{ visibility: 'hidden' }}>{f.value}+</span>
          )}{' '}
          {f.label}
        </span>
      ))}
    </p>
  );
}

function Figure({ value }: { value: number }) {
  const shown = useAnimatedCounter(value, 2200, value > 0);
  return (
    <span style={{ color: 'var(--join-ink)' }}>
      {shown}
      {'+'}
    </span>
  );
}

export default SocietyBlock;
