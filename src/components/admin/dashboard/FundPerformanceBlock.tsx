import { useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import fullLogoWhite from '@/assets/full_logo_white.svg.asset.json';
import { fundShortLabels } from '@/lib/types';
import { Block } from './DashboardKit';

/**
 * ONE COLOUR PER FUND, chosen for the deep purple ground this card now
 * sits on: white against a light pink. Navy on purple would have been
 * invisible. Colouring both lines by the SIGN of their return, as this
 * card once did, gave two identical lines whenever both funds were up,
 * which is most of the time. Sign is still stated, by the colour of the
 * FIGURE in the header, where it belongs.
 */
const FUND_COLOUR: Record<string, string> = {
  'long-short': '#ffffff',
  'multi-asset': 'hsl(340 62% 78%)',
};
const colourOf = (fund: string) => FUND_COLOUR[fund] ?? '#ffffff';

/** Everything drawn on the purple ground. */
const ON_PURPLE = 'hsl(var(--accent-foreground))';
const INK = 'rgba(255,255,255,0.78)';
const GRID = 'rgba(255,255,255,0.16)';
/** The performance figure. Bright enough to read on deep purple. */
const GAIN = 'hsl(142 62% 62%)';
const LOSS = 'hsl(0 72% 72%)';
import type { FundSeries } from './useDashboardData';

// =====================================================================
// Fund performance, in the Dashboard's smaller frame.
// ---------------------------------------------------------------------
// ONE READING, FIXED AT ONE YEAR. This card carries no period controls
// at all: no chips, no select, nothing to set. A Dashboard card is a
// glance, and a control that changes what a figure means turns a glance
// into a question about which setting is on. The window is the last
// TWELVE PUBLISHED MONTHS, rebased to zero at its first point, so the
// figure beside each fund's name is that fund's return over exactly the
// period on screen. Anyone who wants another period has the full Funds
// Performance section, which is what it is for.
//
// Everything else follows the public charts: angular segments, because
// monthly returns are discrete observations; round tabular ticks; the
// white mark behind the plot; and the signed green-and-red area when a
// single fund is left on the chart.
//
// THE SERIES ENDS WHERE THE DATA ENDS, and the window is counted back
// from the latest published month rather than from today's date.
// =====================================================================

/** The one window this card draws. Not settable, by design. */
const WINDOW_MONTHS = 12;

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

    // Twelve months back from the last published month, never from today.
    const from = Math.max(bounds.first, bounds.last - WINDOW_MONTHS);

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
  }, [shown, bounds]);

  const drawn = useMemo(() => shown.filter((s) => returns[s.fund] !== undefined), [shown, returns]);

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

  const tickText = { fontSize: 11, fill: INK, fontVariantNumeric: 'tabular-nums' as const };
  const gridStroke = GRID;

  const axes = (
    <>
      <CartesianGrid stroke={gridStroke} strokeDasharray="0" vertical={false} />
      <XAxis
        dataKey="label" tick={tickText} tickLine={false}
        axisLine={{ stroke: gridStroke }} minTickGap={34} tickMargin={6} padding={{ left: 2, right: 2 }}
      />
      <YAxis
        orientation="right" tick={tickText} tickLine={false} axisLine={false} width={38} tickMargin={3}
        domain={[Number(dLo.toFixed(2)), dHi]} ticks={visibleTicks}
        tickFormatter={(v: number) => `${v.toFixed(dHi - dLo >= 20 ? 0 : 1)}%`}
      />
      <ReferenceLine y={0} stroke={ON_PURPLE} strokeOpacity={0.45} strokeWidth={1} />
      <Tooltip
        cursor={{ stroke: ON_PURPLE, strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.5 }}
        contentStyle={{
          border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6,
          background: 'hsl(var(--accent))', color: ON_PURPLE, fontSize: 12,
          fontFamily: 'Calibri, Carlito, Arial, sans-serif',
        }}
        itemStyle={{ color: ON_PURPLE }}
        labelStyle={{ color: INK }}
        labelFormatter={(_l, payload) => (payload?.[0]?.payload as Row | undefined)?.date ?? ''}
        formatter={(v: number, name: string) => [signed(v), fundShortLabels[name as keyof typeof fundShortLabels] ?? name]}
      />
    </>
  );

  return (
    <Block
      filled
      title="Fund performance"
      // The window is STATED, not chosen. One word on the title line
      // replaces six chips and a select, and it says what the figures
      // below it are the return over.
      aside={<span style={{ color: INK }}>last 12 months</span>}
    >
      <div className="h-full min-h-0 flex flex-col">
        {/* THE LEGEND IS THE READING. Each fund is one block: the line's
            own colour as a rule, the fund's name beside it, and its
            twelve-month return underneath in the serif, green when it is
            positive and a light red when it is not. Two blocks side by
            side, each with its own space, instead of a single crowded row
            that also carried the controls. */}
        <div className="shrink-0 flex items-start gap-6 sm:gap-9 pb-2.5">
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
              className="min-w-0 text-left hover:opacity-80 transition-opacity"
            >
              <span className="flex items-center gap-2">
                {/* The swatch IS the line on the chart, at the same
                    weight, so no name ever has to be matched back. */}
                <span className="h-[3px] w-6 shrink-0 rounded-full" style={{ background: colourOf(s.fund) }} />
                <span className="font-body text-[12px] sm:text-[13px] truncate" style={{ color: INK }}>
                  {fundShortLabels[s.fund]}
                </span>
              </span>
              <span
                className="mt-1 block font-serif text-[21px] sm:text-[25px] leading-none tabular-nums"
                style={{ color: returns[s.fund] < 0 ? LOSS : GAIN }}
              >
                {signed(returns[s.fund])}
              </span>
            </button>
          ))}
          {hidden.length > 0 && (
            <button
              type="button"
              onClick={() => setHidden([])}
              className="self-center font-body text-[12px] underline underline-offset-2"
              style={{ color: INK }}
            >
              show both
            </button>
          )}
        </div>

        <div className="relative flex-1 min-h-0">
          {/* The mark reads clearly behind the plot, as on the public chart. */}
          <img
            src={fullLogoWhite.url}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[42%] max-w-[170px] -translate-x-1/2 -translate-y-1/2 opacity-[0.16] select-none"
          />
          {!series ? (
            <div className="h-full w-full animate-pulse rounded-lg bg-[rgba(255,255,255,0.12)]" />
          ) : data.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              {single ? (
                <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: -26 }}>
                  <defs>
                    <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={strokeZero} stopColor={GAIN} />
                      <stop offset={strokeZero} stopColor={LOSS} />
                    </linearGradient>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={0} stopColor={GAIN} stopOpacity={0.45} />
                      <stop offset={fillZero} stopColor={GAIN} stopOpacity={0.04} />
                      <stop offset={fillZero} stopColor={LOSS} stopOpacity={0.04} />
                      <stop offset={1} stopColor={LOSS} stopOpacity={0.45} />
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
                <LineChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: -26 }}>
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
            <div className="h-full flex items-center justify-center font-body text-xs" style={{ color: INK }}>
              Not enough published months to draw a full year.
            </div>
          )}
        </div>
      </div>
    </Block>
  );
}

export default FundPerformanceBlock;
