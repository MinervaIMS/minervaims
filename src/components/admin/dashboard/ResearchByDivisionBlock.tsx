import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Block } from './DashboardKit';
import type { DivisionCount } from './useDashboardData';

// =====================================================================
// Research by division: the previous semester against the current one.
// ---------------------------------------------------------------------
// The structure is the one that worked before: which two semesters are
// being compared stated on the title line, generous bars, a legend under
// the chart, and an axis that follows the data.
//
// THE TOP TICK WAS BEING CLIPPED. The chart's top margin was 4px while
// the highest gridline label needs half its own line-height above it, so
// the topmost number was drawn half outside the plot. The axis maximum is
// now one step ABOVE the data maximum, which both leaves the tallest bar
// clear of the top rule and gives the label the room it needs.
// =====================================================================

const PREVIOUS_TONE = 'hsl(var(--accent-soft))';
const CURRENT_TONE = 'hsl(var(--accent))';

/** Even ticks running one step past the data, so the top label has room. */
function scale(rows: DivisionCount[]): { max: number; ticks: number[] } {
  const peak = rows.reduce((m, r) => Math.max(m, r.previous, r.current), 0);
  const max = Math.max(4, Math.ceil(peak / 2) * 2 + 2);
  return { max, ticks: Array.from({ length: max / 2 + 1 }, (_, i) => i * 2) };
}

export function ResearchByDivisionBlock({ rows, currentLabel, previousLabel, animate }: {
  rows: DivisionCount[] | null;
  currentLabel: string;
  previousLabel: string;
  animate: boolean;
}) {
  const tickText = { fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' as const };
  const { max, ticks } = scale(rows ?? []);

  return (
    <Block title="Research by division" aside={`${currentLabel} vs ${previousLabel}`}>
      {rows ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 6, bottom: 0, left: -24 }} barCategoryGap="22%" barGap={3}>
            <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="name" tick={tickText} tickLine={false}
              axisLine={{ stroke: 'hsl(var(--separator))' }} tickMargin={6} interval={0}
            />
            <YAxis
              domain={[0, max]} ticks={ticks} allowDecimals={false}
              tick={tickText} tickLine={false} axisLine={false} width={34}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.45)' }}
              contentStyle={{
                border: '1px solid hsl(var(--separator))', borderRadius: 0,
                background: 'hsl(var(--background))', fontSize: 12,
                fontFamily: 'Calibri, Carlito, Arial, sans-serif',
              }}
              formatter={(v: number, n: string) => [v, n === 'current' ? currentLabel : previousLabel]}
            />
            <Legend
              verticalAlign="bottom" height={22} iconType="square" iconSize={9}
              formatter={(v) => (
                <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                  {v === 'current' ? currentLabel : previousLabel}
                </span>
              )}
            />
            <Bar dataKey="previous" fill={PREVIOUS_TONE} radius={[2, 2, 0, 0]} isAnimationActive={animate} animationDuration={700} />
            <Bar dataKey="current" fill={CURRENT_TONE} radius={[2, 2, 0, 0]} isAnimationActive={animate} animationDuration={700} animationBegin={140} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />
      )}
    </Block>
  );
}

export default ResearchByDivisionBlock;
