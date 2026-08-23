import {
  Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Block } from './DashboardKit';
import { useChartEntry } from './motion';
import type { AlumniYear } from './useDashboardData';

// =====================================================================
// Alumni growth: the network by GRADUATION CLASS.
// ---------------------------------------------------------------------
//   left axis, line + fill : the cumulative total. Class of 2018 with 40
//                            people and class of 2019 with 30 puts the
//                            line at 40 then 70. This is the reading.
//   right axis, columns    : the size of each individual class, drawn
//                            behind the line and deliberately quieter.
//
// IT NEVER WAITS FOR ANYTHING. The previous version derived the series
// from semester snapshots, which are written when a fee collection
// closes, so a workspace with one closed collection showed a sentence
// promising a chart at the next one. Graduation classes exist the moment
// an alumnus is recorded.
//
// Both axes carry an explicit ascending domain with explicit ticks
// computed from the data, so a scale can never be inferred wrongly.
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

/* THE ENTRY, RESTORED AND LAYERED.
   The classes rise first and the cumulative line is drawn over them, in
   the same order they are painted in, so the reading assembles the way
   it is meant to be read: the intake per year, then the network those
   years add up to. As on the fund card, the sequence starts only once the
   cell has a settled size, and it is switched off once played, so no
   later render replays it. */
const BARS_MS = 700;
const LINE_LAG = 180;
const LINE_MS = 900;
/** How long after mount the columns start rising, past the card's entry. */
const DRAW_BEGIN = 200;

export function AlumniGrowthBlock({ years, narrow, animate = true, enterDelay = 0 }: {
  years: AlumniYear[] | null;
  narrow: boolean;
  animate?: boolean;
  /** The card's own stagger, so the draw follows its arrival. */
  enterDelay?: number;
}) {
  const chart = useChartEntry(animate, enterDelay + DRAW_BEGIN + LINE_LAG + LINE_MS + 250);
  const tickText = { fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontVariantNumeric: 'tabular-nums' as const };

  if (!years || years.length < 2) {
    return (
      <Block title="Alumni growth" aside="by graduation class">
        <div className="h-full flex items-center justify-center text-center px-4">
          <p className="font-body text-xs text-muted-foreground">
            {years && years.length === 1
              ? 'One graduation class on record so far.'
              : 'No alumni records to draw yet.'}
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
    <Block title="Alumni growth" aside="cumulative, and class size">
      {/* Measured before the chart is mounted, so ResponsiveContainer's
          first reading of this box is also its last: the chart is never
          drawn at one size and then moved to another. */}
      <div ref={chart.ref} className="h-full w-full min-h-0">
        {chart.ready && (
        <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={years} margin={{ top: 8, right: 2, bottom: 0, left: -6 }}>
          <defs>
            {/* The class columns borrow the Research by division
                treatment, one notch quieter: same gradient shape, same
                rounded head, lower opacity, so they read as the same
                family of object without competing with the line. */}
            <linearGradient id="dashAlumniBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent-soft))" stopOpacity={0.62} />
              <stop offset="100%" stopColor="hsl(var(--accent-soft))" stopOpacity={0.24} />
            </linearGradient>
            <linearGradient id="dashAlumniFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.32} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--separator))" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="label" tick={tickText} tickLine={false}
            axisLine={{ stroke: 'hsl(var(--separator))' }} tickMargin={6}
            minTickGap={narrow ? 16 : 4} interval="preserveStartEnd"
          />
          {/* Left: the cumulative network. Explicit ascending domain. */}
          <YAxis
            yAxisId="total" domain={[0, totalMax]} ticks={totalTicks} allowDecimals={false}
            tick={tickText} tickLine={false} axisLine={false} width={42}
          />
          {/* Right: the yearly intake, on its own smaller scale. */}
          <YAxis
            yAxisId="added" orientation="right" domain={[0, addedMax]} ticks={addedTicks} allowDecimals={false}
            tick={tickText} tickLine={false} axisLine={false} width={30}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.45)' }}
            contentStyle={{
              border: '1px solid hsl(var(--separator))', borderRadius: 0,
              background: 'hsl(var(--background))', fontSize: 12,
              fontFamily: 'Calibri, Carlito, Arial, sans-serif',
            }}
            formatter={(v: number, name: string) => [v, name === 'total' ? 'Alumni in total' : 'In this class']}
          />
          {/* Columns first, so the line is drawn over them. */}
          <Bar
            yAxisId="added" dataKey="added" fill="url(#dashAlumniBar)" radius={[3, 3, 0, 0]}
            barSize={narrow ? 16 : 24}
            isAnimationActive={chart.entering}
            animationBegin={enterDelay + DRAW_BEGIN}
            animationDuration={BARS_MS}
            animationEasing="ease-out"
          />
          <Area
            yAxisId="total" type="monotone" dataKey="total"
            stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#dashAlumniFill)"
            dot={false} activeDot={{ r: 3 }}
            isAnimationActive={chart.entering}
            animationBegin={enterDelay + DRAW_BEGIN + LINE_LAG}
            animationDuration={LINE_MS}
            animationEasing="ease-out"
          />
        </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>
    </Block>
  );
}

export default AlumniGrowthBlock;
