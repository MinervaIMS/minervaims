import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePageKeyNumbers } from '@/hooks/useKeyNumbers';
import { describeKeyNumber, formatKeyNumber, type KeyNumber } from '@/lib/key-numbers';
import { FUND_FIGURE_NAMES, FUNDS_PAGE, MONITOR_PAGE, MONITOR_SOURCES, monitorDate } from '@/lib/market-monitor';

// =====================================================================
// MarketTicker: the slow strip at the foot of the homepage hero (93B).
// ---------------------------------------------------------------------
// The figures the moving scene draws, as page text: the two funds'
// cumulative returns since inception and the twelve official market
// figures of the monitor, each with its date, all from the key numbers
// registry (lib/market-monitor.ts formats them for the canvas too, so the
// two say the same thing in the same characters). Very small and slow: a
// reference strip, not a headline.
//
// THE NUMBER RULE. The text is final from the first render (the build
// embeds the registry in the page) and never changes while the page is
// open; the strip moves by transform only, pauses when it is off screen,
// and stands still for a reader who asked for reduced motion (index.css).
// With no figures to show (before the registry holds any) it renders
// nothing; it is laid over the hero's foot, so nothing shifts either way.
// =====================================================================

function Item({ n, fund }: { n: KeyNumber & { slug: string }; fund: boolean }) {
  return (
    <li className="flex items-baseline gap-1.5 whitespace-nowrap px-4" title={describeKeyNumber(n)}>
      <span className="text-[rgba(221,213,247,0.6)]">
        {fund ? `${FUND_FIGURE_NAMES[n.slug] ?? n.label}, since inception` : n.label}
      </span>
      <span className="font-semibold text-[rgba(245,242,254,0.9)] tabular-nums">{formatKeyNumber(n)}</span>
      <span className="text-[rgba(179,166,216,0.55)]">{monitorDate(n.slug, n)}</span>
      {fund && <span className="text-[rgba(179,166,216,0.55)]">(virtual portfolio)</span>}
    </li>
  );
}

export function MarketTicker() {
  const funds = usePageKeyNumbers(FUNDS_PAGE);
  const monitor = usePageKeyNumbers(MONITOR_PAGE);
  const ref = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  const count = funds.length + monitor.length;
  const shown = count > 0;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setPaused(!entries.some((e) => e.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  const list = (copy: boolean) => (
    <ul className={`flex items-center ${copy ? 'mims-ticker-copy' : ''}`} aria-hidden={copy || undefined}>
      {funds.map((n) => <Item key={n.slug} n={n} fund />)}
      {monitor.map((n) => <Item key={n.slug} n={n} fund={false} />)}
      <li className="whitespace-nowrap px-4 text-[rgba(179,166,216,0.55)]">Sources: {MONITOR_SOURCES}</li>
    </ul>
  );

  // Nothing to show (the registry has no market figures yet): no strip.
  if (!shown) return null;

  return (
    <div
      ref={ref}
      data-hero-keepout="ticker"
      data-paused={paused}
      className="mims-ticker absolute inset-x-0 bottom-0 z-10 h-7 overflow-hidden border-t border-[rgba(179,166,216,0.14)] font-body text-[10px] md:text-[11px] tracking-wide"
      style={{ '--ticker-duration': `${Math.max(60, count * 8)}s` } as CSSProperties}
    >
      <div className="mims-ticker-track flex h-full w-max items-center" aria-label="Market monitor and fund returns" role="region">
        {list(false)}
        {list(true)}
      </div>
    </div>
  );
}

export default MarketTicker;
