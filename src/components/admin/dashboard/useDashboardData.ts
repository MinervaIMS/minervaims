import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { currentSemester, previousSemester, semesterOf, type Semester } from '@/lib/semester';
import { parseFundNumber } from '@/lib/funds-api';
import { activeFunds, type Fund } from '@/lib/types';
import type { OrgDivision } from '@/lib/roles';
import { semesterOrdinal, type GreetingVars } from './greetings';

// =====================================================================
// useDashboardData — every figure on the Dashboard, from live data.
// ---------------------------------------------------------------------
// One hook, one round of queries, one shape for the page to render. The
// rules it enforces are the ones the Dashboard cannot be trusted without:
//
//  * EVERY SOURCE FAILS ALONE. Each query is awaited separately and its
//    failure produces `null` for that slice only, never an exception and
//    never a zero. A member reads these numbers as fact, so "we do not
//    know" has to be representable and has to look different from "none".
//
//  * NOTHING IS INVENTED. There is no fallback constant anywhere below.
//    A block whose source is null renders a skeleton or a dash.
//
//  * SEMESTERS SORT BY THE SEMESTER MODEL, NOT BY THEIR KEY. Sorting
//    `semester_key` as text puts '2026-fall' before '2026-spring', which
//    is the wrong way round, so the "previous semester" snapshot could be
//    a semester that has not happened yet. Every ordering here goes
//    through the monotonic `sort` the semester model already defines.
// =====================================================================

/** The society was born in Fall 2019: semester number 1. */
const FOUNDING_SORT = 2019 * 2 + 1;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CORE_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
export const DIVISION_SHORT: Record<string, string> = {
  equity: 'Equity', investment: 'Investment', macro: 'Macro', portfolio: 'Portfolio', quant: 'Quant',
};

// --- row shapes -------------------------------------------------------

export interface ReportRow {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  division: string;
  date: string;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  place: string | null;
  poster_url: string | null;
  event_type: string;
  show_on_website: boolean;
}

export interface AvatarRow { name: string; surname: string; photo_url: string | null }

/** One month of one fund, already compounded into a rebasable series. */
export interface FundPoint { order: number; label: string; date: string; value: number }

export interface FundSeries { fund: Fund; points: FundPoint[] }

export interface DivisionCount { name: string; previous: number; current: number }

export interface AlumniPoint { label: string; sort: number; alumni: number }

/** A previous-period comparison, or a static reference when none exists. */
export interface Comparison {
  /** Present when a genuine comparison exists. */
  delta?: number;
  /** What the delta is measured against, e.g. "Fall 2025". */
  reference: string;
  /**
   * How the change should read. `up` is a genuine improvement, `flat` is
   * neutral, and a decrease that is not a problem (members leaving after
   * graduation) is `flat` too. Nothing on this page is ever `down`.
   */
  tone: 'up' | 'flat';
}

export interface LatestUpdate {
  kind: 'fee' | 'aod' | 'event-public' | 'event-internal' | 'report';
  category: string;
  title: string;
  detail: string | null;
  date: string | null;
  /** Event poster. Reports have no cover column; the block renders the PDF. */
  imageUrl: string | null;
  /** Set for the report fallback, so the block can draw the PDF's first page. */
  pdfUrl: string | null;
}

export interface DashboardData {
  loading: boolean;
  semester: Semester;
  previous: Semester;

  /** null means "could not be read", never "zero". */
  reportsAllTime: number | null;
  members: number | null;
  alumni: number | null;
  readings: number | null;

  reportsComparison: Comparison | null;
  membersComparison: Comparison | null;
  alumniComparison: Comparison | null;
  readingsComparison: Comparison | null;

  divisionCounts: DivisionCount[] | null;
  alumniHistory: AlumniPoint[] | null;
  fundSeries: FundSeries[] | null;
  latestUpdate: LatestUpdate | null;
  /** False only when the update query itself failed. */
  latestUpdateOk: boolean;
  avatars: AvatarRow[] | null;

  greetingVars: GreetingVars;
  /** False until every greeting variable has settled, so it is picked once. */
  greetingReady: boolean;
  userId: string;
}

