import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fundShortLabels } from '@/lib/types';
import { Block, BlockSkeleton } from './DashboardKit';
import { POSITIVE, NEGATIVE } from './motion';
import type { FundSeries } from './useDashboardData';

// =====================================================================
// Fund performance.
// ---------------------------------------------------------------------
// THE CHART ENDS WHERE THE DATA ENDS. The previous version walked every
// calendar month of every year on record and carried the last NAV forward
// into the months that had not been published, which drew a flat line to
// the end of the year and read as a claim about months nobody had
// reported. Here the series is a list of the months that EXIST, the
// default window is counted back from the latest of those months rather
// than from today, and a fund whose record stops earlier simply has no
// points after that date.
//
// Each line is coloured by its own return over the window on screen, so
// the colour answers the question the horizon control just asked.
// =====================================================================

type Horizon = '6M' | 'YTD' | '1Y' | '2Y' | '3Y' | 'MAX';

const HORIZONS: { key: Horizon; months: number | null }[] = [
  { key: '6M', months: 6 },
  { key: 'YTD', months: null },
  { key: '1Y', months: 12 },
  { key: '2Y', months: 24 },
  { key: '3Y', months: 36 },
  { key: 'MAX', months: null },
];

const DEFAULT_HORIZON: Horizon = '2Y';

interface Row { order: number; label: string; date: string; [fund: string]: number | string }

function signed(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function FundPerformanceBlock({ series, delay, animate }: {
  series: FundSeries[] | null; delay: number; animate: boolean;
}) {
  const [horizon, setHorizon] = useState<Horizon>(DEFAULT_HORIZON);

  const bounds = useMemo(() => {
    const all = (series ?? []).flatMap((s) => s.points);
    if (!all.length) return null;
    return {
      first: Math.min(...all.map((p) => p.order)),
      // The window is counted back from HERE, never from today's date.
      last: Math.max(...all.map((p) => p.order)),
    };
  }, [series]);

  const { data, returns } = useMemo(() => {
    if (!series || !bounds) return { data: [] as Row[], returns: {} as Record<string, number> };

    let from = bounds.first;
    if (horizon === 'YTD') {
      const year = Math.floor(bounds.last / 12);
      from = Math.max(bounds.first, year * 12 - 1);
    } else {
      const spec = HORIZONS.find((h) => h.key === horizon)!;
      if (spec.months) from = Math.max(bounds.first, bounds.last - spec.months + 1 - 1);
    }

    const byOrder = new Map<number, Row>();
    const perFund: Record<string, number> = {};

    for (const s of series) {
      const window = s.points.filter((p) => p.order >= from && p.order <= bounds.last);
      if (window.length < 2) continue;
      const base = window[0].value;
      window.forEach((p, i) => {
        // Rebased to the start of the window, so the figure in the header
        // is the return over the period actually on screen.
        const value = i === 0 ? 0 : Number(((p.value / base - 1) * 100).toFixed(2));
        const row = byOrder.get(p.order) ?? { order: p.order, label: p.label, date: p.date };
        row[s.fund] = value;
        byOrder.set(p.order, row);
        perFund[s.fund] = value;
      });
    }

    return {
      data: [...byOrder.values()].sort((a, b) => a.order - b.order),
      returns: perFund,
    };
  }, [series, bounds, horizon]);

  const drawn = useMemo(() => (series ?? []).filter((s) => returns[s.fund] !== undefined), [series, returns]);

  const available = useMemo(() => {
    if (!bounds) return new Set<Horizon>();
    const span = bounds.last - bounds.first + 1;
    const set = new Set<Horizon>(['MAX', 'YTD']);
    HORIZONS.forEach((h) => { if (h.months && span >= h.months) set.add(h.key); });
    return set;
  }, [bounds]);

  // A phone needs the extra height: the horizon row sits below the chart
  // and the chart still has to reach 220px.
  const HEIGHT = 'h-[368px] lg:h-[300px]';

  if (!series) return <BlockSkeleton title="Fund performance" heightClass={HEIGHT} />;

  const values = data.flatMap((r) => drawn.map((s) => r[s.fund]).filter((v): v is number => typeof v === 'number'));
  const lo = values.length ? Math.min(0, ...values) : 0;
  const hi = values.length ? Math.max(0, ...values) : 1;
  const pad = (hi - lo) * 0.08 || 1;
  const tickText = { fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' as const };

  return (
    <Block
      title="Fund performance"
      heightClass={HEIGHT}
      delay={delay}
      aside={
        <span className="inline-flex flex-wrap gap-x-3 gap-y-0.5 justify-end font-body tabular-nums">
          {drawn.map((s) => (
            <span key={s.fund} style={{ color: returns[s.fund] < 0 ? NEGATIVE : POSITIVE }}>
              {fundShortLabels[s.fund]} {signed(returns[s.fund])}
            </span>
          ))}
        </span>
      }
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          {data.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="label" tick={tickText} tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--separator))' }}
                  minTickGap={28} tickMargin={6} padding={{ left: 4, right: 4 }}
                />
                <YAxis
                  tick={tickText} tickLine={false} axisLine={false} width={44} tickMargin={4}
                  domain={[Number((lo - pad).toFixed(2)), Number((hi + pad).toFixed(2))]}
                  tickFormatter={(v: number) => `${v.toFixed(hi - lo >= 20 ? 0 : 1)}%`}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{
                    border: '1px solid hsl(var(--separator))', borderRadius: 0,
                    background: 'hsl(var(--background))', fontSize: 12,
                    fontFamily: 'Calibri, Carlito, Arial, sans-serif',
                  }}
                  labelFormatter={(_l, payload) => (payload?.[0]?.payload as Row | undefined)?.date ?? ''}
                  formatter={(v: number, name: string) => [signed(v), fundShortLabels[name as keyof typeof fundShortLabels] ?? name]}
                />
                {drawn.map((s, i) => (
                  <Line
                    key={s.fund}
                    type="linear"
                    dataKey={s.fund}
                    stroke={returns[s.fund] < 0 ? NEGATIVE : POSITIVE}
                    strokeWidth={2}
                    strokeLinejoin="miter"
                    strokeLinecap="butt"
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls={false}
                    isAnimationActive={animate}
                    animationDuration={900}
                    animationBegin={i * 120}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center font-body text-xs text-muted-foreground">
              Not enough published months to draw this window.
            </div>
          )}
        </div>

        {/* Horizons. One scrollable row on a phone, 40px tap targets. */}
        <div
          className="shrink-0 mt-2 -mx-1 px-1 flex gap-1 overflow-x-auto sm:overflow-visible"
          style={{ scrollbarWidth: 'none' }}
          role="group"
          aria-label="Chart horizon"
        >
          {HORIZONS.filter((h) => available.has(h.key)).map((h) => {
            const on = horizon === h.key;
            return (
              <button
                key={h.key}
                type="button"
                aria-pressed={on}
                onClick={() => setHorizon(h.key)}
                className={`shrink-0 h-10 sm:h-7 min-w-[40px] px-2.5 font-body text-xs border transition-colors ${
                  on
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-background text-muted-foreground border-separator hover:border-accent hover:text-accent'
                }`}
              >
                {h.key}
              </button>
            );
          })}
        </div>
      </div>
    </Block>
  );
}

export default FundPerformanceBlock;
