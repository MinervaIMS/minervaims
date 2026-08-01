import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Block, BlockSkeleton } from './DashboardKit';
import type { AlumniPoint } from './useDashboardData';

// =====================================================================
// Alumni growth.
// ---------------------------------------------------------------------
// The alumni count as recorded in `semester_snapshots`, one bar per
// semester. A snapshot is written when a fee collection closes, so the
// series is genuinely semester-based, which is why this is a bar chart
// and not a line: the reading is "how many alumni at the end of each
// semester", not a continuous curve through months nobody measured.
//
// A single snapshot cannot describe growth, so the block says so rather
// than drawing one bar and implying a trend.
// =====================================================================

export function AlumniGrowthBlock({ points, delay, animate }: {
  points: AlumniPoint[] | null; delay: number; animate: boolean;
}) {
  if (!points) return <BlockSkeleton title="Alumni growth" />;

  const tickText = { fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' as const };
  const peak = points.reduce((m, p) => Math.max(m, p.alumni), 0);
  const max = Math.max(10, Math.ceil(peak / 10) * 10);

  return (
    <Block
      title="Alumni growth"
      delay={delay}
      aside={<span className="text-muted-foreground">by semester</span>}
    >
      {points.length >= 2 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap="24%">
            <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="label" tick={tickText} tickLine={false}
              axisLine={{ stroke: 'hsl(var(--separator))' }} tickMargin={6} minTickGap={4}
            />
            <YAxis domain={[0, max]} allowDecimals={false} tick={tickText} tickLine={false} axisLine={false} width={38} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
              contentStyle={{
                border: '1px solid hsl(var(--separator))', borderRadius: 0,
                background: 'hsl(var(--background))', fontSize: 12,
                fontFamily: 'Calibri, Carlito, Arial, sans-serif',
              }}
              formatter={(v: number) => [v, 'Alumni']}
            />
            <Bar dataKey="alumni" fill="hsl(var(--accent))" isAnimationActive={animate} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-center px-4">
          <p className="font-body text-xs text-muted-foreground">
            {points.length === 1
              ? 'One semester on record. The series starts at the next closed fee collection.'
              : 'No semester snapshots on record yet.'}
          </p>
        </div>
      )}
    </Block>
  );
}

export default AlumniGrowthBlock;
