// =====================================================================
// Dashboard — a motivational performance overview of the association.
// Compares the CURRENT semester with the PREVIOUS one, automatically:
// reports per division (count AND pages, so substance counts too),
// association totals, members & alumni per semester (from the semester
// snapshots), and fund performance. Identical for every member, by
// design: transparency creates healthy competitiveness.
// =====================================================================
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileBarChart2, Users, GraduationCap, TrendingUp, CalendarDays, Sparkles, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { currentSemester, previousSemester, semesterOf } from '@/lib/semester';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { fundLabels, activeFunds, type Fund } from '@/lib/types';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

interface ReportRow { division: string; date: string; page_count: number | null; status: string; title: string; created_at: string }
interface SnapshotRow { semester_key: string; semester_label: string; members_count: number; alumni_count: number }
interface FundYearRow { fund: string; year: number; ytd: number | null; itd: number | null }

// Positive-tone delta chip: growth is celebrated, a dip is framed as room to grow.
function Delta({ now, before, unit }: { now: number; before: number; unit?: string }) {
  if (before === 0 && now === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = now - before;
  if (diff > 0) return <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded whitespace-nowrap">▲ +{diff}{unit ?? ''} vs last semester</span>;
  if (diff === 0) return <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">= same as last semester</span>;
  return <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap">{before - now}{unit ?? ''} to match last semester 💪</span>;
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
          supabase.from('archive_files').select('division, date, page_count, status, title, created_at').eq('status', 'published'),
          supabase.from('semester_snapshots').select('semester_key, semester_label, members_count, alumni_count').order('semester_key'),
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('alumni').select('id', { count: 'exact', head: true }),
          supabase.from('fund_performance_years').select('fund, year, ytd, itd').order('year', { ascending: false }),
          supabase.from('aod_days').select('event_date').gte('event_date', today).order('event_date').limit(1),
          supabase.from('events').select('title, date, start_at, registration_enabled').eq('registration_enabled', true).gte('date', today).order('date').limit(1),
        ]);
        const reportRows = (rep.data || []) as ReportRow[];
        setReports(reportRows);
        setLatestReport([...reportRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] ?? null);
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

  // Per-division report output: count and total pages, current vs previous.
  const divisionStats = useMemo(() => CORE.map((d) => {
    const of = (semKey: string) => reports.filter((r) => r.division === d && r.date && semesterOf(r.date).key === semKey);
    const nowRows = of(cur.key); const prevRows = of(prev.key);
    const pages = (rows: ReportRow[]) => rows.reduce((s, r) => s + (r.page_count ?? 0), 0);
    return { division: d, nowCount: nowRows.length, prevCount: prevRows.length, nowPages: pages(nowRows), prevPages: pages(prevRows) };
  }), [reports, cur.key, prev.key]);

  const totalNow = divisionStats.reduce((s, d) => s + d.nowCount, 0);
  const totalPrev = divisionStats.reduce((s, d) => s + d.prevCount, 0);
  const pagesNow = divisionStats.reduce((s, d) => s + d.nowPages, 0);
  const pagesPrev = divisionStats.reduce((s, d) => s + d.prevPages, 0);

  // Latest yearly stats per active fund.
  const funds = useMemo(() => activeFunds.map((f: Fund) => {
    const row = fundYears.find((r) => r.fund === f);
    return row ? { fund: f, year: row.year, ytd: row.ytd, itd: row.itd } : null;
  }).filter(Boolean) as { fund: Fund; year: number; ytd: number | null; itd: number | null }[], [fundYears]);

  const pct = (v: number | null) => v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

  if (loading) return <div><WorkspacePageHeader title="Dashboard" description="How the association is progressing, semester after semester." /><WorkspaceLoader /></div>;

  return (
    <div>
      <WorkspacePageHeader
        title="Dashboard"
        description={`How the association is progressing — ${cur.label} compared with ${prev.label}, updated automatically. The same view for every member: see what other divisions are building, celebrate it, and push your own further.`}
      />

      <div className="space-y-8 font-body">
        {/* Promotional cards — internal marketing of the association's work */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {latestReport && (
            <button type="button" onClick={() => onNavigate?.('reports', 'reports-archive')}
              className="text-left border border-separator rounded-lg p-4 hover:border-accent transition-colors group">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent mb-2"><Sparkles className="h-3.5 w-3.5" />Discover the latest report</div>
              <div className="font-serif text-foreground leading-snug line-clamp-2">{latestReport.title}</div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {divisionLabels[latestReport.division as OrgDivision] ?? latestReport.division} · {new Date(latestReport.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                {latestReport.page_count ? ` · ${latestReport.page_count} pages` : ''}
              </div>
              <div className="text-xs text-accent mt-2 inline-flex items-center gap-1">Open the archive <ArrowUpRight className="h-3 w-3" /></div>
            </button>
          )}
          {nextAod && (
            <button type="button" onClick={() => onNavigate?.('events', 'events-on-display')}
              className="text-left border border-separator rounded-lg p-4 hover:border-accent transition-colors">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent mb-2"><CalendarDays className="h-3.5 w-3.5" />Association on Display coming up</div>
              <div className="font-serif text-foreground">{new Date(`${nextAod}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div className="text-xs text-muted-foreground mt-1.5">Take a 30-minute slot and represent your division at the stand.</div>
              <div className="text-xs text-accent mt-2 inline-flex items-center gap-1">Register for a slot <ArrowUpRight className="h-3 w-3" /></div>
            </button>
          )}
          {nextEvent && (
            <button type="button" onClick={() => onNavigate?.('calendar', null)}
              className="text-left border border-separator rounded-lg p-4 hover:border-accent transition-colors">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent mb-2"><CalendarDays className="h-3.5 w-3.5" />Next event — registration open</div>
              <div className="font-serif text-foreground leading-snug line-clamp-2">{nextEvent.title}</div>
              <div className="text-xs text-muted-foreground mt-1.5">{new Date(nextEvent.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div className="text-xs text-accent mt-2 inline-flex items-center gap-1">Register from the calendar <ArrowUpRight className="h-3 w-3" /></div>
            </button>
          )}
        </div>

        {/* Association-wide report output */}
        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Research output — {cur.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-w-2xl">
            <Card><CardContent className="py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1"><FileBarChart2 className="h-3.5 w-3.5" />Reports published</div>
              <div className="font-serif text-3xl text-accent">{totalNow}</div>
              <div className="mt-1"><Delta now={totalNow} before={totalPrev} /></div>
            </CardContent></Card>
            <Card><CardContent className="py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1"><FileBarChart2 className="h-3.5 w-3.5" />Pages of research</div>
              <div className="font-serif text-3xl text-accent">{pagesNow}</div>
              <div className="mt-1"><Delta now={pagesNow} before={pagesPrev} unit=" pages" /></div>
            </CardContent></Card>
          </div>

          <div className="border border-separator overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Division</th>
                  <th className="px-3 py-2 font-normal text-right">Reports · {cur.label}</th>
                  <th className="px-3 py-2 font-normal text-right">Pages · {cur.label}</th>
                  <th className="px-3 py-2 font-normal text-right">Reports · {prev.label}</th>
                  <th className="px-3 py-2 font-normal text-right">Pages · {prev.label}</th>
                  <th className="px-3 py-2 font-normal">Momentum</th>
                </tr>
              </thead>
              <tbody>
                {divisionStats.map((d) => (
                  <tr key={d.division} className="border-t border-separator">
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">{divisionLabels[d.division]}</td>
                    <td className="px-3 py-2 text-right">{d.nowCount}</td>
                    <td className="px-3 py-2 text-right">{d.nowPages || '—'}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{d.prevCount}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{d.prevPages || '—'}</td>
                    <td className="px-3 py-2"><Delta now={d.nowPages || d.nowCount} before={d.prevPages || d.prevCount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pages measure substance as well as quantity, so shorter-but-more or longer-but-fewer reports both get a fair reading. Older reports without a recorded page count contribute to the report count only.
          </p>
        </section>

        {/* People: members & alumni per semester */}
        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">The association, semester by semester</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2"><Users className="h-3.5 w-3.5" />Members</div>
              <div className="flex items-end gap-3 mb-3">
                <div className="font-serif text-3xl text-accent">{liveMembers}</div>
                <div className="text-xs text-muted-foreground pb-1">in the directory today</div>
              </div>
              {snapshots.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {[...snapshots].reverse().map((s) => (
                    <li key={s.semester_key} className="flex justify-between border-t border-separator pt-1">
                      <span className="text-muted-foreground">{s.semester_label}</span><span className="text-foreground">{s.members_count} members</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">The official register per semester appears here once a membership-fee collection is closed.</p>
              )}
            </CardContent></Card>
            <Card><CardContent className="py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2"><GraduationCap className="h-3.5 w-3.5" />Alumni network</div>
              <div className="flex items-end gap-3 mb-3">
                <div className="font-serif text-3xl text-accent">{liveAlumni}</div>
                <div className="text-xs text-muted-foreground pb-1">alumni recorded today</div>
              </div>
              {snapshots.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {[...snapshots].reverse().map((s) => (
                    <li key={s.semester_key} className="flex justify-between border-t border-separator pt-1">
                      <span className="text-muted-foreground">{s.semester_label}</span><span className="text-foreground">{s.alumni_count} alumni</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Semester-by-semester alumni counts appear here from the first semester snapshot onwards.</p>
              )}
            </CardContent></Card>
          </div>
        </section>

        {/* Funds */}
        {funds.length > 0 && (
          <section>
            <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Fund performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              {funds.map((f) => (
                <Card key={f.fund}><CardContent className="py-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1"><TrendingUp className="h-3.5 w-3.5" />{fundLabels[f.fund]}</div>
                  <div className="flex items-end gap-4">
                    <div>
                      <div className={`font-serif text-2xl ${(f.ytd ?? 0) >= 0 ? 'text-emerald-700' : 'text-foreground'}`}>{pct(f.ytd)}</div>
                      <div className="text-xs text-muted-foreground">YTD {f.year}</div>
                    </div>
                    <div>
                      <div className="font-serif text-2xl text-foreground">{pct(f.itd)}</div>
                      <div className="text-xs text-muted-foreground">since inception</div>
                    </div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">From the performance data maintained in Reports › Fund performances.</p>
          </section>
        )}

        <p className="text-xs text-muted-foreground border-t border-separator pt-3">
          Every metric updates automatically — no reporting work needed from anyone. Workspace actions are logged for accountability and security.
        </p>
      </div>
    </div>
  );
}
