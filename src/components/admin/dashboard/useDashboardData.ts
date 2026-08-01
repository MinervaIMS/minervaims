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

/** One graduation class on the Alumni Growth chart. */
export interface AlumniYear {
  /** The class, e.g. '2024'. */
  label: string;
  /** Cumulative alumni once this class has graduated. */
  total: number;
  /** How many people are in this class. */
  added: number;
}

/** One reading, for the library crop on the Readings card. */
export interface ReadingRow { id: string; title: string; author: string }

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


  divisionCounts: DivisionCount[] | null;
  alumniYears: AlumniYear[] | null;
  fundSeries: FundSeries[] | null;
  latestUpdate: LatestUpdate | null;
  /** False only when the update query itself failed. */
  latestUpdateOk: boolean;
  avatars: AvatarRow[] | null;
  /** Recent published PDFs, for the report-cover columns. */
  reportFiles: string[] | null;
  /** Titles for the library crop. */
  readingRows: ReadingRow[] | null;

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

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [snapshots, setSnapshots] = useState<{ label: string; sort: number; members: number; alumni: number }[] | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [alumni, setAlumni] = useState<number | null>(null);
  const [readingList, setReadingList] = useState<{ id: string; title: string; author: string; created_at: string }[] | null>(null);
  const [fundRows, setFundRows] = useState<{ fund: string; year: number; months: string[] }[] | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [aod, setAod] = useState<{ event_date: string; registration_open: boolean }[] | null>(null);
  const [fee, setFee] = useState<{ semester_label: string; first_deadline: string | null; second_deadline: string | null } | null>(null);
  const [firstName, setFirstName] = useState<string | undefined>(undefined);
  // The greeting must not be picked twice: a line chosen before the name
  // and the counts arrive would be replaced a moment later, in front of
  // the reader. It waits until every variable it could use has settled.
  const [nameSettled, setNameSettled] = useState(false);
  const [alumniClasses, setAlumniClasses] = useState<{ graduation_year: number; alumni_count: number }[] | null>(null);
  const [avatars, setAvatars] = useState<AvatarRow[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [rep, snap, mem, alu, read, funds, evs, aodDays, feePeriod, classes, avatarRows] = await Promise.all([
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
        safe<{ id: string; title: string; author: string; created_at: string }[]>(() => supabase
          .from('readings').select('id, title, author, created_at').order('display_order', { ascending: true })),
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
        safe<{ graduation_year: number; alumni_count: number }[]>(() => supabase
          .rpc('public_alumni_classes')),
        safe<AvatarRow[]>(() => supabase
          .from('team_members')
          .select('name, surname, photo_url')
          .not('photo_url', 'is', null)
          .limit(40)),
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
      setReadingList(read);
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
      setAlumniClasses(classes);
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

  // --- snapshots, as academic years ------------------------------------

  /**
   * The alumni network BY GRADUATION CLASS, cumulative and per class.
   *
   * Nothing here waits for anything. The previous version derived the
   * series from `semester_snapshots`, which are written when a fee
   * collection closes, so a workspace with one closed collection had a
   * chart that said the series would begin at the next one. Graduation
   * classes exist the moment an alumnus is recorded, which is the right
   * basis for a chart about how the network grew.
   *
   * `alumni.graduation_year` is NOT NULL, so no record can be missing a
   * class and none is ever assigned an invented one.
   */
  const alumniYears = useMemo<AlumniYear[] | null>(() => {
    if (!alumniClasses) return null;
    const ordered = [...alumniClasses]
      .filter((c) => Number.isFinite(c.graduation_year) && c.alumni_count > 0)
      .sort((a, b) => a.graduation_year - b.graduation_year);
    let running = 0;
    return ordered.map((c) => {
      running += Number(c.alumni_count);
      return { label: String(c.graduation_year), total: running, added: Number(c.alumni_count) };
    });
  }, [alumniClasses]);

  // --- readings --------------------------------------------------------

  const readings = readingList ? readingList.length : null;

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

  /**
   * The PDFs behind the report-cover columns. Six is the whole ask: each
   * is fetched once and then reused as an image, so the loop costs nothing
   * per frame however many copies are on screen.
   */
  const reportFiles = useMemo(
    () => (reports ? reports.slice(0, 6).map((r) => r.file_url).filter(Boolean) : null),
    [reports],
  );

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
      readingsCount: readingList ? readingList.length : undefined,
      semesterLabel: semester.label,
      semesterOrdinal: ordinalNumber > 0 ? semesterOrdinal(ordinalNumber) : undefined,
    };
  }, [firstName, members, alumni, reports, readingList, semester]);

  return {
    loading,
    semester,
    previous,
    reportsAllTime,
    members,
    alumni,
    readings,
    divisionCounts,
    alumniYears,
    fundSeries,
    latestUpdate,
    latestUpdateOk: reports !== null || events !== null,
    avatars,
    reportFiles,
    readingRows: readingList,
    greetingVars,
    greetingReady: !loading && nameSettled,
    userId,
  };
}
