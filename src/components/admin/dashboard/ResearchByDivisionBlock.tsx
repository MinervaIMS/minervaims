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
// THE Y LABELS WERE BEING CLIPPED, top and left. Two separate causes,
// and only the first was fixed last time:
//
//   * the top label needs half its own line-height above the highest
//     gridline, so the axis maximum runs one step ABOVE the data;
//   * the LEFT MARGIN WAS NEGATIVE (-24px). A negative left margin pulls
//     the whole plot outside its container, taking the y-axis with it,
//     so every tick was drawn partly off the card. The margin is zero
//     now and the axis reserves its own width instead.
// =====================================================================

const PREVIOUS_TONE = 'hsl(var(--accent-soft))';
const CURRENT_TONE = 'hsl(var(--accent))';

/** Even ticks running one step past the data, so the top label has room. */
function scale(rows: DivisionCount[]): { max: number; ticks: number[] } {
  const peak = rows.reduce((m, r) => Math.max(m, r.previous, r.current), 0);
  const max = Math.max(4, Math.ceil(peak / 2) * 2 + 2);
  return { max, ticks: Array.from({ length: max / 2 + 1 }, (_, i) => i * 2) };
}

/* NO PER-CHART JAVASCRIPT ANIMATION. Recharts animates by setting React
   state on every frame, so four charts entering together re-rendered
   four component trees sixty times a second at the exact moment the page
   was mounting -- which is what the Dashboard's entry actually felt like.
   The cards now enter together in CSS, on the compositor, and the charts
   are simply drawn. */
export function ResearchByDivisionBlock({ rows, currentLabel, previousLabel }: {
  rows: DivisionCount[] | null;
  currentLabel: string;
  previousLabel: string;
}) {
  // A step up on every label: this card was legible only with effort.
  const tickText = { fontSize: 12, fill: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' as const };
  const valueText = { ...tickText, fill: 'hsl(var(--muted-foreground))' };
  const { max, ticks } = scale(rows ?? []);

  return (
    <Block title="Research by division" aside={<span className="text-[12px]">{`${currentLabel} vs ${previousLabel}`}</span>}>
      {rows ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 6, bottom: 0, left: 0 }} barCategoryGap="20%" barGap={4}>
            <defs>
              {/* A restrained gradient and a soft shadow give the columns
                  depth without making them glossy: both are a few percent
                  of lightness, not a highlight. */}
              <linearGradient id="dashDivPrev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PREVIOUS_TONE} stopOpacity={0.95} />
                <stop offset="100%" stopColor={PREVIOUS_TONE} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="dashDivCurr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CURRENT_TONE} stopOpacity={1} />
                <stop offset="100%" stopColor={CURRENT_TONE} stopOpacity={0.78} />
              </linearGradient>
              <filter id="dashDivShadow" x="-40%" y="-20%" width="180%" height="150%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="hsl(var(--overlay))" floodOpacity="0.18" />
              </filter>
            </defs>
            <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="name" tick={tickText} tickLine={false}
              axisLine={{ stroke: 'hsl(var(--foreground))', strokeOpacity: 0.28 }} tickMargin={8} interval={0}
            />
            <YAxis
              domain={[0, max]} ticks={ticks} allowDecimals={false}
              tick={valueText} tickLine={false} axisLine={false} width={32} tickMargin={6}
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
              verticalAlign="bottom" height={24} iconType="square" iconSize={10}
              formatter={(v) => (
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  {v === 'current' ? currentLabel : previousLabel}
                </span>
              )}
            />
            <Bar
              dataKey="previous" fill="url(#dashDivPrev)" radius={[3, 3, 0, 0]}
              filter="url(#dashDivShadow)" maxBarSize={30}
              isAnimationActive={false}
            />
            <Bar
              dataKey="current" fill="url(#dashDivCurr)" radius={[3, 3, 0, 0]}
              filter="url(#dashDivShadow)" maxBarSize={30}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />
      )}
    </Block>
  );
}

export default ResearchByDivisionBlock;
