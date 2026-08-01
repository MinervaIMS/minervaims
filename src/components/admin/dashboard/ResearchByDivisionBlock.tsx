import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Block, BlockSkeleton } from './DashboardKit';
import type { DivisionCount } from './useDashboardData';

// =====================================================================
// Research by division: the previous semester against this one.
// ---------------------------------------------------------------------
// The y-axis follows the data. A fixed maximum of 8 flattened every real
// difference in a good semester and left three quarters of the plot empty
// in a quiet one; it now stops at the data maximum rounded up to the next
// even number, so the bars always use the height available.
//
// Two tones from the palette, and the legend sits under the TITLE rather
// than under the chart, where it was stealing height from the bars.
// =====================================================================

const PREVIOUS_TONE = 'hsl(var(--accent-soft))';
const CURRENT_TONE = 'hsl(var(--accent))';

/** Data maximum rounded up to the next even number, never below 2. */
function axisMax(rows: DivisionCount[]): number {
  const peak = rows.reduce((m, r) => Math.max(m, r.previous, r.current), 0);
  return Math.max(2, Math.ceil(peak / 2) * 2);
}

export function ResearchByDivisionBlock({ rows, currentLabel, previousLabel, delay, animate }: {
  rows: DivisionCount[] | null;
  currentLabel: string;
  previousLabel: string;
  delay: number;
  animate: boolean;
}) {
  // The legend takes a line under the title, so a phone gets it back.
  const HEIGHT = 'h-[324px] lg:h-[300px]';

  if (!rows) return <BlockSkeleton title="Research by division" heightClass={HEIGHT} />;

  const max = axisMax(rows);
  const ticks = Array.from({ length: max / 2 + 1 }, (_, i) => i * 2);
  const tickText = { fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' as const };

  return (
    <Block
      title="Research by division"
      heightClass={HEIGHT}
      delay={delay}
      legend={
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 shrink-0" style={{ background: PREVIOUS_TONE }} />
            {previousLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 shrink-0" style={{ background: CURRENT_TONE }} />
            {currentLabel}
          </span>
        </span>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -22 }} barCategoryGap="18%" barGap={2}>
          <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="name" tick={tickText} tickLine={false} axisLine={{ stroke: 'hsl(var(--separator))' }} tickMargin={6} interval={0} />
          <YAxis domain={[0, max]} ticks={ticks} allowDecimals={false} tick={tickText} tickLine={false} axisLine={false} width={34} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
            contentStyle={{
              border: '1px solid hsl(var(--separator))', borderRadius: 0,
              background: 'hsl(var(--background))', fontSize: 12,
              fontFamily: 'Calibri, Carlito, Arial, sans-serif',
            }}
            formatter={(v: number, n: string) => [v, n === 'current' ? currentLabel : previousLabel]}
          />
          <Bar dataKey="previous" fill={PREVIOUS_TONE} isAnimationActive={animate} animationDuration={700} animationBegin={0} />
          <Bar dataKey="current" fill={CURRENT_TONE} isAnimationActive={animate} animationDuration={700} animationBegin={140} />
        </BarChart>
      </ResponsiveContainer>
    </Block>
  );
}

export default ResearchByDivisionBlock;
