// =====================================================================
// Dashboard. A single-screen executive panel with its own visual
// language: large animated KPIs, charts, progress bars and coloured
// status indicators. Marketing tone is intentional here (and only
// here). No page header: the screen opens directly with content.
// Historical series read from semester_snapshots and from report dates,
// so figures loaded later populate everything with no structural change.
// =====================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';
import { FileBarChart2, Users, GraduationCap, TrendingUp, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { currentSemester, previousSemester, semesterOf, type Semester } from '@/lib/semester';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { fundLabels, activeFunds, type Fund } from '@/lib/types';
import { parseFundNumber } from '@/lib/funds-api';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const SHORT_DIV: Record<string, string> = { equity: 'Equity', investment: 'Investment', macro: 'Macro', portfolio: 'Portfolio', quant: 'Quant' };
// The society was born in Fall 2017: semester number 1.
const FOUNDING_SORT = 2017 * 2 + 1;

// Chart palette: intentionally bolder than the base design system.
const C = {
  accent: 'hsl(var(--accent))',
  prev: '#475569',        // slate 600, strong contrast for last semester
  green: '#059669',       // emerald 600
  red: '#dc2626',         // red 600
  blue: '#2563eb',        // blue 600
  grid: 'hsl(214.3 31.8% 91.4%)',
  axis: '#64748b',
};

interface ReportRow { division: string; date: string; page_count: number | null; status: string; title: string }
interface SnapshotRow { semester_key: string; semester_label: string; members_count: number; alumni_count: number }
interface FundYearRow { fund: string; year: number; ytd: string; itd: string; months: string[] }

function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return value;
}

function DeltaChip({ now, before }: { now: number; before: number }) {
  const diff = now - before;
  if (before === 0 && now === 0) return <span className="text-[11px] text-muted-foreground">history starts now</span>;
  if (diff > 0) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-nowrap">on the rise, +{diff}</span>;
  if (diff === 0) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">level with last semester</span>;
  return <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 whitespace-nowrap">{-diff} behind last semester</span>;
}

