import { useEffect, useRef, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// =====================================================================
// Ranks over time (People > Network, Step 111): one line per person, the
// first place at the top. A point is missing where the person was not yet
// in the network.
// =====================================================================

export interface TrendSeries { key: string; name: string; colour: string }

function resolve(el: Element | null, value: string): string {
  const m = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  if (!el || !m) return value;
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || '#888888';
}

export function NetworkTrend({ points, series, height = 320 }: {
  /** One row per point in time: label, then each series' rank (or null). */
  points: Record<string, string | number | null>[];
  series: TrendSeries[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [colours, setColours] = useState<Record<string, string>>({});
  useEffect(() => {
    setColours(Object.fromEntries(series.map((s) => [s.key, resolve(ref.current, s.colour)])));
  }, [series]);
  const worst = Math.max(1, ...points.flatMap((p) => series.map((s) => (typeof p[s.key] === 'number' ? (p[s.key] as number) : 0))));
  return (
    <div ref={ref} className="w-full font-body text-xs" style={{ height }} data-network-trend>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--separator))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" tickMargin={6} />
          {/* A logarithmic axis: the first places, where most of the
              movement that matters happens, get the room. */}
          <YAxis
            reversed
            scale="log"
            allowDataOverflow
            domain={[1, Math.max(5, worst)]}
            ticks={[1, 2, 5, 10, 20, 50, 100, 200, 500].filter((t) => t <= Math.max(5, worst))}
            width={40}
            interval={0}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: number) => `#${v}`}
          />
          <Tooltip
            formatter={(v: number, name: string) => [`#${v}`, name]}
            contentStyle={{ fontSize: 12, borderRadius: 0, borderColor: 'hsl(var(--separator))' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={colours[s.key] ?? '#888888'}
              strokeWidth={2}
              dot={{ r: 2.5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default NetworkTrend;
