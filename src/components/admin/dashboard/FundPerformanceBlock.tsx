import { useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import fullLogoColor from '@/assets/full_logo_color.svg.asset.json';
import { fundShortLabels } from '@/lib/types';
import { Block } from './DashboardKit';
import { POSITIVE, NEGATIVE } from './motion';

/**
 * ONE COLOUR PER FUND, the pair the Portfolio Management section already
 * uses: brand navy against the soft purple. Colouring both lines by the
 * SIGN of their return, as this card did, gave two green lines whenever
 * both funds were up, which is most of the time, and the reader had to
 * go back to the legend on every glance. Sign is still stated, by the
 * colour of the FIGURE in the header, where it belongs.
 */
const FUND_COLOUR: Record<string, string> = {
  'long-short': 'hsl(252 68% 18%)',
  'multi-asset': 'hsl(252 41% 55%)',
};
const colourOf = (fund: string) => FUND_COLOUR[fund] ?? 'hsl(var(--accent))';
import type { FundSeries } from './useDashboardData';

// =====================================================================
// Fund performance, in the Dashboard's smaller frame.
// ---------------------------------------------------------------------
// The reading is the one the public Funds Performance section already
// established, adapted rather than copied: horizon controls that REBASE
// the window to zero so the headline figure is the return over the period
// on screen; angular segments, because monthly returns are discrete
// observations; round tabular ticks; the watermark behind the plot; and
// the signed green-and-red area when a single fund is left on the chart.
//
// What is deliberately NOT carried across is the apparatus that belongs
// to a full page: the date-range picker, the eight-period selector and
// the explanatory footnote. In a card a third of that height they would
// leave the chart no room.
//
// THE SERIES ENDS WHERE THE DATA ENDS, and the window is counted back
// from the latest published month rather than from today's date.
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

/** Round ticks covering [lo, hi], as on the public chart. */
function niceTicks(lo: number, hi: number, n = 4): number[] {
  if (!(hi > lo)) return [lo];
  const step0 = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2.2 ? 5 : norm >= 1.2 ? 2 : 1) * mag;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(6)));
  }
  if (out[out.length - 1] < hi) out.push(Number((out[out.length - 1] + step).toFixed(6)));
  return out;
}

