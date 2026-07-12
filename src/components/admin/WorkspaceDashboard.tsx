// =====================================================================
// Dashboard. An executive control panel, not a regular subsection: it
// fills one screen, opens with data instead of a page title, and is
// identical for every member. It compares the current semester with the
// previous one automatically and celebrates the association's work.
// Historical member/alumni series read from semester_snapshots, so
// figures loaded later populate the charts with no structural change.
// Editorial rules: no em dashes, no emojis.
// =====================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, Legend,
} from 'recharts';
import { FileBarChart2, Users, GraduationCap, TrendingUp, ArrowUpRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { currentSemester, previousSemester, semesterOf } from '@/lib/semester';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { fundLabels, activeFunds, type Fund } from '@/lib/types';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const SHORT_DIV: Record<string, string> = { equity: 'Equity', investment: 'Investment', macro: 'Macro', portfolio: 'Portfolio', quant: 'Quant' };

interface ReportRow { division: string; date: string; page_count: number | null; status: string; title: string }
interface SnapshotRow { semester_key: string; semester_label: string; members_count: number; alumni_count: number }
interface FundYearRow { fund: string; year: number; ytd: number | null; itd: number | null }

// Animated count-up for the KPI numbers.
function useCountUp(target: number, duration = 900): number {
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
  if (before === 0 && now === 0) return <span className="text-[11px] text-muted-foreground">no data yet</span>;
  if (diff > 0) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-nowrap">+{diff} vs last semester</span>;
  if (diff === 0) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">level with last semester</span>;
  return <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 whitespace-nowrap">{-diff} to match last semester</span>;
}

function Kpi({ icon, label, value, before, accent }: { icon: React.ReactNode; label: string; value: number; before: number | null; accent?: boolean }) {
  const shown = useCountUp(value);
  const pct = before && before > 0 ? Math.min(100, Math.round((value / before) * 100)) : value > 0 ? 100 : 0;
  return (
    <div className={`rounded-xl border p-4 flex flex-col justify-between min-h-[112px] ${accent ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-separator'}`}>
      <div className={`flex items-center gap-2 text-[11px] uppercase tracking-wider ${accent ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>{icon}{label}</div>
      <div className={`font-serif text-4xl leading-none mt-1 ${accent ? '' : 'text-accent'}`}>{shown}</div>
      <div className="mt-2 space-y-1">
        {before !== null && (
          <>
            <div className={`h-1 rounded-full overflow-hidden ${accent ? 'bg-accent-foreground/20' : 'bg-muted'}`}>
              <div className={`h-full rounded-full transition-all duration-1000 ${accent ? 'bg-accent-foreground' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </div>
            {!accent && <DeltaChip now={value} before={before} />}
            {accent && <span className="text-[11px] text-accent-foreground/70">{before > 0 ? `${pct}% of last semester's total` : 'first tracked semester'}</span>}
          </>
        )}
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
  const [nextAod, setNextAod] = useState<string | null>(null);
  const [nextEvent, setNextEvent] = useState<{ title: string; date: string } | null>(null);
  const [latestReport, setLatestReport] = useState<ReportRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [rep, snap, mem, alu, fy, aod, ev] = await Promise.all([
          supabase.from('archive_files').select('division, date, page_count, status, title').eq('status', 'published'),
          supabase.from('semester_snapshots').select('semester_key, semester_label, members_count, alumni_count').order('semester_key'),
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('alumni').select('id', { count: 'exact', head: true }),
          supabase.from('fund_performance_years').select('fund, year, ytd, itd').order('year', { ascending: false }),
          supabase.from('aod_days').select('event_date').gte('event_date', today).order('event_date').limit(1),
          supabase.from('events').select('title, date, registration_enabled').eq('registration_enabled', true).gte('date', today).order('date').limit(1),
        ]);
        const rows = (rep.data || []) as ReportRow[];
        setReports(rows);
        setLatestReport([...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] ?? null);
        setSnapshots((snap.data || []) as SnapshotRow[]);
        setLiveMembers(mem.count ?? 0);
        setLiveAlumni(alu.count ?? 0);
        setFundYears((fy.data || []).map((r) => ({
          fund: String(r.fund), year: Number(r.year),
          ytd: r.ytd === null ? null : Number(r.ytd), itd: r.itd === null ? null : Number(r.itd),
        })));
        setNextAod((aod.data?.[0] as { event_date: string } | undefined)?.event_date ?? null);
        const e = ev.data?.[0] as { title: string; date: string } | undefined;
        setNextEvent(e ? { title: e.title, date: e.date } : null);
      } finally { setLoading(false); }
    })();
  }, []);

  const cur = currentSemester();
  const prev = previousSemester();

  const divisionData = useMemo(() => CORE.map((d) => {
    const of = (k: string) => reports.filter((r) => r.division === d && r.date && semesterOf(r.date).key === k);
    const pages = (rs: ReportRow[]) => rs.reduce((s, r) => s + (r.page_count ?? 0), 0);
    const nowRows = of(cur.key); const prevRows = of(prev.key);
    return {
      name: SHORT_DIV[d] ?? d,
      current: nowRows.length, previous: prevRows.length,
      currentPages: pages(nowRows), previousPages: pages(prevRows),
    };
  }), [reports, cur.key, prev.key]);

  const totalNow = divisionData.reduce((s, d) => s + d.current, 0);
  const totalPrev = divisionData.reduce((s, d) => s + d.previous, 0);
  const pagesNow = divisionData.reduce((s, d) => s + d.currentPages, 0);
  const pagesPrev = divisionData.reduce((s, d) => s + d.previousPages, 0);

  // People history: snapshots plus today's live point, ready to absorb the
  // historical figures loaded later without any structural change.
  const peopleSeries = useMemo(() => {
    const rows = snapshots.map((s) => ({ name: s.semester_label, members: s.members_count, alumni: s.alumni_count }));
    rows.push({ name: 'Today', members: liveMembers, alumni: liveAlumni });
    return rows;
  }, [snapshots, liveMembers, liveAlumni]);

  const prevMembers = snapshots.length ? snapshots[snapshots.length - 1].members_count : null;
  const prevAlumni = snapshots.length ? snapshots[snapshots.length - 1].alumni_count : null;

  const funds = useMemo(() => activeFunds.map((f: Fund) => {
    const row = fundYears.find((r) => r.fund === f);
    return { fund: f, year: row?.year ?? null, ytd: row?.ytd ?? null, itd: row?.itd ?? null };
  }), [fundYears]);

  const pct = (v: number | null) => v === null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

  // Exactly ONE call to action at a time, by priority.
  const cta = useMemo(() => {
    if (nextAod) return {
      k: 'aod', kicker: 'Association on Display is coming up',
      title: new Date(`${nextAod}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      action: 'Register for a slot', go: () => onNavigate?.('events', 'events-on-display'),
    };
    if (nextEvent) return {
      k: 'event', kicker: 'Next event, registration open',
      title: nextEvent.title,
      action: 'Register from the calendar', go: () => onNavigate?.('calendar', null),
    };
    if (latestReport) return {
      k: 'report', kicker: 'Discover the latest report',
      title: latestReport.title,
      action: 'Open the archive', go: () => onNavigate?.('reports', 'reports-archive'),
    };
    return null;
  }, [nextAod, nextEvent, latestReport, onNavigate]);

  if (loading) return <div className="h-full"><WorkspaceLoader /></div>;

  const axisColor = 'hsl(215.4 16.3% 56.9%)';

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 font-body">
      {/* Strip: semester + the single call to action */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center gap-3">
        <div className="shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Minerva Investment Management Society</div>
          <h1 className="font-serif text-2xl text-accent leading-tight">{cur.label}, at a glance</h1>
        </div>
        {cta && (
          <button type="button" onClick={cta.go}
            className="md:ml-auto text-left flex items-center gap-4 rounded-xl border border-accent bg-accent/5 px-4 py-2.5 hover:bg-accent/10 transition-colors group max-w-full">
            <Sparkles className="h-5 w-5 text-accent shrink-0" />
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wider text-accent">{cta.kicker}</span>
              <span className="block font-serif text-foreground truncate max-w-[420px]">{cta.title}</span>
            </span>
            <span className="shrink-0 inline-flex items-center gap-1 text-sm text-accent">{cta.action}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi icon={<FileBarChart2 className="h-3.5 w-3.5" />} label={`Reports, ${cur.label}`} value={totalNow} before={totalPrev} accent />
        <Kpi icon={<FileBarChart2 className="h-3.5 w-3.5" />} label="Pages of research" value={pagesNow} before={pagesPrev} />
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Members today" value={liveMembers} before={prevMembers} />
        <Kpi icon={<GraduationCap className="h-3.5 w-3.5" />} label="Alumni network" value={liveAlumni} before={prevAlumni} />
      </div>

      {/* Charts row */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Research output by division */}
        <div className="xl:col-span-5 rounded-xl border border-separator p-4 flex flex-col min-h-[240px]">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-serif text-lg text-accent">Research by division</h2>
            <span className="text-[11px] text-muted-foreground">{cur.label} vs {prev.label}</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'hsl(210 40% 96.1%)' }} contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number, n: string) => [v, n === 'current' ? `Reports, ${cur.label}` : `Reports, ${prev.label}`]} />
                <Legend formatter={(v) => <span style={{ fontSize: 11, color: axisColor }}>{v === 'current' ? cur.label : prev.label}</span>} iconSize={9} />
                <Bar dataKey="previous" fill="hsl(214.3 31.8% 85%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="current" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Pages this semester: {pagesNow || 'tracked from the next upload'}. Length counts as much as quantity, so depth is rewarded too.</p>
        </div>

        {/* Association growth */}
        <div className="xl:col-span-3 rounded-xl border border-separator p-4 flex flex-col min-h-[240px]">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-serif text-lg text-accent">Growth</h2>
            <span className="text-[11px] text-muted-foreground">per semester</span>
          </div>
          <div className="flex-1 min-h-0">
            {peopleSeries.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peopleSeries} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gMembers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="members" name="Members" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#gMembers)" />
                  <Area type="monotone" dataKey="alumni" name="Alumni" stroke="hsl(160 60% 35%)" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-xs text-muted-foreground">The growth chart fills in as semester figures are recorded. Today the association counts {liveMembers} members and {liveAlumni} alumni.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fund performance, the association's flagship achievement */}
        <div className="xl:col-span-4 rounded-xl border border-accent bg-accent text-accent-foreground p-4 flex flex-col min-h-[240px]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" />
            <h2 className="font-serif text-lg">Our funds</h2>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-3">
            {funds.map((f) => (
              <div key={f.fund} className="rounded-lg bg-accent-foreground/10 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-accent-foreground/70 truncate">{fundLabels[f.fund]}</div>
                  <div className="font-serif text-3xl leading-tight">{pct(f.ytd)}</div>
                  <div className="text-[11px] text-accent-foreground/70">YTD {f.year ?? ''}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-serif text-xl">{pct(f.itd)}</div>
                  <div className="text-[11px] text-accent-foreground/70">since inception</div>
                </div>
              </div>
            ))}
            {funds.every((f) => f.ytd === null && f.itd === null) && (
              <p className="text-xs text-accent-foreground/80">Fund figures appear here as soon as they are recorded in Reports, Fund performances.</p>
            )}
          </div>
          <button type="button" onClick={() => onNavigate?.('reports', 'reports-funds')}
            className="mt-2 self-start inline-flex items-center gap-1 text-xs text-accent-foreground/90 hover:text-accent-foreground">
            Managed by our members. See the full track record <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="shrink-0 text-[11px] text-muted-foreground">
        Every figure updates automatically and is the same for every member. Workspace actions are logged for accountability and security.
      </p>
    </div>
  );
}
