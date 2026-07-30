import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
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
//   * a period selector (3M to MAX) that REBASES the window to zero, so
//     the headline figure is the return over the period actually shown,
//     which is the number anyone comparing funds wants;
//   * the return printed at the top left beside the period, and the last
//     data date at the top right;
//   * a full grid, vertical and horizontal, with the zero line drawn
//     heavier than the rest so gain and loss are never confused;
//   * straight segments with mitred joins. Monthly returns are discrete
//     observations, and a smoothed curve would invent movement between
//     them that never happened.
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

/** Two funds compared: brand navy against the soft purple, plus a dash. */
const COMPARE: Record<ActiveFund, { colour: string; dash?: string }> = {
  'long-short': { colour: 'hsl(252 68% 18%)' },
  'multi-asset': { colour: 'hsl(252 41% 55%)', dash: '6 4' },
};

type PeriodKey = '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'YTD' | 'MAX';

const PERIODS: { key: PeriodKey; label: string; months: number | null; headline: string }[] = [
  { key: '3M', label: '3M', months: 3, headline: '3 months' },
  { key: '6M', label: '6M', months: 6, headline: '6 months' },
  { key: '1Y', label: '1Y', months: 12, headline: '1 year' },
  { key: '3Y', label: '3Y', months: 36, headline: '3 years' },
  { key: '5Y', label: '5Y', months: 60, headline: '5 years' },
  { key: 'YTD', label: 'YTD', months: null, headline: 'Year to date' },
  { key: 'MAX', label: 'MAX', months: null, headline: 'Since inception' },
];

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

interface Row { order: number; label: string; date: string; [fund: string]: number | string }

interface Props {
  /** One fund draws a signed area; two draw comparable lines. */
  funds: ActiveFund[];
  title?: string;
  /** Short line under the title. Omit for none. */
  caption?: string;
}

