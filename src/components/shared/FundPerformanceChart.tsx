import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import fullLogoColor from '@/assets/full_logo_color.svg.asset.json';
import {
  ACTIVE_FUND_LABELS, listFundYears, parseFundNumber,
  type ActiveFund, type FundYear,
} from '@/lib/funds-api';
import { fundShortLabels } from '@/lib/types';

// =====================================================================
// FundPerformanceChart — the track record, drawn.
// ---------------------------------------------------------------------
// The performance table below already carries every monthly return. This
// chart is the same numbers read as a line: each month compounds on the
// last, so the curve is cumulative growth since inception rather than a
// row of disconnected percentages.
//
// Nothing is entered twice and nothing is hardcoded. The series is built
// from `fund_performance_years`, the table the workspace maintains, so
// the moment a new month is published in Reports > Funds Performances the
// curve extends by one point on the next visit.
//
// One fund draws as a filled area; the Portfolio Management page passes
// both and gets two lines, so the mandates can be compared directly.
// =====================================================================

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SERIES_COLOUR: Record<ActiveFund, string> = {
  // The brand navy and the soft purple that pairs with it, so the chart
  // belongs to the same palette as everything around it.
  'long-short': 'hsl(252 68% 18%)',
  'multi-asset': 'hsl(252 41% 55%)',
};

interface Point {
  /** "Jan 2024" — the x label. */
  label: string;
  /** Sort key: year * 12 + month. */
  order: number;
  /** Cumulative growth in per cent, per fund. */
  [fund: string]: number | string;
}

/**
 * Compound the monthly returns of one fund into a cumulative curve.
 * A month with no value is a month the fund did not trade: it is skipped
 * rather than treated as a zero, so a gap never flattens the line.
 */
function seriesFor(rows: FundYear[], fund: ActiveFund): { order: number; label: string; value: number }[] {
  const points: { order: number; label: string; value: number }[] = [];
  let nav = 100;
  rows
    .filter((r) => r.fund === fund)
    .sort((a, b) => a.year - b.year)
    .forEach((row) => {
      row.months.forEach((raw, i) => {
        const pct = parseFundNumber(raw ?? '');
        if (pct === null) return;
        nav *= 1 + pct / 100;
        points.push({
          order: row.year * 12 + i,
          label: `${MONTHS_SHORT[i]} ${row.year}`,
          value: Number((nav - 100).toFixed(2)),
        });
      });
    });
  return points;
}

interface Props {
  /** One fund draws an area; two draw comparable lines. */
  funds: ActiveFund[];
  title?: string;
  /** Shown under the title. */
  caption?: string;
}

export function FundPerformanceChart({ funds, title = 'Cumulative Performance', caption }: Props) {
  const [rows, setRows] = useState<FundYear[] | null>(null);

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

  const { data, hasData } = useMemo(() => {
    if (!rows) return { data: [] as Point[], hasData: false };
    const byOrder = new Map<number, Point>();
    funds.forEach((fund) => {
      seriesFor(rows, fund).forEach((p) => {
        const existing = byOrder.get(p.order) ?? { order: p.order, label: p.label };
        existing[fund] = p.value;
        byOrder.set(p.order, existing);
      });
    });
    const merged = [...byOrder.values()].sort((a, b) => a.order - b.order);
    return { data: merged, hasData: merged.length > 1 };
  }, [rows, funds]);

  // Nothing published yet: say so plainly rather than drawing an empty box.
  if (rows && !hasData) return null;

  const single = funds.length === 1;
  const labelFor = (fund: ActiveFund) =>
    funds.length > 1 ? fundShortLabels[fund] : ACTIVE_FUND_LABELS[fund];

  return (
    <section className="pt-0 pb-section-sm md:pb-section bg-background">
      <div className="container">
        <h2 className="font-serif text-heading mb-2 pb-3 border-b border-separator text-accent">{title}</h2>
        <p className="font-body text-small text-muted-foreground mb-6">
          {caption ?? 'Cumulative growth since inception, compounded from the monthly returns published below.'}
        </p>

        <div className="relative border border-separator bg-background p-4 md:p-6">
          {/* The mark sits behind the curve at low opacity: present, never
              competing with the data. */}
          <img
            src={fullLogoColor.url}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[52%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 opacity-[0.06] select-none"
          />

          <div className="relative h-[320px] md:h-[420px] w-full">
            {!rows ? (
              <div className="h-full w-full animate-pulse bg-muted/40" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {single ? (
                  <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="fundFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES_COLOUR[funds[0]]} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={SERIES_COLOUR[funds[0]]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="label" tickLine={false} axisLine={{ stroke: 'hsl(var(--separator))' }}
                      minTickGap={44} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      tickLine={false} axisLine={false} width={56}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        border: '1px solid hsl(var(--separator))', borderRadius: 0,
                        background: 'hsl(var(--background))', fontFamily: 'Calibri, Carlito, Arial, sans-serif',
                        fontSize: 13,
                      }}
                      formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, labelFor(funds[0])]}
                    />
                    <Area
                      type="monotone" dataKey={funds[0]} stroke={SERIES_COLOUR[funds[0]]}
                      strokeWidth={1.75} fill="url(#fundFill)" dot={false} activeDot={{ r: 3.5 }}
                      isAnimationActive={false} name={labelFor(funds[0])}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="label" tickLine={false} axisLine={{ stroke: 'hsl(var(--separator))' }}
                      minTickGap={44} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      tickLine={false} axisLine={false} width={56}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        border: '1px solid hsl(var(--separator))', borderRadius: 0,
                        background: 'hsl(var(--background))', fontFamily: 'Calibri, Carlito, Arial, sans-serif',
                        fontSize: 13,
                      }}
                      formatter={(v: number, name: string) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, name]}
                    />
                    <Legend
                      verticalAlign="top" align="left" height={30} iconType="plainline"
                      wrapperStyle={{ fontFamily: 'Calibri, Carlito, Arial, sans-serif', fontSize: 13 }}
                    />
                    {funds.map((fund) => (
                      <Line
                        key={fund} type="monotone" dataKey={fund} stroke={SERIES_COLOUR[fund]}
                        strokeWidth={1.75} dot={false} activeDot={{ r: 3.5 }}
                        isAnimationActive={false} connectNulls name={labelFor(fund)}
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <p className="mt-3 font-body text-xs text-muted-foreground">
          Rebased to 100 at inception. The curve updates automatically as new monthly returns are published.
        </p>
      </div>
    </section>
  );
}

export default FundPerformanceChart;
