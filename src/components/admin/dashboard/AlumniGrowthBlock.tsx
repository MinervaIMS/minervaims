import {
  Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Block } from './DashboardKit';
import type { AlumniYear } from './useDashboardData';

// =====================================================================
// Alumni growth: two readings of the same record, on one pair of axes.
// ---------------------------------------------------------------------
//   left axis, line + fill : the TOTAL network, academic year by
//                            academic year. This is the reading.
//   right axis, columns    : how many joined it that year. Secondary,
//                            so it is drawn behind the line and quieter.
//
// THE PREVIOUS VERSION'S AXIS WAS UPSIDE DOWN. Recharts orders a
// numeric axis from the domain, and passing a domain whose maximum came
// from an unsorted list produced 10, 60, 80, 0 down the side: not a
// badly formatted scale but an incorrect one. Both axes here are given
// an explicit ascending domain with explicit ticks, computed from the
// data, so the scale cannot be inferred wrongly.
// =====================================================================

/** Ascending round ticks from zero to at least `peak`. */
function ticksTo(peak: number, count = 4): number[] {
  const safePeak = Math.max(1, peak);
  const raw = safePeak / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = 0; v <= safePeak + step * 0.999; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

export function AlumniGrowthBlock({ years, animate }: { years: AlumniYear[] | null; animate: boolean }) {
  const tickText = { fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' as const };

  if (!years || years.length < 2) {
    return (
      <Block title="Alumni growth" aside="by academic year">
        <div className="h-full flex items-center justify-center text-center px-4">
          <p className="font-body text-xs text-muted-foreground">
            {years && years.length === 1
              ? 'One academic year on record. The series starts at the next closed fee collection.'
              : 'No semester snapshots on record yet.'}
          </p>
        </div>
      </Block>
    );
  }

  const totalTicks = ticksTo(years.reduce((m, y) => Math.max(m, y.total), 0));
  const addedTicks = ticksTo(years.reduce((m, y) => Math.max(m, y.added), 0), 3);
  const totalMax = totalTicks[totalTicks.length - 1];
  const addedMax = addedTicks[addedTicks.length - 1];

  return (
    <Block title="Alumni growth" aside="total, and joined that year">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={years} margin={{ top: 6, right: 2, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="dashAlumniFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.32} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="label" tick={tickText} tickLine={false}
            axisLine={{ stroke: 'hsl(var(--separator))' }} tickMargin={6} minTickGap={2} interval="preserveStartEnd"
          />
          {/* Left: the cumulative network. Explicit ascending domain. */}
          <YAxis
            yAxisId="total" domain={[0, totalMax]} ticks={totalTicks} allowDecimals={false}
            tick={tickText} tickLine={false} axisLine={false} width={38}
          />
          {/* Right: the yearly intake, on its own smaller scale. */}
          <YAxis
            yAxisId="added" orientation="right" domain={[0, addedMax]} ticks={addedTicks} allowDecimals={false}
            tick={tickText} tickLine={false} axisLine={false} width={26}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.45)' }}
            contentStyle={{
              border: '1px solid hsl(var(--separator))', borderRadius: 0,
              background: 'hsl(var(--background))', fontSize: 12,
              fontFamily: 'Calibri, Carlito, Arial, sans-serif',
            }}
            formatter={(v: number, name: string) => [v, name === 'total' ? 'Alumni in total' : 'Joined that year']}
          />
          {/* Columns first, so the line is drawn over them. */}
          <Bar
            yAxisId="added" dataKey="added" fill="hsl(var(--accent-soft))" fillOpacity={0.45}
            barSize={16} isAnimationActive={animate} animationDuration={700}
          />
          <Area
            yAxisId="total" type="monotone" dataKey="total"
            stroke="hsl(var(--accent))" strokeWidth={2.25} fill="url(#dashAlumniFill)"
            dot={false} activeDot={{ r: 3 }}
            isAnimationActive={animate} animationDuration={900} animationBegin={120} animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Block>
  );
}

export default AlumniGrowthBlock;