export function FundPerformanceBlock({ series, animate }: { series: FundSeries[] | null; animate: boolean }) {
  const [horizon, setHorizon] = useState<Horizon>(DEFAULT_HORIZON);
  const [hidden, setHidden] = useState<string[]>([]);

  const bounds = useMemo(() => {
    const all = (series ?? []).flatMap((s) => s.points);
    if (!all.length) return null;
    return {
      first: Math.min(...all.map((p) => p.order)),
      last: Math.max(...all.map((p) => p.order)),
    };
  }, [series]);

  const shown = useMemo(() => {
    const list = (series ?? []).filter((s) => !hidden.includes(s.fund));
    return list.length ? list : (series ?? []);
  }, [series, hidden]);

  const { data, returns } = useMemo(() => {
    if (!bounds) return { data: [] as Row[], returns: {} as Record<string, number> };

    let from = bounds.first;
    if (horizon === 'YTD') {
      from = Math.max(bounds.first, Math.floor(bounds.last / 12) * 12 - 1);
    } else {
      const spec = HORIZONS.find((h) => h.key === horizon)!;
      if (spec.months) from = Math.max(bounds.first, bounds.last - spec.months);
    }

    const byOrder = new Map<number, Row>();
    const perFund: Record<string, number> = {};

    for (const s of shown) {
      const window = s.points.filter((p) => p.order >= from && p.order <= bounds.last);
      if (window.length < 2) continue;
      const base = window[0].value;
      window.forEach((p, i) => {
        const value = i === 0 ? 0 : Number(((p.value / base - 1) * 100).toFixed(2));
        const row = byOrder.get(p.order) ?? { order: p.order, label: p.label, date: p.date };
        row[s.fund] = value;
        byOrder.set(p.order, row);
        perFund[s.fund] = value;
      });
    }

    return { data: [...byOrder.values()].sort((a, b) => a.order - b.order), returns: perFund };
  }, [shown, bounds, horizon]);

  const drawn = useMemo(() => shown.filter((s) => returns[s.fund] !== undefined), [shown, returns]);

  const available = useMemo(() => {
    if (!bounds) return new Set<Horizon>();
    const span = bounds.last - bounds.first + 1;
    const set = new Set<Horizon>(['MAX', 'YTD']);
    HORIZONS.forEach((h) => { if (h.months && span >= h.months) set.add(h.key); });
    return set;
  }, [bounds]);

  const values = data.flatMap((r) => drawn.map((s) => r[s.fund]).filter((v): v is number => typeof v === 'number'));
  const rawLo = values.length ? Math.min(...values) : 0;
  const rawHi = values.length ? Math.max(...values) : 1;
  const scaleLo = Math.min(0, rawLo);
  const scaleHi = Math.max(0, rawHi);
  const ticks = useMemo(
    () => niceTicks(scaleLo, scaleHi === scaleLo ? scaleLo + 1 : scaleHi, 4),
    [scaleLo, scaleHi],
  );
  const dHi = ticks[ticks.length - 1];
  const dLo = scaleLo === 0 ? 0 : scaleLo - (dHi - scaleLo) * 0.05;
  const visibleTicks = ticks.filter((t) => t >= dLo);

  // A gradient in objectBoundingBox units is measured against the path it
  // paints, not against the axis: the fill runs from the curve down to the
  // baseline at zero, the stroke follows the curve alone.
  const boxZero = (top: number, bottom: number) =>
    (top === bottom ? 0.5 : Math.max(0, Math.min(1, top / (top - bottom))));
  const single = drawn.length === 1;
  const fillZero = boxZero(Math.max(0, rawHi), Math.min(0, rawLo));
  const strokeZero = boxZero(rawHi, rawLo);
  const gradientId = `dashFund-${drawn.map((s) => s.fund).join('-') || 'none'}`;

  const tickText = { fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' as const };
  const gridStroke = 'hsl(var(--separator))';

  const axes = (
    <>
      <CartesianGrid stroke={gridStroke} strokeDasharray="0" vertical={false} />
      <XAxis
        dataKey="label" tick={tickText} tickLine={false}
        axisLine={{ stroke: gridStroke }} minTickGap={26} tickMargin={6} padding={{ left: 4, right: 4 }}
      />
      <YAxis
        orientation="right" tick={tickText} tickLine={false} axisLine={false} width={40} tickMargin={4}
        domain={[Number(dLo.toFixed(2)), dHi]} ticks={visibleTicks}
        tickFormatter={(v: number) => `${v.toFixed(dHi - dLo >= 20 ? 0 : 1)}%`}
      />
      <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.5} strokeWidth={1} />
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
    </>
  );

  return (
    <Block
      title="Fund performance"
      aside={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 justify-end tabular-nums">
          {drawn.map((s) => (
            <button
              key={s.fund}
              type="button"
              aria-pressed={!hidden.includes(s.fund)}
              title={drawn.length === 1 ? 'One fund always stays on the chart' : `Hide ${fundShortLabels[s.fund]}`}
              onClick={() => setHidden((h) => (
                h.includes(s.fund) ? h.filter((x) => x !== s.fund)
                  : drawn.length === 1 ? h : [...h, s.fund]
              ))}
              className="inline-flex items-center gap-1.5 text-[13px] hover:opacity-80"
            >
              {/* The swatch is the line, so the name never has to be
                  matched back to the legend. */}
              <span className="h-[3px] w-4 shrink-0 rounded-full" style={{ background: colourOf(s.fund) }} />
              <span className="text-foreground">{fundShortLabels[s.fund]}</span>
              <span style={{ color: returns[s.fund] < 0 ? NEGATIVE : POSITIVE }}>{signed(returns[s.fund])}</span>
            </button>
          ))}
          {hidden.length > 0 && (
            <button type="button" onClick={() => setHidden([])} className="text-[13px] text-muted-foreground hover:text-accent">
              show both
            </button>
          )}
          {/* A phone gets one control instead of six: the same horizons,
              a fraction of the width, and a 40px target. */}
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as Horizon)}
            aria-label="Chart horizon"
            className="sm:hidden h-10 rounded-md border border-separator bg-background px-2 text-xs text-foreground"
          >
            {HORIZONS.filter((h) => available.has(h.key)).map((h) => (
              <option key={h.key} value={h.key}>{h.key}</option>
            ))}
          </select>
          <span className="hidden sm:inline-flex gap-1" role="group" aria-label="Chart horizon">
            {HORIZONS.filter((h) => available.has(h.key)).map((h) => {
              const on = horizon === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setHorizon(h.key)}
                  className={`h-6 min-w-[30px] px-1.5 rounded-md border text-[11px] transition-colors ${
                    on
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-background text-muted-foreground border-separator hover:border-accent hover:text-accent'
                  }`}
                >
                  {h.key}
                </button>
              );
            })}
          </span>
        </span>
      }
    >
      <div className="relative h-full min-h-0">
          {/* The mark reads clearly behind the plot, as on the public chart. */}
          <img
            src={fullLogoColor.url}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[38%] max-w-[150px] -translate-x-1/2 -translate-y-1/2 opacity-[0.13] select-none"
          />
          {!series ? (
            <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />
          ) : data.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              {single ? (
                <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={strokeZero} stopColor={POSITIVE} />
                      <stop offset={strokeZero} stopColor={NEGATIVE} />
                    </linearGradient>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={0} stopColor={POSITIVE} stopOpacity={0.4} />
                      <stop offset={fillZero} stopColor={POSITIVE} stopOpacity={0.03} />
                      <stop offset={fillZero} stopColor={NEGATIVE} stopOpacity={0.03} />
                      <stop offset={1} stopColor={NEGATIVE} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  {axes}
                  <Area
                    type="linear" dataKey={drawn[0].fund}
                    stroke={`url(#${gradientId}-stroke)`} strokeWidth={2}
                    strokeLinejoin="miter" strokeLinecap="butt"
                    fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3 }}
                    isAnimationActive={animate} animationDuration={900} animationEasing="ease-out"
                  />
                </AreaChart>
              ) : (
                <LineChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: -18 }}>
                  {axes}
                  {drawn.map((s, i) => (
                    <Line
                      key={s.fund} type="linear" dataKey={s.fund}
                      stroke={colourOf(s.fund)}
                      strokeWidth={s.fund === 'long-short' ? 2.4 : 2}
                      strokeLinejoin="miter" strokeLinecap="butt"
                      dot={false} activeDot={{ r: 3 }} connectNulls={false}
                      isAnimationActive={animate} animationDuration={900}
                      animationBegin={i * 110} animationEasing="ease-out"
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center font-body text-xs text-muted-foreground">
              Not enough published months to draw this window.
            </div>
          )}
      </div>
    </Block>
  );
}

export default FundPerformanceBlock;