export function FundPerformanceChart({ funds, title = 'Fund Performance', caption }: Props) {
  const [rows, setRows] = useState<FundYear[] | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('1Y');
  const rangeRef = useRef<HTMLDivElement>(null);

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

  const series = useMemo(
    () => new Map(funds.map((f) => [f, rows ? observations(rows, f) : []])),
    [rows, funds],
  );

  /** The window the selected period covers, in `order` units. */
  const window = useMemo(() => {
    const all = funds.flatMap((f) => series.get(f) ?? []);
    if (all.length === 0) return null;
    const last = Math.max(...all.map((o) => o.order));
    const first = Math.min(...all.map((o) => o.order));
    const spec = PERIODS.find((p) => p.key === period)!;
    if (period === 'MAX') return { from: first, to: last };
    if (period === 'YTD') {
      const year = Math.floor(last / 12);
      return { from: Math.max(first, year * 12 - 1), to: last };
    }
    return { from: Math.max(first, last - spec.months! + 1 - 1), to: last };
  }, [series, funds, period]);

  /**
   * The chart's rows. Each fund is rebased so the first month IN THE
   * WINDOW reads 0%, which is what makes the headline figure the return
   * over the period on screen rather than since inception.
   */
  const { data, headline, lastDate, available } = useMemo(() => {
    if (!window) return { data: [] as Row[], headline: {} as Record<string, number>, lastDate: '', available: new Set<PeriodKey>() };

    const byOrder = new Map<number, Row>();
    const head: Record<string, number> = {};

    funds.forEach((fund) => {
      const inWindow = (series.get(fund) ?? []).filter((o) => o.order >= window.from && o.order <= window.to);
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
    const all = funds.flatMap((f) => series.get(f) ?? []);
    const span = all.length ? Math.max(...all.map((o) => o.order)) - Math.min(...all.map((o) => o.order)) + 1 : 0;
    const offered = new Set<PeriodKey>(['MAX', 'YTD']);
    PERIODS.forEach((p) => { if (p.months && span >= p.months) offered.add(p.key); });
    if (span >= 3) offered.add('3M');

    return {
      data: merged,
      headline: head,
      lastDate: merged.length ? String(merged[merged.length - 1].date) : '',
      available: offered,
    };
  }, [series, funds, window]);

  const single = funds.length === 1;
  const values = data.flatMap((r) => funds.map((f) => r[f]).filter((v): v is number => typeof v === 'number'));
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  // Where zero falls in the plotted range, so the fill can change colour
  // exactly at the axis rather than at an approximation of it.
  const zeroOffset = max === min ? 0.5 : Math.max(0, Math.min(1, max / (max - min)));

  const spec = PERIODS.find((p) => p.key === period)!;
  const headlineValue = single ? headline[funds[0]] : undefined;
  const gradientId = `fundFill-${funds.join('-')}`;

  if (rows && data.length < 2) return null;

  const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
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

  return (
    <section className="pt-0 pb-section-sm md:pb-section bg-background">
      <div className="container">
        <h2 className="font-serif text-heading mb-2 pb-3 border-b border-separator text-accent">{title}</h2>
        {caption && <p className="font-body text-small text-muted-foreground mb-6">{caption}</p>}

        <div className={caption ? '' : 'mt-6'}>
          {/* Header: the return over the period on the left, the date of the
              most recent observation on the right. */}
          <div className="flex items-baseline justify-between gap-4 mb-3 font-body">
            <div className="text-body-lg">
              <span className="text-muted-foreground">{spec.headline}: </span>
              {single ? (
                <span style={{ color: (headlineValue ?? 0) < 0 ? DOWN : UP }}>
                  {typeof headlineValue === 'number' ? signed(headlineValue) : '-'}
                </span>
              ) : (
                <span className="inline-flex flex-wrap gap-x-4">
                  {funds.map((f) => (
                    <span key={f} style={{ color: COMPARE[f].colour }}>
                      {fundShortLabels[f]} {typeof headline[f] === 'number' ? signed(headline[f]) : '-'}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div className="text-small text-muted-foreground whitespace-nowrap">
              {lastDate && <>date: {lastDate}</>}
            </div>
          </div>

          <div className="relative">
            {/* The mark sits behind the plot, small enough that no reading of
                the data ever has to look through it. */}
            <img
              src={fullLogoColor.url}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 w-[24%] max-w-[190px] -translate-x-1/2 -translate-y-1/2 opacity-[0.05] select-none"
            />

            <div className="relative h-[300px] md:h-[420px] w-full">
              {!rows ? (
                <div className="h-full w-full animate-pulse bg-muted/40" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {single ? (
                    <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        {/* One gradient for the stroke and one for the fill,
                            both switching colour exactly at the zero line. */}
                        <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset={zeroOffset} stopColor={UP} />
                          <stop offset={zeroOffset} stopColor={DOWN} />
                        </linearGradient>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset={0} stopColor={UP} stopOpacity={0.45} />
                          <stop offset={zeroOffset} stopColor={UP} stopOpacity={0.04} />
                          <stop offset={zeroOffset} stopColor={DOWN} stopOpacity={0.04} />
                          <stop offset={1} stopColor={DOWN} stopOpacity={0.45} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={gridStroke} strokeDasharray="0" vertical horizontal />
                      <XAxis
                        dataKey="label" tickLine={false} axisLine={{ stroke: gridStroke }}
                        minTickGap={36} tick={axisTick}
                      />
                      <YAxis
                        orientation="right" tickLine={false} axisLine={false} width={58}
                        tick={axisTick} tickFormatter={(v: number) => `${v.toFixed(2)}%`}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.55} strokeWidth={1.25} />
                      {tooltip}
                      <Area
                        type="linear" dataKey={funds[0]}
                        stroke={`url(#${gradientId}-stroke)`} strokeWidth={2}
                        strokeLinejoin="miter" strokeLinecap="butt"
                        fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3.5 }}
                        isAnimationActive={false} name={ACTIVE_FUND_LABELS[funds[0]]}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={gridStroke} strokeDasharray="0" vertical horizontal />
                      <XAxis
                        dataKey="label" tickLine={false} axisLine={{ stroke: gridStroke }}
                        minTickGap={36} tick={axisTick}
                      />
                      <YAxis
                        orientation="right" tickLine={false} axisLine={false} width={58}
                        tick={axisTick} tickFormatter={(v: number) => `${v.toFixed(2)}%`}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.55} strokeWidth={1.25} />
                      {tooltip}
                      <Legend
                        verticalAlign="top" align="left" height={26} iconType="plainline"
                        wrapperStyle={{ fontFamily: 'Calibri, Carlito, Arial, sans-serif', fontSize: 13 }}
                      />
                      {funds.map((fund) => (
                        <Line
                          key={fund} type="linear" dataKey={fund}
                          stroke={COMPARE[fund].colour} strokeWidth={2}
                          strokeDasharray={COMPARE[fund].dash}
                          strokeLinejoin="miter" strokeLinecap="butt"
                          dot={false} activeDot={{ r: 3.5 }}
                          isAnimationActive={false} connectNulls name={fundShortLabels[fund]}
                        />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Period selector on the left, the resolved window on the right. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Chart period">
              {PERIODS.map((p) => {
                const enabled = available.has(p.key);
                const on = period === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={!enabled}
                    aria-pressed={on}
                    onClick={() => setPeriod(p.key)}
                    className={`font-body text-sm px-3 h-9 border transition-colors ${
                      on
                        ? 'bg-accent text-background border-accent'
                        : enabled
                          ? 'bg-background text-muted-foreground border-separator hover:border-accent hover:text-accent'
                          : 'bg-background text-muted-foreground/40 border-separator/60 cursor-not-allowed'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div
              ref={rangeRef}
              className="font-body text-sm text-muted-foreground border border-separator h-9 px-3 inline-flex items-center gap-2"
              title="The window the selected period covers"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="16" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              {data.length ? `${data[0].date} - ${data[data.length - 1].date}` : '-'}
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
