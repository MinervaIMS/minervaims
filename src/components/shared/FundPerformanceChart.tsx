import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import fullLogoColor from '@/assets/full_logo_color.svg.asset.json';
import {
  ACTIVE_FUND_LABELS, listFundYears, parseFundNumber,
  type ActiveFund, type FundYear,
} from '@/lib/funds-api';
import { fundShortLabels } from '@/lib/types';

// =====================================================================
// FundPerformanceChart — the track record, read as a chart.
// ---------------------------------------------------------------------
// Built to be read the way a fund factsheet is read, not as decoration:
//
//   * a period selector that REBASES the window to zero, so the headline
//     figure is the return over the period actually shown, which is the
//     number anyone comparing funds wants. 3 years is the default: long
//     enough to carry a cycle, short enough to still be about this team;
//   * a real date range beside it, built from the months that exist in the
//     record, so an arbitrary window is one that can actually be drawn;
//   * the return printed beside the period name and coloured by SIGN, and
//     the last data date on the right;
//   * ticks chosen at round numbers and set in tabular figures so the axis
//     reads as a scale rather than as a column of decimals;
//   * straight segments with mitred joins. Monthly returns are discrete
//     observations, and a smoothed curve would invent movement between
//     them that never happened;
//   * the lines draw themselves in when the chart first comes into view,
//     once, and not at all for a reader who has asked for reduced motion.
//
// On a page that shows two funds each line can be switched off. With one
// line left the chart becomes the single-fund reading: signed green and
// red shading either side of zero, exactly as on the fund pages.
//
// The grid, the L-frame, the round ticks, the tabular figures and the
// large soft watermark are all borrowed from the PayoffLab surface, so a
// Minerva chart reads the same wherever it appears.
//
// Everything is derived from `fund_performance_years`, the table the
// workspace maintains, so publishing a month extends the chart. A month
// with no value is skipped rather than read as zero, so a gap in the
// record never flattens the line.
// =====================================================================

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Positive and negative halves of a single-fund chart. */
const UP = 'hsl(142 52% 34%)';
const DOWN = 'hsl(0 62% 46%)';

/** Two funds compared: brand navy against the soft purple. Both solid. */
const COMPARE: Record<ActiveFund, { colour: string }> = {
  'long-short': { colour: 'hsl(252 68% 18%)' },
  'multi-asset': { colour: 'hsl(252 41% 55%)' },
};

type PeriodKey = '6M' | '1Y' | '2Y' | '3Y' | '5Y' | '7Y' | 'YTD' | 'MAX';

const PERIODS: { key: PeriodKey; label: string; months: number | null; headline: string }[] = [
  { key: '6M', label: '6M', months: 6, headline: '6 months' },
  { key: '1Y', label: '1Y', months: 12, headline: '1 year' },
  { key: '2Y', label: '2Y', months: 24, headline: '2 years' },
  { key: '3Y', label: '3Y', months: 36, headline: '3 years' },
  { key: '5Y', label: '5Y', months: 60, headline: '5 years' },
  { key: '7Y', label: '7Y', months: 84, headline: '7 years' },
  { key: 'YTD', label: 'YTD', months: null, headline: 'Year to date' },
  { key: 'MAX', label: 'MAX', months: null, headline: 'Since inception' },
];

const DEFAULT_PERIOD: PeriodKey = '3Y';

/**
 * The four a phone offers. Eight buttons on a 375px screen is two ragged
 * rows of targets too small to hit and too many to choose between; these
 * four span the same ground, and every one of them is still on the wide
 * screen's row. Which periods EXIST is unchanged: this hides four
 * buttons, it does not shorten the record or alter the default.
 */
const PHONE_PERIODS = new Set<PeriodKey>(['1Y', '3Y', 'YTD', 'MAX']);

interface Observation {
  /** year * 12 + monthIndex, the sortable key. */
  order: number;
  year: number;
  month: number;
  /** Growth factor for that month (1.02 for +2%). */
  factor: number;
}