function Kpi({ icon, label, value, before, accent, delay }: {
  icon: React.ReactNode; label: string; value: number; before: number | null; accent?: boolean; delay: number;
}) {
  const shown = useCountUp(value);
  const pct = before && before > 0 ? Math.min(100, Math.round((value / before) * 100)) : value > 0 ? 100 : 0;
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col justify-between min-h-[110px] animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both ${accent ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-separator'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex items-center gap-2 text-[11px] uppercase tracking-wider ${accent ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>{icon}{label}</div>
      <div className={`font-serif text-4xl leading-none mt-1 ${accent ? '' : 'text-accent'}`}>{shown}</div>
      <div className="mt-2 space-y-1">
        {before !== null ? (
          <>
            <div className={`h-1 rounded-full overflow-hidden ${accent ? 'bg-accent-foreground/20' : 'bg-muted'}`}>
              <div className={`h-full rounded-full transition-all duration-1000 ease-out ${accent ? 'bg-accent-foreground' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </div>
            {!accent ? <DeltaChip now={value} before={before} /> : (
              <span className="text-[11px] text-accent-foreground/70">{before > 0 ? `${pct}% of last semester, and counting` : 'the story starts here'}</span>
            )}
          </>
        ) : <span className="text-[11px] opacity-70">since Fall 2017</span>}
      </div>
    </div>
  );
}

export default function WorkspaceDashboard({ onNavigate }: { onNavigate?: (section: string, sub: string | null) => void }) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [liveMembers, setLiveMembers] = useState(0);
  const [liveAlumni, setLiveAlumni] = useState(0);
  const [fundYears, setFundYears] = useState<FundYearRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rep, snap, mem, alu, fy] = await Promise.all([
          supabase.from('archive_files').select('division, date, page_count, status, title').eq('status', 'published'),
          supabase.from('semester_snapshots').select('semester_key, semester_label, members_count, alumni_count').order('semester_key'),
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('alumni').select('id', { count: 'exact', head: true }),
          supabase.from('fund_performance_years').select('fund, year, ytd, itd, months').order('year', { ascending: true }),
        ]);
        setReports((rep.data || []) as ReportRow[]);
        setSnapshots((snap.data || []) as SnapshotRow[]);
        setLiveMembers(mem.count ?? 0);
        setLiveAlumni(alu.count ?? 0);
        setFundYears((fy.data || []).map((r) => {
          const raw = Array.isArray(r.months) ? r.months : [];
          const months = Array.from({ length: 12 }, (_, i) => (raw[i] == null ? '' : String(raw[i])));
          return {
            fund: String(r.fund), year: Number(r.year),
            ytd: r.ytd == null ? '' : String(r.ytd),
            itd: r.itd == null ? '' : String(r.itd),
            months,
          };
        }));
      } finally { setLoading(false); }
    })();
  }, []);

  const cur = currentSemester();
  const prev = previousSemester();
  const semesterNumber = cur.sort - FOUNDING_SORT + 1;
  const ordinal = (n: number) => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    return `${n}${['th', 'st', 'nd', 'rd'][n % 10] && n % 10 <= 3 ? ['th', 'st', 'nd', 'rd'][n % 10] : 'th'}`;
  };

  const divisionData = useMemo(() => CORE.map((d) => {
    const of = (k: string) => reports.filter((r) => r.division === d && r.date && semesterOf(r.date).key === k);
    const pages = (rs: ReportRow[]) => rs.reduce((s, r) => s + (r.page_count ?? 0), 0);
    const nowRows = of(cur.key); const prevRows = of(prev.key);
    return { name: SHORT_DIV[d] ?? d, current: nowRows.length, previous: prevRows.length, currentPages: pages(nowRows), previousPages: pages(prevRows) };
  }), [reports, cur.key, prev.key]);

  const totalNow = divisionData.reduce((s, d) => s + d.current, 0);
  const totalPrev = divisionData.reduce((s, d) => s + d.previous, 0);
  const pagesNow = divisionData.reduce((s, d) => s + d.currentPages, 0);
  const pagesPrev = divisionData.reduce((s, d) => s + d.previousPages, 0);
  const hasPageData = pagesNow > 0 || pagesPrev > 0;

  // Cumulative reports per semester since the society's founding.
  const reportsOverTime = useMemo(() => {
    const bySem = new Map<number, { sem: Semester; count: number }>();
    for (const r of reports) {
      if (!r.date) continue;
      const s = semesterOf(r.date);
      const g = bySem.get(s.sort) ?? { sem: s, count: 0 };
      g.count += 1; bySem.set(s.sort, g);
    }
    const sorted = [...bySem.values()].sort((a, b) => a.sem.sort - b.sem.sort);
    let cum = 0;
    return sorted.map(({ sem, count }) => { cum += count; return { name: sem.label, semester: count, total: cum }; });
  }, [reports]);
  const allTimeReports = reportsOverTime.length ? reportsOverTime[reportsOverTime.length - 1].total : 0;

  const prevMembers = snapshots.length ? snapshots[snapshots.length - 1].members_count : null;
  const prevAlumni = snapshots.length ? snapshots[snapshots.length - 1].alumni_count : null;

  // Fund series: compound the monthly returns stored on fund_performance_years
  // (base 100) into one NAV point per calendar month, per active fund. Empty
  // months just carry the previous NAV forward — the chart never dips to zero
  // on a missing entry.
  const fundChart = useMemo(() => {
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const f of activeFunds) {
      const rows = fundYears.filter((r) => r.fund === f).sort((a, b) => a.year - b.year);
      let nav = 100;
      let started = false;
      for (const row of rows) {
        for (let i = 0; i < 12; i++) {
          const raw = row.months[i] ?? '';
          const key = `${row.year}-${String(i + 1).padStart(2, '0')}`;
          const label = `${MONTH_ABBR[i]} ${String(row.year).slice(-2)}`;
          const parsed = parseFundNumber(raw);
          if (parsed !== null) {
            nav = nav * (1 + parsed / 100);
            started = true;
          } else if (!started) {
            continue;
          }
          const point = byMonth.get(key) ?? { month: label };
          point[f] = Number(nav.toFixed(2));
          byMonth.set(key, point);
        }
      }
    }
    return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, [fundYears]);

  const funds = useMemo(() => activeFunds.map((f: Fund) => {
    // Pick the most recent year that has a YTD value for this fund.
    const rows = fundYears.filter((r) => r.fund === f).sort((a, b) => b.year - a.year);
    const withYtd = rows.find((r) => parseFundNumber(r.ytd) !== null) ?? rows[0];
    return {
      fund: f,
      year: withYtd?.year ?? null,
      ytd: withYtd ? parseFundNumber(withYtd.ytd) : null,
      itd: withYtd ? parseFundNumber(withYtd.itd) : null,
    };
  }), [fundYears]);

  const pct = (v: number | null) => v === null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  const pctColor = (v: number | null) => v === null ? '' : v >= 0 ? 'text-emerald-300' : 'text-red-300';

  if (loading) return <div className="h-full"><WorkspaceLoader /></div>;

  const FUND_COLORS: Record<string, string> = { 'multi-asset': C.green, 'long-short': C.blue };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 font-body">
      {/* Welcome strip */}
      <div className="shrink-0 animate-in fade-in slide-in-from-top-1 duration-500">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Minerva Investment Management Society · est. Fall 2017</div>
        <h1 className="font-serif text-2xl text-accent leading-tight">
          Welcome to our {ordinal(semesterNumber)} semester. This is what we are building together in {cur.label}.
        </h1>
      </div>

      {/* KPI row */}
      <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi delay={0} icon={<FileBarChart2 className="h-3.5 w-3.5" />} label={`Reports, ${cur.label}`} value={totalNow} before={totalPrev} accent />
        {hasPageData
          ? <Kpi delay={80} icon={<FileBarChart2 className="h-3.5 w-3.5" />} label="Pages of research" value={pagesNow} before={pagesPrev} />
          : <Kpi delay={80} icon={<FileBarChart2 className="h-3.5 w-3.5" />} label="Reports all-time" value={allTimeReports} before={null} />}
        <Kpi delay={160} icon={<Users className="h-3.5 w-3.5" />} label="Members today" value={liveMembers} before={prevMembers} />
        <Kpi delay={240} icon={<GraduationCap className="h-3.5 w-3.5" />} label="Alumni network" value={liveAlumni} before={prevAlumni} />
      </div>

      {/* Charts row */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Research by division */}
        <div className="xl:col-span-4 rounded-xl border border-separator p-4 flex flex-col min-h-[230px] animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: '150ms' }}>
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-serif text-lg text-accent">Research by division</h2>
            <span className="text-[11px] text-muted-foreground">{cur.label} vs {prev.label}</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="26%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.axis }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.axis }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'hsl(210 40% 96.1%)' }} contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number, n: string) => [v, n === 'current' ? cur.label : prev.label]} />
                <Legend formatter={(v) => <span style={{ fontSize: 11, color: C.axis }}>{v === 'current' ? cur.label : prev.label}</span>} iconSize={9} />
                <Bar dataKey="previous" fill={C.prev} radius={[3, 3, 0, 0]} animationDuration={900} animationBegin={200} />
                <Bar dataKey="current" fill={C.accent} radius={[3, 3, 0, 0]} animationDuration={900} animationBegin={450} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Every bar is a division writing the association's name a little larger.</p>
        </div>

        {/* Reports over time since founding */}
        <div className="xl:col-span-4 rounded-xl border border-separator p-4 flex flex-col min-h-[230px] animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: '250ms' }}>
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-serif text-lg text-accent">Our research, compounding</h2>
            <span className="text-[11px] text-muted-foreground">since Fall 2017</span>
          </div>
          <div className="flex-1 min-h-0">
            {reportsOverTime.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportsOverTime} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.axis }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="total" name="Total reports" stroke={C.accent} strokeWidth={2.5} fill="url(#gTotal)" animationDuration={1200} />
                  <Area type="monotone" dataKey="semester" name="That semester" stroke={C.green} strokeWidth={1.5} fill="transparent" animationDuration={1200} animationBegin={300} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-xs text-muted-foreground">The curve draws itself as reports are published. {allTimeReports} so far, the next one moves the line.</p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{allTimeReports} reports published and counting. Every upload moves the curve.</p>
        </div>

        {/* Funds: flagship achievement with performance chart */}
        <div className="xl:col-span-4 rounded-xl border border-accent bg-accent text-accent-foreground p-4 flex flex-col min-h-[230px] animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /><h2 className="font-serif text-lg">Our funds, our pride</h2></div>
            <div className="flex gap-4">
              {funds.map((f) => (
                <div key={f.fund} className="text-right">
                  <div className={`font-serif text-xl leading-none ${pctColor(f.ytd)}`}>{pct(f.ytd)}</div>
                  <div className="text-[10px] text-accent-foreground/70">{fundLabels[f.fund]} YTD</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {fundChart.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fundChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={40} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{fundLabels[v as Fund] ?? v}</span>} iconSize={9} />
                  {activeFunds.map((f, i) => (
                    <Line key={f} type="monotone" dataKey={f} stroke={i === 0 ? '#6ee7b7' : '#93c5fd'} strokeWidth={2.5} dot={false} connectNulls animationDuration={1400} animationBegin={i * 250} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-xs text-accent-foreground/80">The performance chart draws itself from the monthly data in Fund performances. Two student-run funds, managed end to end by our members.</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-accent-foreground/80">Run entirely by our members.</span>
            <div className="flex gap-3">
              {activeFunds.map((f) => (
                <Link key={f} to={`/funds/${f}`} className="inline-flex items-center gap-1 text-[11px] text-accent-foreground/90 hover:text-accent-foreground underline underline-offset-2">
                  {fundLabels[f]} page <ArrowUpRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="shrink-0 text-[11px] text-muted-foreground animate-in fade-in duration-700 fill-mode-both" style={{ animationDelay: '500ms' }}>
        Same numbers for every member, updated automatically. See something you can beat? That is the point. Workspace actions are logged for accountability and security.
      </p>
    </div>
  );
}
