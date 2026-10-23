import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TRACK_DIVISIONS, trackDivisionLabel, type ResearchYear } from '@/lib/track-record';

// =====================================================================
// Reports published per year, one bar per year (Step 93).
// ---------------------------------------------------------------------
// One series, so one hue and no legend: the heading names it. The bars
// carry their totals, the hover adds the split by division, and the
// table below the chart has every number, by division, for any reader
// who cannot use the chart. Drawn at its final values from the first
// frame (no growing bars): the number rule.
// =====================================================================

// The brand purple at a mid step (validated: lightness band, chroma and
// 3:1 contrast on the page surface). The deep accent is too dark to read
// as a filled mark.
const BAR = 'hsl(252 41% 50%)';

interface Props { years: ResearchYear[] }

function YearTooltip({ active, payload }: { active?: boolean; payload?: { payload: ResearchYear }[] }) {
  if (!active || !payload?.length) return null;
  const y = payload[0].payload;
  return (
    <div className="bg-background border border-separator px-3 py-2 font-body text-small shadow-sm">
      <p className="text-foreground font-semibold">{y.year}: {y.total} {y.total === 1 ? 'report' : 'reports'}</p>
      <ul className="mt-1 text-muted-foreground">
        {TRACK_DIVISIONS.filter((d) => y.byDivision[d] > 0).map((d) => (
          <li key={d}>{trackDivisionLabel(d)}: {y.byDivision[d]}</li>
        ))}
      </ul>
    </div>
  );
}

export function ResearchByYearChart({ years }: Props) {
  if (years.length === 0) return null;
  return (
    <figure className="w-full" aria-label="Reports published per year">
      <div className="h-[280px] md:h-[320px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={years} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="hsl(var(--separator))" strokeOpacity={0.6} />
            <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: 'hsl(var(--separator))' }}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <Tooltip content={<YearTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} isAnimationActive={false} />
            <Bar dataKey="total" fill={BAR} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={56}>
              <LabelList dataKey="total" position="top" fill="hsl(var(--foreground))" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 font-body text-xs text-muted-foreground">
        Reports published per year. The table below gives the same counts by division.
      </figcaption>
    </figure>
  );
}

export default ResearchByYearChart;