/** Every published month of one fund, oldest first. */
function observations(rows: FundYear[], fund: ActiveFund): Observation[] {
  const out: Observation[] = [];
  rows
    .filter((r) => r.fund === fund)
    .sort((a, b) => a.year - b.year)
    .forEach((row) => {
      row.months.forEach((raw, i) => {
        const pct = parseFundNumber(raw ?? '');
        if (pct === null) return;
        out.push({ order: row.year * 12 + i, year: row.year, month: i, factor: 1 + pct / 100 });
      });
    });
  return out;
}

function formatDate(o: { year: number; month: number }): string {
  // The last calendar day of the month the observation belongs to.
  const end = new Date(o.year, o.month + 1, 0);
  return end.toLocaleDateString('en-GB');
}

function signed(v: number, decimals = 2): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(decimals)}%`;
}

/** Month label for an `order` value: "Mar 2024". */
function monthLabel(order: number): string {
  const year = Math.floor(order / 12);
  return `${MONTHS_SHORT[order - year * 12]} ${year}`;
}

/**
 * Round tick values covering [lo, hi], the way an axis should be read.
 * Borrowed from the PayoffLab plot surface so both charts step the same.
 */
function niceTicks(lo: number, hi: number, n = 5): number[] {
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

interface Row { order: number; label: string; date: string; [fund: string]: number | string }

/**
 * True below the `sm` breakpoint. Recharts sizes its axes in numbers rather
 * than in classes, so the gutters and the tick density have to be told
 * about a phone rather than styled into one.
 */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return;
    const mq = globalThis.matchMedia('(max-width: 639px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return narrow;
}

interface Props {
  /** One fund draws a signed area; two draw comparable lines that can be switched off. */
  funds: ActiveFund[];
  title?: string;
  /** Short line under the title. Omit for none. */
  caption?: string;
}

export function FundPerformanceChart({ funds, title = 'Fund Performance', caption }: Props) {
  const fundsKey = funds.join(',');
  // Derived from the key rather than from the prop, so an inline array at
  // the call site cannot invalidate every memo below on each render, which
  // would restart the draw-in animation continuously.
  const fundList = useMemo(() => fundsKey.split(',') as ActiveFund[], [fundsKey]);

  const [rows, setRows] = useState<FundYear[] | null>(null);
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  /** An explicit window, in `order` units. Set by the date range control. */
  const [custom, setCustom] = useState<{ from: number; to: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Funds switched off on a comparison chart. Never all of them. */
  const [hidden, setHidden] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);
  const narrow = useNarrow();

  useEffect(() => { setCustom(null); setHidden([]); }, [fundsKey]);

  useEffect(() => {
    let active = true;
    listFundYears()
      .then((data) => { if (active) setRows(data); })
      .catch((error) => {
        console.error('Error loading fund performance:', error);
        if (active) setRows([]);
      });
    return () => { active = false; };
  }, []);

  // The lines draw themselves in the first time the chart is reached, and
  // never again. A reader who has asked for reduced motion gets the final
  // state immediately.
  useEffect(() => {
    if (revealed) return;
    const el = plotRef.current;
    if (!el) return;
    reducedMotion.current = typeof globalThis.matchMedia === 'function'
      && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) { setRevealed(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setRevealed(true); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [rows, revealed]);

  // Close the date range panel on an outside press or on Escape.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const series = useMemo(
    () => new Map(fundList.map((f) => [f, rows ? observations(rows, f) : []])),
    [rows, fundList],
  );

  /** The funds actually drawn. Hiding the last one is refused. */
  const shown = useMemo(
    () => (fundList.filter((f) => !hidden.includes(f)).length ? fundList.filter((f) => !hidden.includes(f)) : fundList),
    [fundList, hidden],
  );

  /** The whole record, in `order` units: the bounds every window sits in. */
  const bounds = useMemo(() => {
    const all = fundList.flatMap((f) => series.get(f) ?? []);
    if (all.length === 0) return null;
    return {
      first: Math.min(...all.map((o) => o.order)),
      last: Math.max(...all.map((o) => o.order)),
    };
  }, [series, fundList]);

  /** The window on screen. Named `viewWindow`, never `window`. */
  const viewWindow = useMemo(() => {
    if (!bounds) return null;
    const { first, last } = bounds;
    if (custom) {
      return { from: Math.max(first, custom.from), to: Math.min(last, custom.to) };
    }
    const spec = PERIODS.find((p) => p.key === period)!;
    if (period === 'MAX') return { from: first, to: last };
    if (period === 'YTD') {
      const year = Math.floor(last / 12);
      return { from: Math.max(first, year * 12 - 1), to: last };
    }
    return { from: Math.max(first, last - spec.months! + 1 - 1), to: last };
  }, [bounds, period, custom]);

  /**
   * The chart's rows. Each fund is rebased so the first month IN THE
   * WINDOW reads 0%, which is what makes the headline figure the return
   * over the period on screen rather than since inception.
   */
  const { data, headline, lastDate, available } = useMemo(() => {
    if (!viewWindow) return { data: [] as Row[], headline: {} as Record<string, number>, lastDate: '', available: new Set<PeriodKey>() };

    const byOrder = new Map<number, Row>();
    const head: Record<string, number> = {};

    shown.forEach((fund) => {
      const inWindow = (series.get(fund) ?? []).filter((o) => o.order >= viewWindow.from && o.order <= viewWindow.to);
      let nav = 1;
      inWindow.forEach((o, i) => {
        // The first month of the window anchors the rebase at zero.
        if (i > 0) nav *= o.factor;
        const value = Number(((nav - 1) * 100).toFixed(2));
        const row = byOrder.get(o.order) ?? {
          order: o.order,
          label: `${MONTHS_SHORT[o.month]} ${String(o.year).slice(2)}`,
          date: formatDate(o),
        };
        row[fund] = value;
        byOrder.set(o.order, row);
        head[fund] = value;
      });
    });

    const merged = [...byOrder.values()].sort((a, b) => a.order - b.order);

    // Only offer a period the record can actually fill.
    const span = bounds ? bounds.last - bounds.first + 1 : 0;
    const offered = new Set<PeriodKey>(['MAX', 'YTD']);
    PERIODS.forEach((p) => { if (p.months && span >= p.months) offered.add(p.key); });

    return {
      data: merged,
      headline: head,
      lastDate: merged.length ? String(merged[merged.length - 1].date) : '',
      available: offered,
    };
  }, [series, shown, viewWindow, bounds]);

  // A record too short for the default falls back to the whole history
  // rather than showing an empty chart with 3Y lit.
  useEffect(() => {
    if (available.size > 1 && !available.has(period) && !custom) setPeriod('MAX');
  }, [available, period, custom]);

  const single = shown.length === 1;
  const values = data.flatMap((r) => shown.map((f) => r[f]).filter((v): v is number => typeof v === 'number'));
  const rawMax = values.length ? Math.max(...values) : 0;
  const rawMin = values.length ? Math.min(...values) : 0;
  // Round ticks, with zero always on the scale, then the domain follows the
  // ticks. Reading a return chart whose axis stops at 13.47% is harder than
  // it needs to be.
  const scaleLo = Math.min(0, rawMin);
  const scaleHi = Math.max(0, rawMax);
  const { ticks, dLo, dHi } = useMemo(() => {
    const hi = scaleHi === scaleLo ? scaleLo + 1 : scaleHi;
    const all = niceTicks(scaleLo, hi, 5);
    const top = all[all.length - 1];
    // The scale is anchored on a round number at the top and released just
    // under the lowest reading at the bottom. Rounding BOTH ends down to a
    // tick is what opened a fifth of the plot as dead space on a fund that
    // had dipped a fraction of a point below zero at the start.
    const bottom = scaleLo === 0 ? 0 : scaleLo - (top - scaleLo) * 0.04;
    return { ticks: all.filter((t) => t >= bottom), dLo: bottom, dHi: top };
  }, [scaleLo, scaleHi]);
  const tickDecimals = dHi - dLo >= 20 ? 0 : dHi - dLo >= 5 ? 1 : 2;

  // WHERE ZERO SITS IN EACH GRADIENT.
  //
  // A gradient in objectBoundingBox units is measured against THE BOUNDING
  // BOX OF THE PATH IT PAINTS, never against the axis. Measuring it against
  // the axis domain is what painted red well inside positive territory: on
  // a fund up 73% with an axis running to 80, the switch landed at
  // 80 / (80 + 20) = 0.8 down a box whose top is +73% and whose bottom is
  // zero, which is +14.6%, not zero.
  //
  // Each path therefore gets an offset computed from its own box. Recharts
  // draws an area as two paths:
  //   the FILL runs from the curve down to the baseline, which sits at zero
  //   whenever the domain crosses it, so its box spans
  //   [min(0, low), max(0, high)];
  //   the STROKE follows the curve alone, so its box spans [low, high].
  const boxZero = (top: number, bottom: number) =>
    (top === bottom ? 0.5 : Math.max(0, Math.min(1, top / (top - bottom))));
  const fillZero = boxZero(Math.max(0, rawMax), Math.min(0, rawMin));
  const strokeZero = boxZero(rawMax, rawMin);

  const spec = PERIODS.find((p) => p.key === period)!;
  const gradientId = `fundFill-${shown.join('-')}`;
  const animate = revealed && !reducedMotion.current;

  const allOrders = useMemo(() => {
    if (!bounds) return [] as number[];
    const out: number[] = [];
    for (let o = bounds.first; o <= bounds.last; o += 1) out.push(o);
    return out;
  }, [bounds]);

  const setRange = (from: number, to: number) => {
    // Two points is the least that draws a line; the control never offers
    // a window that cannot be plotted.
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    setCustom({ from: lo, to: Math.max(hi, lo + 1) });
  };

  if (rows && data.length < 2) return null;

  const axisTick = {
    fontSize: narrow ? 10 : 11,
    fill: 'hsl(var(--muted-foreground))',
    fontVariantNumeric: 'tabular-nums' as const,
  };
  const gridStroke = 'hsl(var(--separator))';

  const tooltip = (
    <Tooltip
      cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
      contentStyle={{
        border: '1px solid hsl(var(--separator))', borderRadius: 0,
        background: 'hsl(var(--background))',
        fontFamily: 'Calibri, Carlito, Arial, sans-serif', fontSize: 13,
      }}
      labelFormatter={(_l, payload) => (payload?.[0]?.payload as Row | undefined)?.date ?? ''}
      formatter={(v: number, name: string) => [signed(v), name]}
    />
  );

  const xAxis = (
    <XAxis
      dataKey="label" tickLine={false} axisLine={{ stroke: gridStroke }}
      minTickGap={narrow ? 22 : 40} tickMargin={narrow ? 6 : 8} tick={axisTick}
      padding={{ left: 6, right: 6 }}
    />
  );
  const yAxis = (
    <YAxis
      orientation="right" tickLine={false} axisLine={false} width={narrow ? 42 : 56}
      domain={[dLo, dHi]} ticks={ticks} tick={axisTick} tickMargin={6}
      tickFormatter={(v: number) => `${v.toFixed(tickDecimals)}%`}
    />
  );
  // One grid, read two ways: solid rules across the scale, a lighter dashed
  // comb down the time axis. Recharts renders only the FIRST CartesianGrid
  // in a chart, so the second reading is drawn through the `vertical`
  // renderer rather than through a second grid.
  const grid = (
    <CartesianGrid
      stroke={gridStroke}
      strokeDasharray="0"
      horizontal
      vertical={({ key, x1, y1, x2, y2 }) => (
        <line
          key={key}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={gridStroke} strokeOpacity={0.55} strokeDasharray="2 4" fill="none"
        />
      )}
    />
  );
  const zeroLine = (
    <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.55} strokeWidth={1.25} />
  );

  return (
    <section className="pt-0 pb-section-sm md:pb-section bg-background">
      <div className="container">
        <h2 className="font-serif text-heading mb-2 pb-3 border-b border-separator text-accent">{title}</h2>
        {caption && <p className="font-body text-small text-muted-foreground mb-6">{caption}</p>}

        <div className={caption ? '' : 'mt-6'}>
          {/* WHICH FUNDS ARE ON THE CHART, stated before the reading of
              them, because that is the order the question arrives in.
              Two checkboxes rather than two buttons: a button that is off
              looks like a button that is unavailable, and a pale chip left
              the reader unable to tell "switched off" from "no data". A tick
              box carries its own meaning, so no label introduces the row. */}
          {fundList.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {fundList.map((f) => {
                const on = shown.includes(f);
                const onlyOne = on && shown.length === 1;
                return (
                  <button
                    key={f}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={onlyOne}
                    title={
                      onlyOne
                        ? 'One fund always stays on the chart'
                        : on ? `Hide ${ACTIVE_FUND_LABELS[f]}` : `Show ${ACTIVE_FUND_LABELS[f]}`
                    }
                    onClick={() => setHidden((h) => (h.includes(f) ? h.filter((x) => x !== f) : [...h, f]))}
                    className={`inline-flex items-center gap-2 font-body text-xs sm:text-sm h-8 px-2.5 sm:px-3 border transition-colors ${
                      on
                        ? 'border-accent text-foreground'
                        : 'border-separator text-muted-foreground hover:border-accent hover:text-accent'
                    } ${onlyOne ? 'cursor-default' : ''}`}
                  >
                    {/* The tick is what says "on", so the off state can stay
                        legible instead of having to fade to prove a point. */}
                    <span
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 shrink-0 flex items-center justify-center border ${
                        on ? 'bg-accent border-accent' : 'bg-background border-separator'
                      }`}
                    >
                      {on && (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="hsl(var(--background))" strokeWidth="2">
                          <path d="M2.5 6.2 4.8 8.5 9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-[3px] w-4 shrink-0"
                      style={{ background: on ? COMPARE[f].colour : 'hsl(var(--separator))' }}
                    />
                    <span className="sm:hidden">{fundShortLabels[f]}</span>
                    <span className="hidden sm:inline">{ACTIVE_FUND_LABELS[f]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Header: the return over the period on the left, coloured by
              sign, and the date of the most recent observation on the
              right. WHENEVER THE CHART COULD HOLD MORE THAN ONE FUND the
              figure is named, including when only one is left on it: an
              unattributed "+15.59%" beside a selector is the one number a
              reader cannot act on. The name carries the line colour, so
              each reading stays attached to its own line. */}
          <div className="flex items-baseline justify-between gap-3 mb-3 font-body">
            <div className="text-sm sm:text-base min-w-0">
              <span className="text-muted-foreground">{custom ? 'Selected period' : spec.headline}: </span>
              <span className="inline-flex flex-wrap gap-x-3 sm:gap-x-4">
                {shown.map((f) => {
                  const v = headline[f];
                  const known = typeof v === 'number';
                  return (
                    <span key={f}>
                      {fundList.length > 1 && (
                        <span style={{ color: COMPARE[f].colour }}>
                          {shown.length === 1 ? (
                            <>
                              <span className="sm:hidden">{fundShortLabels[f]}</span>
                              <span className="hidden sm:inline">{ACTIVE_FUND_LABELS[f]}</span>
                            </>
                          ) : fundShortLabels[f]}
                          {' '}
                        </span>
                      )}
                      <span style={{ color: known && v < 0 ? DOWN : UP }}>
                        {known ? signed(v) : '-'}
                      </span>
                    </span>
                  );
                })}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap shrink-0">
              {lastDate && <>date: {lastDate}</>}
            </div>
          </div>

          <div className="relative">
            {/* The mark sits behind the plot, large and very faint, so it is
                present in any screenshot without ever being something the
                data has to be read through. */}
            <img
              src={fullLogoColor.url}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 w-[34%] max-w-[260px] -translate-x-1/2 -translate-y-1/2 opacity-[0.13] select-none"
            />

            <div ref={plotRef} className="relative h-[280px] sm:h-[360px] md:h-[420px] w-full">
              {!rows || !revealed ? (
                <div className={`h-full w-full ${rows ? '' : 'animate-pulse bg-muted/40'}`} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {single ? (
                    <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        {/* One gradient for the stroke and one for the fill.
                            The two offsets differ because the two paths have
                            different bounding boxes: see the note above. */}
                        <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset={strokeZero} stopColor={UP} />
                          <stop offset={strokeZero} stopColor={DOWN} />
                        </linearGradient>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset={0} stopColor={UP} stopOpacity={0.45} />
                          <stop offset={fillZero} stopColor={UP} stopOpacity={0.04} />
                          <stop offset={fillZero} stopColor={DOWN} stopOpacity={0.04} />
                          <stop offset={1} stopColor={DOWN} stopOpacity={0.45} />
                        </linearGradient>
                      </defs>
                      {grid}
                      {xAxis}
                      {yAxis}
                      {zeroLine}
                      {tooltip}
                      <Area
                        type="linear" dataKey={shown[0]}
                        stroke={`url(#${gradientId}-stroke)`} strokeWidth={2}
                        strokeLinejoin="miter" strokeLinecap="butt"
                        fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3.5 }}
                        isAnimationActive={animate} animationDuration={1100} animationEasing="ease-out"
                        name={ACTIVE_FUND_LABELS[shown[0]]}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      {grid}
                      {xAxis}
                      {yAxis}
                      {zeroLine}
                      {tooltip}
                      {shown.map((fund, i) => (
                        <Line
                          key={fund} type="linear" dataKey={fund}
                          stroke={COMPARE[fund].colour} strokeWidth={2}
                          strokeLinejoin="miter" strokeLinecap="butt"
                          dot={false} activeDot={{ r: 3.5 }}
                          isAnimationActive={animate} animationDuration={1100}
                          animationBegin={i * 140} animationEasing="ease-out"
                          connectNulls name={fundShortLabels[fund]}
                        />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Period selector on the left, the date range control on the
              right. On a phone the two stack and each takes the full width,
              so the periods form even rows instead of a ragged block with
              the range control stranded beside them. */}
          <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3">
            {/* A period the record cannot fill is not offered at all. */}
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1" role="group" aria-label="Chart period">
              {PERIODS.filter((p) => available.has(p.key)).map((p) => {
                const on = !custom && period === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setCustom(null); setPeriod(p.key); }}
                    className={`font-body text-sm px-2 sm:px-3 h-9 border transition-colors ${
                      PHONE_PERIODS.has(p.key) ? '' : 'hidden sm:block'
                    } ${
                      on
                        ? 'bg-accent text-background border-accent'
                        : 'bg-background text-muted-foreground border-separator hover:border-accent hover:text-accent'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* The date range. Built from the months that exist in the
                record, so it can only ever select a window that draws. */}
            <div className="relative w-full sm:w-auto" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                aria-expanded={pickerOpen}
                aria-haspopup="dialog"
                className={`font-body text-sm h-9 px-3 w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 border transition-colors ${
                  custom ? 'border-accent text-accent' : 'border-separator text-muted-foreground hover:border-accent hover:text-accent'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                {data.length ? `${data[0].date} - ${data[data.length - 1].date}` : '-'}
              </button>

              {pickerOpen && viewWindow && (
                <div
                  role="dialog"
                  aria-label="Choose a date range"
                  className="absolute right-0 bottom-full mb-2 z-20 w-full sm:w-[17rem] bg-background border border-separator p-4 shadow-[0_20px_50px_-20px_hsl(var(--overlay)/0.35)]"
                >
                  <div className="grid grid-cols-[3.25rem_1fr] items-center gap-x-3 gap-y-3 font-body text-sm">
                    <label htmlFor="fund-range-from" className="text-muted-foreground">From</label>
                    <select
                      id="fund-range-from"
                      value={viewWindow.from}
                      onChange={(e) => setRange(Number(e.target.value), viewWindow.to)}
                      className="h-9 px-2 border border-separator bg-background text-foreground"
                    >
                      {allOrders.filter((o) => o < viewWindow.to).map((o) => (
                        <option key={o} value={o}>{monthLabel(o)}</option>
                      ))}
                    </select>

                    <label htmlFor="fund-range-to" className="text-muted-foreground">To</label>
                    <select
                      id="fund-range-to"
                      value={viewWindow.to}
                      onChange={(e) => setRange(viewWindow.from, Number(e.target.value))}
                      className="h-9 px-2 border border-separator bg-background text-foreground"
                    >
                      {allOrders.filter((o) => o > viewWindow.from).map((o) => (
                        <option key={o} value={o}>{monthLabel(o)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => { setCustom(null); setPickerOpen(false); }}
                      className="font-body text-sm text-muted-foreground hover:text-accent"
                    >
                      Reset to {spec.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="font-body text-sm h-9 px-4 bg-accent text-background"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 font-body text-xs text-muted-foreground">
            Rebased to zero at the start of the selected period. Monthly observations, compounded.
          </p>
        </div>
      </div>
    </section>
  );
}

export default FundPerformanceChart;