// --- helpers ----------------------------------------------------------

/** Monotonic order for a `semester_key` such as '2026-spring'. */
function sortOfKey(key: string): number {
  const [yearText, season] = key.split('-');
  const year = Number(yearText);
  if (!Number.isFinite(year)) return 0;
  return season === 'fall' ? year * 2 + 1 : year * 2;
}

/** Await a query and keep its failure local: null means "unknown". */
async function safe<T>(run: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data, error } = await run();
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * A comparison line. `up` for an increase, `flat` for level or for a
 * decrease that is not a problem. A member-count decrease reflects
 * graduation and is never marked as a failure.
 */
function compare(now: number | null, before: number | null, reference: string | null): Comparison | null {
  if (now === null) return null;
  if (before === null || reference === null) return null;
  const delta = now - before;
  return { delta, reference, tone: delta > 0 ? 'up' : 'flat' };
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [snapshots, setSnapshots] = useState<{ label: string; sort: number; members: number; alumni: number }[] | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [alumni, setAlumni] = useState<number | null>(null);
  const [readingDates, setReadingDates] = useState<string[] | null>(null);
  const [fundRows, setFundRows] = useState<{ fund: string; year: number; months: string[] }[] | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [aod, setAod] = useState<{ event_date: string; registration_open: boolean }[] | null>(null);
  const [fee, setFee] = useState<{ semester_label: string; first_deadline: string | null; second_deadline: string | null } | null>(null);
  const [firstName, setFirstName] = useState<string | undefined>(undefined);
  // The greeting must not be picked twice: a line chosen before the name
  // and the counts arrive would be replaced a moment later, in front of
  // the reader. It waits until every variable it could use has settled.
  const [nameSettled, setNameSettled] = useState(false);
  const [avatars, setAvatars] = useState<AvatarRow[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [rep, snap, mem, alu, read, funds, evs, aodDays, feePeriod, avatarRows] = await Promise.all([
        safe<ReportRow[]>(() => supabase
          .from('archive_files')
          .select('id, title, description, file_url, division, date')
          .eq('status', 'published')
          .order('date', { ascending: false })),
        safe<{ semester_key: string; semester_label: string; members_count: number; alumni_count: number }[]>(() => supabase
          .from('semester_snapshots')
          .select('semester_key, semester_label, members_count, alumni_count')),
        safe<number>(() => supabase.rpc('workspace_member_count')),
        safe<number>(() => supabase.rpc('public_alumni_filter_count')),
        safe<{ created_at: string }[]>(() => supabase.from('readings').select('created_at')),
        safe<{ fund: string; year: number; months: unknown }[]>(() => supabase
          .from('fund_performance_years')
          .select('fund, year, months')
          .order('year', { ascending: true })),
        safe<EventRow[]>(() => supabase
          .from('events')
          .select('id, title, description, date, place, poster_url, event_type, show_on_website')
          .order('date', { ascending: true })),
        safe<{ event_date: string; registration_open: boolean }[]>(() => supabase
          .from('aod_days')
          .select('event_date, registration_open')),
        safe<{ semester_label: string; first_deadline: string | null; second_deadline: string | null }>(() => supabase
          .from('fee_periods')
          .select('semester_label, first_deadline, second_deadline')
          .eq('closed', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()),
        safe<AvatarRow[]>(() => supabase
          .from('team_members')
          .select('name, surname, photo_url')
          .not('photo_url', 'is', null)
          .limit(24)),
      ]);

      if (!active) return;

      setReports(rep);
      setSnapshots(snap
        ? snap.map((s) => ({
          label: s.semester_label,
          sort: sortOfKey(s.semester_key),
          members: s.members_count,
          alumni: s.alumni_count,
        })).sort((a, b) => a.sort - b.sort)
        : null);
      setMembers(typeof mem === 'number' ? mem : null);
      setAlumni(typeof alu === 'number' ? alu : null);
      setReadingDates(read ? read.map((r) => r.created_at) : null);
      setFundRows(funds
        ? funds.map((r) => {
          const raw = Array.isArray(r.months) ? (r.months as unknown[]) : [];
          return {
            fund: String(r.fund),
            year: Number(r.year),
            months: Array.from({ length: 12 }, (_, i) => (raw[i] == null ? '' : String(raw[i]))),
          };
        })
        : null);
      setEvents(evs);
      setAod(aodDays);
      setFee(feePeriod);
      setAvatars(avatarRows);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // The greeting drops any line whose variable is missing, so a first name
  // that cannot be read simply narrows the pool rather than showing a token.
  useEffect(() => {
    let active = true;
    if (!user?.id) { setNameSettled(true); return; }
    (async () => {
      const row = await safe<{ first_name: string }>(() => supabase
        .from('members').select('first_name').eq('user_id', user.id).maybeSingle());
      if (!active) return;
      if (row?.first_name) setFirstName(row.first_name);
      setNameSettled(true);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const semester = currentSemester();
  const previous = previousSemester(semester);

  // --- reports ---------------------------------------------------------

  const reportsAllTime = reports ? reports.length : null;

  const divisionCounts = useMemo<DivisionCount[] | null>(() => {
    if (!reports) return null;
    return CORE_DIVISIONS.map((d) => {
      const inSem = (key: string) => reports.filter((r) => r.division === d && r.date && semesterOf(r.date).key === key).length;
      return { name: DIVISION_SHORT[d] ?? d, previous: inSem(previous.key), current: inSem(semester.key) };
    });
  }, [reports, semester.key, previous.key]);

  const reportsComparison = useMemo<Comparison | null>(() => {
    if (!reports) return null;
    const inSem = (key: string) => reports.filter((r) => r.date && semesterOf(r.date).key === key).length;
    const now = inSem(semester.key);
    const before = inSem(previous.key);
    // A semester with nothing on either side is not a comparison, it is an
    // absence. The card falls back to the society's own reference point.
    if (now === 0 && before === 0) return { reference: 'since Fall 2019', tone: 'flat' };
    return compare(now, before, previous.label);
  }, [reports, semester.key, previous.key, previous.label]);

  // --- snapshots -------------------------------------------------------

  const lastSnapshot = snapshots && snapshots.length ? snapshots[snapshots.length - 1] : null;

  const membersComparison = useMemo(
    () => compare(members, lastSnapshot?.members ?? null, lastSnapshot?.label ?? null),
    [members, lastSnapshot],
  );
  const alumniComparison = useMemo(
    () => compare(alumni, lastSnapshot?.alumni ?? null, lastSnapshot?.label ?? null),
    [alumni, lastSnapshot],
  );

  const alumniHistory = useMemo<AlumniPoint[] | null>(() => {
    if (!snapshots) return null;
    return snapshots.map((s) => ({ label: s.label, sort: s.sort, alumni: s.alumni }));
  }, [snapshots]);

  // --- readings --------------------------------------------------------

  const readings = readingDates ? readingDates.length : null;

  const readingsComparison = useMemo<Comparison | null>(() => {
    if (!readingDates) return null;
    const added = (key: string) => readingDates.filter((d) => d && semesterOf(d).key === key).length;
    const now = added(semester.key);
    const before = added(previous.key);
    if (now === 0 && before === 0) return { reference: 'currently published', tone: 'flat' };
    return compare(now, before, previous.label);
  }, [readingDates, semester.key, previous.key, previous.label]);

  // --- funds -----------------------------------------------------------

  // One point per published month, compounded from the monthly returns and
  // stopping at the LAST MONTH THAT HAS A VALUE. Nothing is carried forward:
  // a flat line running to December would be a claim about months that have
  // not been reported.
  const fundSeries = useMemo<FundSeries[] | null>(() => {
    if (!fundRows) return null;
    return activeFunds.map((fund) => {
      const rows = fundRows.filter((r) => r.fund === fund).sort((a, b) => a.year - b.year);
      const points: FundPoint[] = [];
      let nav = 1;
      let started = false;
      for (const row of rows) {
        for (let i = 0; i < 12; i += 1) {
          const parsed = parseFundNumber(row.months[i] ?? '');
          if (parsed === null) continue;
          if (started) nav *= 1 + parsed / 100;
          started = true;
          points.push({
            order: row.year * 12 + i,
            label: `${MONTHS_SHORT[i]} ${String(row.year).slice(2)}`,
            date: new Date(row.year, i + 1, 0).toLocaleDateString('en-GB'),
            value: nav,
          });
        }
      }
      return { fund, points };
    });
  }, [fundRows]);

  // --- latest update ---------------------------------------------------

  const latestUpdate = useMemo<LatestUpdate | null>(() => {
    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const horizon = midnight + 30 * 24 * 60 * 60 * 1000;
    const asDate = (d: string) => new Date(d).getTime();
    const format = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

    // 1. Membership fee, while a collection is open.
    if (fee) {
      const deadline = fee.first_deadline ?? fee.second_deadline;
      return {
        kind: 'fee',
        category: 'Membership fee',
        title: `${fee.semester_label} membership fee`,
        detail: deadline ? `First deadline ${format(deadline)}` : 'Collection is open',
        date: deadline,
        imageUrl: null,
        pdfUrl: null,
      };
    }

    // 2. Association on Display, while registration is open.
    const openDay = (aod ?? [])
      .filter((d) => d.registration_open && asDate(d.event_date) >= midnight)
      .sort((a, b) => asDate(a.event_date) - asDate(b.event_date))[0];
    if (openDay) {
      return {
        kind: 'aod',
        category: 'Association on Display',
        title: 'Registration is open',
        detail: `Stand duty on ${format(openDay.event_date)}`,
        date: openDay.event_date,
        imageUrl: null,
        pdfUrl: null,
      };
    }

    // 3 and 4. The next event within thirty days, public before internal.
    const upcoming = (events ?? [])
      .filter((e) => asDate(e.date) >= midnight && asDate(e.date) <= horizon)
      .sort((a, b) => asDate(a.date) - asDate(b.date));
    const nextPublic = upcoming.find((e) => e.show_on_website);
    const nextInternal = upcoming.find((e) => !e.show_on_website);
    const event = nextPublic ?? nextInternal;
    if (event) {
      return {
        kind: nextPublic ? 'event-public' : 'event-internal',
        category: nextPublic ? 'Upcoming event' : 'Internal event',
        title: event.title,
        detail: event.place || event.description,
        date: event.date,
        imageUrl: event.poster_url,
        pdfUrl: null,
      };
    }

    // 5. The latest published report. This always exists, so the block has
    //    no empty state; only a failed query leaves it without content.
    const report = reports && reports.length ? reports[0] : null;
    if (report) {
      return {
        kind: 'report',
        category: 'Latest report',
        title: report.title,
        detail: report.description,
        date: report.date,
        imageUrl: null,
        pdfUrl: report.file_url,
      };
    }
    return null;
  }, [fee, aod, events, reports]);

  const greetingVars = useMemo<GreetingVars>(() => {
    const ordinalNumber = semester.sort - FOUNDING_SORT + 1;
    const thisSemesterReports = reports
      ? reports.filter((r) => r.date && semesterOf(r.date).key === semester.key).length
      : undefined;
    return {
      firstName,
      memberCount: members ?? undefined,
      alumniCount: alumni ?? undefined,
      reportsThisSemester: thisSemesterReports,
      reportsAllTime: reports ? reports.length : undefined,
      readingsCount: readingDates ? readingDates.length : undefined,
      semesterLabel: semester.label,
      semesterOrdinal: ordinalNumber > 0 ? semesterOrdinal(ordinalNumber) : undefined,
    };
  }, [firstName, members, alumni, reports, readingDates, semester]);

  return {
    loading,
    semester,
    previous,
    reportsAllTime,
    members,
    alumni,
    readings,
    reportsComparison,
    membersComparison,
    alumniComparison,
    readingsComparison,
    divisionCounts,
    alumniHistory,
    fundSeries,
    latestUpdate,
    latestUpdateOk: reports !== null || events !== null,
    avatars,
    greetingVars,
    greetingReady: !loading && nameSettled,
    userId,
  };
}
