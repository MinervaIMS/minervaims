import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Block } from './DashboardKit';
import type { DivisionShare } from './useDashboardData';

// =====================================================================
// Reports by division: who writes the research.
// ---------------------------------------------------------------------
// A doughnut answers one question the bar chart beside it cannot: what
// SHARE of everything the association has published came from each
// division. The bar chart is about a semester; this is about the whole
// record, so it does not swing on a single late upload.
//
// The total sits in the hole, because a proportion is only meaningful
// against the count it divides, and the legend carries the percentages
// rather than the chart, which keeps the ring itself clean at the size
// it is actually drawn.
//
// It is live: the shares come from the same published `archive_files`
// rows as everything else, so publishing, deleting or reassigning a
// report moves the ring.
// =====================================================================

/**
 * Five steps down the brand's own purple. Adjacent divisions are always
 * a clear step apart, and nothing here is a new token: every value is
 * the accent hue at a stated lightness.
 */
const SLICE = [
  'hsl(252 68% 18%)',
  'hsl(252 55% 32%)',
  'hsl(252 46% 46%)',
  'hsl(252 41% 60%)',
  'hsl(252 38% 74%)',
];

export function ReportsMixBlock({ shares, animate, narrow }: {
  shares: DivisionShare[] | null; animate: boolean; narrow: boolean;
}) {
  const { data, total } = useMemo(() => {
    const rows = shares ?? [];
    const sum = rows.reduce((s, r) => s + r.reports, 0);
    return {
      data: rows.map((r, i) => ({ ...r, colour: SLICE[i % SLICE.length] })),
      total: sum,
    };
  }, [shares]);

  if (!shares) {
    return (
      <Block title="Reports by division">
        <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />
      </Block>
    );
  }

  if (!data.length || total === 0) {
    return (
      <Block title="Reports by division">
        <div className="h-full flex items-center justify-center text-center px-4">
          <p className="font-body text-xs text-muted-foreground">No published reports to apportion yet.</p>
        </div>
      </Block>
    );
  }

  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <Block title="Reports by division" aside="all time">
      <div className="h-full flex flex-col min-h-0">
        <div className="relative flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={data}
                dataKey="reports"
                nameKey="name"
                innerRadius="62%"
                outerRadius="94%"
                paddingAngle={2}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={animate}
                animationDuration={820}
                animationEasing="ease-out"
              >
                {data.map((d) => <Cell key={d.key} fill={d.colour} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: '1px solid hsl(var(--separator))', borderRadius: 0,
                  background: 'hsl(var(--background))', fontSize: 12,
                  fontFamily: 'Calibri, Carlito, Arial, sans-serif',
                }}
                formatter={(v: number, n: string) => [`${v} reports, ${pct(v)}%`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* The count the proportions divide, in the hole. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-2xl leading-none text-accent tabular-nums">{total}</span>
            <span className="font-body text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">reports</span>
          </div>
        </div>

        {/* The legend carries the percentages, so the ring stays clean. */}
        <ul className={`shrink-0 mt-2 grid gap-x-3 gap-y-1 font-body text-[11px] ${narrow ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {data.map((d) => (
            <li key={d.key} className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: d.colour }} />
              <span className="truncate text-foreground">{d.name}</span>
              <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{pct(d.reports)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Block>
  );
}

export default ReportsMixBlock;
