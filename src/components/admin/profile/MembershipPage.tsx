import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, Download, ExternalLink, FileText, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { workspacePath } from '@/lib/workspace-nav';
import { rosterDivisionLabel, rosterTeamLabel } from '@/lib/rosters';
import { reportTypeLabel } from '@/lib/report-meta';
import { verifyPath, type CertificateStatus } from '@/lib/certificate-api';
import {
  academicYearOf, semesterOrdinal, type CareerEntry, type CareerHistory, type MyProjects, type ProjectReport,
} from '@/lib/profile-api';
import {
  EmptyState, ProfileCard, ShowMore, StatusChip, longDate, monthYear,
} from '@/components/admin/profile/profile-ui';

// =====================================================================
// MY PROFILE, MEMBERSHIP (Step 97B).
// ---------------------------------------------------------------------
// Your path through the Society: the role you held in every semester,
// the reports you worked on, and the certificate of your membership.
//
// THE CAREER IS A TIMELINE, NEWEST FIRST, GROUPED BY ACADEMIC YEAR. A
// semester is the Society's unit of time (offices, the fee and the
// commitment all run by semester), and the academic year is how members
// count them ("my second year"), so the years are the headings and the
// semesters the points on the line. The current semester leads, marked
// Now. A semester whose role differs from the one before carries New
// role, so a promotion or a move between divisions is seen at a glance
// without the page claiming to know which it was. Nothing is drawn for a
// semester the rosters do not have: an empty point would assert a
// semester of leave the record may simply be missing.
//
// It reads the rosters (People, Rosters) for the signed-in member only,
// through my_roster_history; the reports through my_report_projects, by
// the rule the report pages use to link an author to a person.
// =====================================================================

const STANDING_NOTE: Record<string, string> = {
  on_exchange: 'On exchange',
  one_semester_pause: 'Semester of leave',
};

interface SemesterGroup {
  semester: string;
  label: string;
  roles: CareerEntry[];
  current: boolean;
  status?: string;
}

/** Every semester with its roles, newest first, current one included. */
export function careerSemesters(history: CareerHistory | null): SemesterGroup[] {
  if (!history) return [];
  const map = new Map<string, SemesterGroup>();
  const add = (e: CareerEntry, current: boolean) => {
    const g = map.get(e.semester) ?? { semester: e.semester, label: e.label, roles: [], current, status: e.status };
    if (!g.roles.some((r) => r.role === e.role && r.division === e.division)) g.roles.push(e);
    map.set(e.semester, g);
  };
  if (history.current) add(history.current, true);
  for (const e of history.entries) add(e, false);
  return [...map.values()].sort((a, b) => semesterOrdinal(b.semester) - semesterOrdinal(a.semester));
}

function roleKey(g: SemesterGroup) {
  return g.roles.map((r) => `${r.role}|${r.division}`).sort().join(';');
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-separator bg-background px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="font-serif text-lg leading-tight text-accent tabular-nums sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase leading-snug tracking-wider text-muted-foreground sm:text-xs">{label}</div>
    </div>
  );
}

function Timeline({ groups }: { groups: SemesterGroup[] }) {
  // Academic years, newest first, each with its semesters, newest first.
  const years = useMemo(() => {
    const out: { year: string; semesters: SemesterGroup[] }[] = [];
    for (const g of groups) {
      const year = academicYearOf(g.semester);
      const last = out[out.length - 1];
      if (last && last.year === year) last.semesters.push(g);
      else out.push({ year, semesters: [g] });
    }
    return out;
  }, [groups]);
  const oldest = groups[groups.length - 1]?.semester;

  return (
    <ol className="space-y-5" aria-label="Your semesters, newest first">
      {years.map(({ year, semesters }) => (
        <li key={year}>
          <h3 className="mb-2 font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Academic year {year}
          </h3>
          <ol className="ml-1.5 border-l border-separator">
            {semesters.map((g) => {
              const index = groups.indexOf(g);
              const before = groups[index + 1];
              const changed = !!before && roleKey(before) !== roleKey(g);
              const joined = g.semester === oldest;
              return (
                <li key={g.semester} className="relative pb-4 pl-5 last:pb-0" aria-current={g.current ? 'step' : undefined}>
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[5px] top-[7px] h-2.5 w-2.5 rounded-full border-2 ${g.current ? 'border-accent bg-accent ring-4 ring-accent/15' : 'border-accent bg-background'}`}
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`text-sm ${g.current ? 'font-semibold text-accent' : 'font-semibold text-foreground'}`}>{g.label}</span>
                    {g.current && <StatusChip tone="accent">Now</StatusChip>}
                    {g.current && g.status && STANDING_NOTE[g.status] && <StatusChip tone="neutral">{STANDING_NOTE[g.status]}</StatusChip>}
                    {joined && !g.current && <StatusChip tone="neutral">Joined</StatusChip>}
                    {changed && <StatusChip tone="neutral">New role</StatusChip>}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {g.roles.map((r) => {
                      const team = rosterTeamLabel(r.team);
                      return (
                        <li key={`${r.role}|${r.division}`}>
                          <span className="font-serif text-lg italic leading-snug text-foreground">{r.role}</span>
                          <span className="block text-xs text-muted-foreground">
                            {rosterDivisionLabel(r.division)}{team ? ` · ${team}` : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function ProjectRow({ r }: { r: ProjectReport }) {
  const meta = [reportTypeLabel(r.report_type), r.date ? monthYear(r.date) : null, r.role ? `as ${r.role}` : null].filter(Boolean).join(' · ');
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {r.slug ? (
          <a href={`/archive/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-foreground underline-offset-2 hover:text-accent hover:underline">
            {r.title}<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span className="text-sm font-semibold text-foreground">{r.title}</span>
        )}
        {meta && <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>}
      </div>
      {r.status === 'draft' && <StatusChip tone="waiting">Draft</StatusChip>}
      {r.status === 'blocked' && <StatusChip tone="neutral">Not published</StatusChip>}
    </li>
  );
}

export function MembershipPage({
  history, historyError, projects, projectsError, certificate, onCertificate, issuing, canUpload, canSeeRosters,
}: {
  history: CareerHistory | null;
  historyError: boolean;
  projects: MyProjects | null;
  projectsError: boolean;
  certificate: CertificateStatus | null;
  onCertificate: () => void;
  issuing: boolean;
  /** The reader can open Reports, Upload Report. */
  canUpload: boolean;
  /** The reader can open People, Rosters. */
  canSeeRosters: boolean;
}) {
  const groups = useMemo(() => careerSemesters(history), [history]);
  const reports = projects?.reports ?? [];
  const published = reports.filter((r) => r.status === 'published').length;
  const firstSemester = groups[groups.length - 1]?.label ?? null;
  const loadingHistory = !history && !historyError;
  const loadingProjects = !projects && !projectsError;

  // --- career --------------------------------------------------------------
  const career = (
    <ProfileCard title="Career inside Minerva" headingId="ms-career">
      {loadingHistory ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Reading your semesters</div>
      ) : historyError ? (
        <EmptyState icon={<History className="h-5 w-5" />} title="Your semesters could not be read just now">
          Try again in a moment. If it keeps happening, the Admin can check that the rosters are in place.
        </EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState icon={<History className="h-5 w-5" />} title={history?.linked ? 'Your first semester is on its way' : 'Your semesters appear here'}>
          {history?.linked
            ? 'Each semester you serve is recorded in the rosters, and listed here with your role.'
            : 'Once your record is linked to the rosters, every semester you have served is listed here with your role, from the first.'}
        </EmptyState>
      ) : (
        <>
          <Timeline groups={groups} />
          <p className="mt-5 border-t border-separator pt-3 text-xs leading-relaxed text-muted-foreground">
            From the rosters: past semesters as recorded, this semester from the register. If a semester is missing or wrong, the
            President or the Vice President can correct it{canSeeRosters ? <> in <Link to={workspacePath('people', 'people-rosters')} className="text-accent underline underline-offset-2">People, Rosters</Link></> : null}.
          </p>
        </>
      )}
    </ProfileCard>
  );

  // --- projects ------------------------------------------------------------
  const projectsCard = (
    <ProfileCard
      title="Your projects"
      headingId="ms-projects"
      action={reports.length > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{reports.length} {reports.length === 1 ? 'report' : 'reports'}</span> : undefined}
    >
      {loadingProjects ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Reading your reports</div>
      ) : projectsError ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="Your reports could not be read just now">
          Try again in a moment.
        </EmptyState>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No report names you yet"
          action={(
            <a href="/archive" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent underline underline-offset-2">
              Browse the research archive<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        >
          A report you write is listed here once its authors include you, as on its cover.
          {canUpload ? <> Authors are set when a report is uploaded, in <Link to={workspacePath('reports', 'reports-upload')} className="text-accent underline underline-offset-2">Reports, Upload Report</Link>.</> : ' Your Head of Division sets them when the report is uploaded.'}
        </EmptyState>
      ) : (
        <>
          <ShowMore
            items={reports}
            initial={5}
            noun="reports"
            className="divide-y divide-separator"
            render={(r) => <ProjectRow key={r.id} r={r} />}
          />
          <p className="mt-4 border-t border-separator pt-3 text-xs leading-relaxed text-muted-foreground">
            Each published report opens on its own page in the research archive, with its PDF. A report shows here when its
            authors name you, as the report page links them.
          </p>
        </>
      )}
    </ProfileCard>
  );

  // --- certificate -----------------------------------------------------------
  // For a member who can have one, and for a former member among the
  // alumni (the last semester they served). The download is a read, so it
  // works on a phone as well (`data-ro`).
  const certificateCard = certificate ? (
    <ProfileCard
      title="Membership certificate"
      headingId="ms-certificate"
      action={certificate.eligible && !certificate.withdrawn ? (
        <Button data-ro size="sm" variant="solid" disabled={issuing} onClick={onCertificate}>
          {issuing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          Download PDF
        </Button>
      ) : undefined}
    >
      {certificate.eligible && !certificate.withdrawn ? (
        <>
          <div className="flex items-start gap-3">
            <Award className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-foreground/85">
              {certificate.holder_status === 'alumni'
                ? <>Your role as {certificate.role_label} in {certificate.semester_label}, the last semester you served, certified in a PDF signed by the President and the Vice President.</>
                : <>Your role as {certificate.role_label} in {certificate.semester_label}, certified in a PDF signed by the President and the Vice President.</>}
              {' '}Anyone can confirm it at minervaims.org/verify.
            </p>
          </div>
          {certificate.certificate && (
            <p className="mt-3 text-xs text-muted-foreground">
              Certificate {certificate.certificate.code}, issued {longDate(certificate.certificate.issued_at)}.{' '}
              <Link data-ro to={verifyPath(certificate.certificate.code)} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">
                Check it<span className="sr-only"> (opens in a new tab)</span>
              </Link>
            </p>
          )}
        </>
      ) : (
        <div className="flex items-start gap-3">
          <Award className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {certificate.reason || 'A certificate is available to members on the register for the current semester, and to former members among the alumni.'}
          </p>
        </div>
      )}
    </ProfileCard>
  ) : null;

  const semestersServed = groups.length;
  return (
    <div className="space-y-4">
      {/* One row at every width: three numbers read together. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat value={firstSemester ?? 'Not yet'} label="Member since" />
        <Stat value={String(semestersServed)} label={semestersServed === 1 ? 'Semester served' : 'Semesters served'} />
        <Stat value={String(published)} label={published === 1 ? 'Published report' : 'Published reports'} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-7">{career}</div>
        <div className="min-w-0 space-y-4 lg:col-span-5">
          {certificateCard}
          {projectsCard}
        </div>
      </div>
    </div>
  );
}
