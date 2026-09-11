import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currentSemester, semesterOf, semestersInData } from '@/lib/semester';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { Recommendation } from '@/components/admin/Recommendation';
import { Download, FileText, Search, MessageSquare, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useIsDesktop } from '@/hooks/use-desktop';

import { logActivity } from '@/lib/activity-log';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { ClearFilters } from '@/components/shared/ClearFilters';
import {
  listApplications, signDocumentUrl, bulkDocumentUrls,
  addApplicationNote, setEvaluationDivision,
  ACADEMIC_YEAR_LABELS, STATUS_FLOW, STATUS_LABELS, statusBadgeClass,
  isLockedStatus,
  APPLY_DIVISIONS, EVALUATION_DIVISIONS, applyDivisionLabel,
  evaluationDivision, allowedEvaluationDivisions, isReEvaluated,
  reviewerDivisionsOf, canProgressApplication,
  type ApplicationRow, type ApplicationStatus, type BulkDocument,
} from '@/lib/applications-api';
import { openReportInTab } from '@/lib/open-report';
import { useCandidateDetail } from '@/components/admin/recruiting/useCandidateDetail';
import { CandidateProfile } from '@/components/admin/recruiting/CandidateProfile';
import { CandidateStatusControl } from '@/components/admin/recruiting/CandidateStatusControl';
import { documentTitle } from '@/components/admin/recruiting/document-title';
import { safeLinkedInUrl } from '@/lib/linkedin';
import linkedinIcon from '@/assets/linkedin-icon.png';
import { zipFromUrls } from '@/lib/zip';
import { downloadBlob } from '@/lib/file-download';

/** Sentinel used by the second-choice filter for applicants who named none. */
const NO_SECOND_CHOICE = '__none__';

// =====================================================================
// BULK DOWNLOAD: ONE ARCHIVE, NOT ONE TAB PER CANDIDATE.
// ---------------------------------------------------------------------
// This used to create an <a download target="_blank"> per file, 400ms
// apart. The `download` attribute is IGNORED cross-origin, and these are
// signed Supabase storage URLs, so what the browser actually did with
// each one was open a tab. Thirty filtered candidates meant thirty tabs
// arriving over twelve seconds, on top of whatever the reviewer already
// had open: the browser became unusable and none of the documents could
// be read, which is exactly what was reported.
//
// The files are fetched and packed into a single zip instead, saved from
// a blob URL on the page's own origin, where `download` IS honoured and
// the archive gets the name it should have. See lib/zip.ts.
//
// WHEN BOTH KINDS ARE ASKED FOR, THE ARCHIVE HAS A FOLDER PER APPLICANT,
// because a flat list of sixty files named Surname_Firstname_cv.pdf and
// Surname_Firstname_answer.pdf is a list nobody can read a candidate out
// of. One kind on its own stays flat: the folders would each hold one
// file and add nothing.
// =====================================================================

/** What the archive is called, and what is inside each entry. */
function zipEntriesFor(files: BulkDocument[], kind: 'cv' | 'answer' | 'both') {
  if (kind !== 'both') return files.map((f) => ({ name: f.name, url: f.url }));
  return files.map((f) => ({
    name: `${f.folder || 'Applicant'}/${f.kind === 'answer' ? 'Written answer' : 'CV'}.pdf`,
    url: f.url,
  }));
}

/**
 * One bulk-download button, which reports what it is doing.
 *
 * Packing thirty PDFs takes long enough that a button which only greys
 * out reads as a button that did nothing, so it counts the files as they
 * arrive. The other buttons disable while any download runs: two archives
 * being built at once would compete for the connection and neither would
 * be ready sooner.
 */
function BulkDownloadButton({ label, kind, busy, progress, disabled, onRun }: {
  label: string;
  kind: 'cv' | 'answer' | 'both';
  busy: false | 'cv' | 'answer' | 'both';
  progress: { done: number; total: number } | null;
  disabled: boolean;
  onRun: (kind: 'cv' | 'answer' | 'both') => void;
}) {
  const running = busy === kind;
  return (
    <Button
      variant="outline"
      className="font-body"
      disabled={disabled || busy !== false}
      onClick={() => onRun(kind)}
    >
      {running
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{progress ? `${progress.done} of ${progress.total}` : 'Preparing'}</>
        : <><Download className="h-4 w-4 mr-2" />{label}</>}
    </Button>
  );
}

export default function CandidatesManagement() {
  const { session, roles } = useAuth();
  const { canManage, hasSpecial, isFullAccess } = useAccess();
  const isDesktop = useIsDesktop();

  // Team leaders and portfolio managers may review candidates and add notes,
  // but only roles with full access may change a candidate's status.
  const { toast } = useToast();

  // =================================================================
  // EVERY REVIEWER READS THE WHOLE INTAKE.
  // -----------------------------------------------------------------
  // The list this page receives is every application in the semester,
  // for every role that may open the page: the heads, and now the team
  // leaders and portfolio managers too. A selection round is judged as a
  // whole or not at all, and a team leader sitting in on interviews
  // could not previously see how the candidate in front of them compared
  // with the rest of the intake. The Evaluated for column says which
  // division each candidate sits with, and it filters, so "mine" is one
  // press away.
  //
  // WHAT THEY MAY DO IS UNCHANGED, to the letter: a team leader and a
  // portfolio manager read and add notes, and nothing else, exactly as
  // before. `myDivisions` is what remains of division scoping, and it
  // now answers one question only: whose candidacies this reader may
  // ADVANCE. See the note on `canProgress` below.
  // =================================================================
  const myDivisions = useMemo(
    () => reviewerDivisionsOf(roles as { role: string; division?: string | null }[] | null, isFullAccess),
    [roles, isFullAccess],
  );

  const [apps, setApps] = useState<ApplicationRow[]>([]);
  // Semester scope: the active workflow only shows THIS semester's
  // applications; older semesters stay archived and read-only.
  const [semKey, setSemKey] = useState(currentSemester().key);
  const viewingArchived = semKey !== currentSemester().key;
  const canChangeStatus = canManage('applications-screening') && !viewingArchived;
  const canAddNotes = (canManage('applications-screening') || hasSpecial('applications-screening', 'candidates_notes_only')) && !viewingArchived;
  // NOTES SURVIVE THE READ-ONLY SWEEP FOR THE ROLES THAT MAY WRITE THEM.
  // Portfolio Managers and Team Leaders hold 'view' on this page, so the
  // workspace-wide guard greyed out their "Add note" button even though the
  // matrix and the server both allow the note. Marked as an exception only
  // on desktop, keeping the phone read-only policy exactly as it is.
  const notesAllowedInReadOnly = isDesktop && canAddNotes && !canManage('applications-screening');

  // =================================================================
  // TWO POWERS, AND THEY NO LONGER COVER THE SAME CANDIDATES.
  // -----------------------------------------------------------------
  // MOVING a candidate to another division is open to every role that
  // may manage this page, for every candidate in the semester, because
  // reassignment exists precisely when a candidate is sitting in the
  // wrong place and the person who notices is usually not the division
  // holding them.
  //
  // ADVANCING one - inviting, rejecting, marking them interviewed - is
  // still the assessing division's, because those acts speak to the
  // candidate in that division's name and an invitation opens that
  // division's interview calendar.
  //
  // `canChangeStatus` answers the first (a role question), and
  // `canProgress` the second (a role AND a candidate question). The edge
  // function enforces the same pair; these two are what stop a reviewer
  // being offered a control that would then be refused.
  // =================================================================
  const canProgress = (a: Pick<ApplicationRow, 'first_choice' | 'second_choice' | 'evaluation_division'>) =>
    canChangeStatus && canProgressApplication(a, myDivisions);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // =================================================================
  // TWO CHOICES, TWO COLUMNS, TWO FILTERS.
  // -----------------------------------------------------------------
  // The register used to carry one column headed "1st / 2nd choice",
  // printing "Equity Research / Macro Research" in a single cell behind
  // a single filter. Reviewing is done one division at a time, and that
  // column could not answer the only question a reviewer asks of it:
  // who put US first. Ticking "Equity Research" returned everyone who
  // named Equity anywhere, first choice and fallback together, and the
  // cell gave no way to tell the two apart at a glance.
  //
  // They are now two columns with a filter each, so first and second
  // choice can be narrowed independently - and combined, which is what
  // makes the pair useful: first choice Equity AND second choice Macro
  // is a question the old column could not express at all.
  // =================================================================
  const [firstChoiceFilter, setFirstChoiceFilter] = useState<string[]>([]);
  const [secondChoiceFilter, setSecondChoiceFilter] = useState<string[]>([]);
  // =================================================================
  // A THIRD COLUMN, AND THE ONLY ONE THAT IS A DECISION.
  // -----------------------------------------------------------------
  // The two choice columns record what the applicant asked for. Neither
  // answers the question a reviewer works from: which division is
  // assessing this person. Until now the answer was implied - the first
  // choice, until an interview invitation quietly overwrote it - and
  // could not be seen, filtered or set.
  //
  // It is a decision, so it sits to the LEFT of the preferences it is
  // taken from: the column a reviewer acts on comes before the two it
  // consults, and it defaults to the first choice so that the ordinary
  // case reads exactly as it did before.
  // =================================================================
  const [evaluationFilter, setEvaluationFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  // Which bulk download is running ('cv' | 'answer' | 'both'), and how far.
  const [bulkBusy, setBulkBusy] = useState<false | 'cv' | 'answer' | 'both'>(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Opening a candidate is the workspace's most repeated interaction, so it
  // has its own hook: one round trip to readable, the two documents signed in
  // parallel behind it, and every candidate opened in this session remembered.
  const {
    openId, detail, cvUrl, answerUrl, loading: detailLoading, docsLoading,
    open: openCandidate, close: closeCandidate, refresh: refreshCandidate, patch: patchCandidate,
  } = useCandidateDetail(session);

  // Changing the division a candidate is evaluated for: the one sanctioned
  // way a candidacy revisits an earlier stage. `pendingEval` holds the row
  // and the target while the confirmation is open, so the change can be
  // started from the table as well as from the open candidate.
  const [pendingEval, setPendingEval] = useState<{ app: ApplicationRow; target: OrgDivision } | null>(null);
  const [movingEval, setMovingEval] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setApps(await listApplications(session)); }
    catch (e) { toast({ title: 'Failed to load candidates', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // Semesters that actually contain applications (always offering the current one).
  const semesterOptions = useMemo(() => {
    const list = semestersInData(apps.map((a) => a.created_at));
    if (!list.some((s) => s.key === currentSemester().key)) list.unshift(currentSemester());
    return list;
  }, [apps]);


  // Every filter on this register, and the way back out of all of them.
  const activeFilterCount = (evaluationFilter.length > 0 ? 1 : 0) + (firstChoiceFilter.length > 0 ? 1 : 0) + (secondChoiceFilter.length > 0 ? 1 : 0) + (statusFilter.length > 0 ? 1 : 0) + (yearFilter.length > 0 ? 1 : 0) + (search.trim() ? 1 : 0);
  const clearAllFilters = () => {
    setEvaluationFilter([]);
    setFirstChoiceFilter([]);
    setSecondChoiceFilter([]);
    setStatusFilter([]);
    setYearFilter([]);
    setSearch('');
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps
      .filter((a) => semesterOf(a.created_at).key === semKey)
      .filter((a) => evaluationFilter.length === 0 || evaluationFilter.includes(evaluationDivision(a)))
      .filter((a) => firstChoiceFilter.length === 0 || firstChoiceFilter.includes(a.first_choice))
      // NO_SECOND_CHOICE is a real value to filter on, not an absence: the
      // Media and Operations applicants name one division and stop, and
      // "who applied to one division only" is a question worth asking.
      .filter((a) => secondChoiceFilter.length === 0 || secondChoiceFilter.includes(a.second_choice ?? NO_SECOND_CHOICE))
      .filter((a) => statusFilter.length === 0 || statusFilter.includes(a.status))
      .filter((a) => yearFilter.length === 0 || yearFilter.includes(a.academic_year))
      .filter((a) => !q || `${a.first_name} ${a.surname} ${a.email} ${a.bocconi_id}`.toLowerCase().includes(q));
  }, [apps, search, evaluationFilter, firstChoiceFilter, secondChoiceFilter, statusFilter, yearFilter, semKey]);

  // THE FILTERS OFFER WHAT THE FORM OFFERS. The choice filters were built
  // from the five research divisions alone, so the Media and Operations
  // applicants - who have been able to apply for some time - could not be
  // filtered for at all: their rows were in the table and no option in the
  // menu selected them. Both choice filters now come from the form's own
  // list, under the name the applicant saw.
  const divOptions = APPLY_DIVISIONS.map((d) => ({ value: d, label: applyDivisionLabel(d) }));
  const secondChoiceOptions = [...divOptions, { value: NO_SECOND_CHOICE, label: 'No second choice' }];
  // The evaluation column is wider still: Operations stands on its own
  // here, because a candidate can be assessed for it even though the form
  // recruits Media and Operations as one intake.
  const evaluationOptions = EVALUATION_DIVISIONS.map((d) => ({ value: d, label: divisionLabels[d] }));
  const yearOptions = (Object.keys(ACADEMIC_YEAR_LABELS) as (keyof typeof ACADEMIC_YEAR_LABELS)[]).map((y) => ({ value: y, label: ACADEMIC_YEAR_LABELS[y] }));
  const statusOptions = STATUS_FLOW.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

  // THE LIST IS NO LONGER REFETCHED WHEN A CANDIDATE IS OPENED. Opening a CV
  // advances the status to "CV opened" server-side, and that new status comes
  // back inside the same response, so the one row that changed is patched in
  // place. Reloading every application in the semester to learn one field is
  // what made the table flash its loader every time a candidate was opened.
  const openDetail = (id: string) => {
    openCandidate(id, (fresh) => {
      setApps((prev) => prev.map((a) => (a.id === fresh.id
        ? { ...a, status: fresh.status, cv_viewed_at: fresh.cv_viewed_at, note_count: a.note_count }
        : a)));
    });
  };

  // =================================================================
  // ONE CANDIDATE TO THE NEXT, WITHOUT GOING BACK TO THE LIST.
  // -----------------------------------------------------------------
  // Screening a semester means reading thirty or forty applications in a
  // row, and until now each one cost a close, a scroll back to where you
  // were, and a press of Open on the row below. The two arrows in the
  // window's header walk the table in the order it is showing: the
  // FILTERED, sorted order, so narrowing to one division or one status
  // narrows what the arrows step through as well. That is the whole
  // change. Nothing else about this window moves, and every control in
  // it goes on behaving exactly as it did.
  //
  // A candidate the current filters no longer match (opening a CV can
  // advance a status while a status filter is on) simply has no
  // neighbours: both arrows go quiet rather than jumping somewhere
  // unrelated.
  // =================================================================
  const openIndex = useMemo(() => (openId ? rows.findIndex((r) => r.id === openId) : -1), [rows, openId]);
  const prevCandidate = openIndex > 0 ? rows[openIndex - 1] : null;
  const nextCandidate = openIndex >= 0 && openIndex < rows.length - 1 ? rows[openIndex + 1] : null;

  // The window is its own scroll box. Arriving at a new candidate two
  // screens down the previous one's notes would be arriving in the middle
  // of them, so it starts at the top, as opening from the table does.
  const detailPaneRef = useRef<HTMLDivElement>(null);
  useEffect(() => { detailPaneRef.current?.scrollTo({ top: 0 }); }, [openId]);

  // Documents open in a tab that says whose they are, through the same wrapper
  // the site already uses for reports.
  const openDoc = async (a: { id: string; first_name: string; surname: string }, kind: 'cv' | 'answer') => {
    try {
      const url = await signDocumentUrl(session, a.id, kind, 'preview');
      openReportInTab(documentTitle(a, kind), url);
    } catch (e) { toast({ title: 'Could not open', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  // The one thing the page still owns about a status change: keeping its
  // own row and its own cached candidate in step with what was written.
  // Everything else - the confirmation, the email warning, the check that
  // an invitation has a bookable slot - lives in CandidateStatusControl.
  const onStatusChanged = ({ id, status, division }: { id: string; status: ApplicationStatus; division?: OrgDivision | null }) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status, interview_division: division ?? a.interview_division } : a)));
    patchCandidate(id, { status, ...(division ? { interview_division: division } : {}) });
  };

  // Moving a candidacy to a different division. The confirmation is not
  // decoration: it returns the candidate to an earlier stage, releases the
  // interview slot they were holding and, once done, fixes the pair of
  // divisions this candidacy can ever involve.
  const doSetEvaluation = async () => {
    if (!pendingEval) return;
    const { app, target } = pendingEval;
    setMovingEval(true);
    try {
      await setEvaluationDivision(session, app.id, target);
      toast({
        title: `Now evaluated for ${divisionLabels[target]}`,
        description: `${app.first_name} returns to “${STATUS_LABELS.to_be_contacted}” and can be invited to interview by ${divisionLabels[target]}.`,
      });
      setPendingEval(null);
      // The server decides the resulting status and the remembered pair, so
      // the row is re-read rather than guessed at locally.
      const fresh = await refreshCandidate(app.id);
      setApps((prev) => prev.map((a) => (a.id === fresh.application.id ? { ...a, ...fresh.application } : a)));
    } catch (e) {
      toast({ title: 'Could not change the division', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setMovingEval(false); }
  };

  // The note is written, then the ONE candidate is re-read and its row's note
  // count adjusted. The list is left alone.
  const addNote = async (body: string) => {
    if (!openId) return;
    await addApplicationNote(session, openId, body);
  };

  const afterNote = async () => {
    if (!openId) return;
    const fresh = await refreshCandidate(openId);
    setApps((prev) => prev.map((a) => (a.id === openId ? { ...a, note_count: fresh.notes.length } : a)));
  };

  const bulkDownload = async (kind: 'cv' | 'answer' | 'both') => {
    setBulkBusy(kind);
    setBulkProgress(null);
    try {
      const files = await bulkDocumentUrls(session, rows.map((r) => r.id), kind);
      if (!files.length) { toast({ title: 'Nothing to download' }); return; }
      const { blob, failed } = await zipFromUrls(
        zipEntriesFor(files, kind),
        (done, total) => setBulkProgress({ done, total }),
      );
      const label = kind === 'cv' ? 'CVs' : kind === 'answer' ? 'written answers' : 'applications';
      const saved = downloadBlob(blob, `Minerva ${label} ${semKey}.zip`);
      if (failed.length) {
        toast({
          title: `${failed.length} file${failed.length !== 1 ? 's' : ''} could not be added`,
          description: `The archive holds the rest. Missing: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`,
          variant: 'destructive',
        });
      } else if (saved) {
        toast({ title: `${files.length} file${files.length !== 1 ? 's' : ''} saved as one archive` });
      }
    } catch (e) { toast({ title: 'Bulk download failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBulkBusy(false); setBulkProgress(null); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Candidates Screening"
        description="This semester's applications, with their documents, notes and status."
        // THE THREE DOWNLOADS ARE ONE CONTROL IN THREE VARIANTS. Stacked
        // in a column they read as three separate errands down the right
        // of the page; on one line they read as what they are, a choice
        // between CVs, answers and both.
        actionColumns="row"
        actions={
          <>
            <BulkDownloadButton
              label="Download CVs" kind="cv"
              busy={bulkBusy} progress={bulkProgress}
              disabled={rows.length === 0} onRun={bulkDownload}
            />
            <BulkDownloadButton
              label="Download answers" kind="answer"
              busy={bulkBusy} progress={bulkProgress}
              disabled={rows.length === 0} onRun={bulkDownload}
            />
            {/* Both together, foldered by applicant. It is the button a
                reviewer starting a screening round actually wants, and it
                is the only one for which the folders make sense. */}
            <BulkDownloadButton
              label="Download both" kind="both"
              busy={bulkBusy} progress={bulkProgress}
              disabled={rows.length === 0} onRun={bulkDownload}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by name, email or Bocconi ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ClearFilters count={activeFilterCount} onClear={clearAllFilters} size="sm" className="mt-3" />
        {/* Semester scope: the working area renews itself every semester. */}
        <div className="flex items-center gap-2">
        <Select value={semKey} onValueChange={setSemKey}>
          <SelectTrigger className="w-[220px] font-body"><SelectValue /></SelectTrigger>
          <SelectContent>
            {semesterOptions.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}{s.key === currentSemester().key ? ' (current)' : ' (archive)'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <HelpDot page="applications-screening" topic="semester" />
        </div>
      </div>

      {viewingArchived && (
        <div className="mb-4 rounded-lg border border-separator bg-muted/30 px-4 py-2.5 font-body text-sm text-muted-foreground">
          You are viewing an <span className="text-foreground">archived semester</span>. These candidacies are preserved for consultation and accountability; statuses and notes can no longer be changed.
        </div>
      )}

      {!viewingArchived && (
        <div className="mb-4 space-y-2">
          <Recommendation title="Think about long-term continuity when selecting">
            <p>
              Past experience shows that the association benefits when each intake also secures its own future.
              Where candidates are otherwise comparable, it is advisable to keep continuity in mind: as a reference
              point, aiming for roughly one Italian first- or second-year undergraduate student among every five new
              members has historically helped, because Italian undergraduates are statistically more likely to stay
              at Bocconi for their Master's degree and to carry the association forward across semesters.
            </p>
            <p>
              Treat this purely as a continuity consideration, never as a quota, an exclusion criterion or a reason
              to prefer a weaker application: merit always comes first, and every candidate is assessed on merit
              individually.
            </p>
          </Recommendation>
          <Recommendation title="Weigh commitments in other professional societies">
            <p>
              Candidates who are already active in several professional associations, or in another finance or
              consulting society, have in the past tended to have less time for Minerva and to contribute less to
              association activities. Direct-competitor societies also raise a concrete risk around our proprietary
              assets: the alumni network, templates and code repositories are association property, and divided
              loyalties can lead to their misuse or to membership being used only to extract benefits.
            </p>
            <p>
              It is therefore advisable to explore these commitments during selection and to prefer candidates who
              can give Minerva serious attention, either because Minerva is their main society or because they are
              clearly ready to prioritise it, including by stepping back from other demanding societies once they
              accept the offer. Purely recreational clubs (travel, comics and similar leisure associations) are not
              a concern in the same way.
            </p>
          </Recommendation>
        </div>
      )}

      {loading ? <WorkspaceLoader /> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No applications match the current filters.</p></CardContent></Card>
      ) : (
        <div className="max-w-full border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Name</th>
                {/* LinkedIn, as a column of its own and as narrow as one
                    icon. It sits beside the name because it is part of
                    identifying the person rather than part of assessing
                    them, and because that is where the member register
                    puts the same column. `w-px` in a full-width table is
                    how a column is told to take only what it needs.
                    "In" is the header the register already uses. */}
                <th className="px-2 py-2 font-normal text-center w-px">In</th>
                <th className="px-3 py-2 font-normal">
                  <span className="inline-flex items-center gap-1.5">
                    <ColumnFilter label="Evaluated for" options={evaluationOptions} selected={evaluationFilter} onChange={setEvaluationFilter} />
                    <HelpDot page="applications-screening" topic="evaluation-division" />
                  </span>
                </th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="First choice" options={divOptions} selected={firstChoiceFilter} onChange={setFirstChoiceFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Second choice" options={secondChoiceOptions} selected={secondChoiceFilter} onChange={setSecondChoiceFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Year" options={yearOptions} selected={yearFilter} onChange={setYearFilter} /></th>
                <th className="px-3 py-2 font-normal">Programme</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} /></th>
                <th className="px-3 py-2 font-normal text-center">CV</th>
                <th className="px-3 py-2 font-normal text-center">Work</th>
                <th className="px-3 py-2 font-normal text-center"><MessageSquare className="h-3.5 w-3.5 inline" /></th>
                <th className="px-3 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-separator">
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {a.first_name} {a.surname}
                    {!a.cv_viewed_at && <span className="ml-2 align-middle inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">new</span>}
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </td>
                  {/* The profile, openable from the list. A reviewer
                      checking who somebody is should not have to open the
                      candidate first, and this is the one fact about them
                      that lives somewhere else.

                      `safeLinkedInUrl` is not decoration: `linkedin_url`
                      is a free text field on the PUBLIC application form
                      and is stored exactly as it was typed, so the value
                      here is a stranger's string. See lib/linkedin.ts.
                      Anything it cannot make an http(s) address of reads
                      as no profile at all. */}
                  <td className="px-2 py-2 text-center w-px">
                    {(() => {
                      const profile = safeLinkedInUrl(a.linkedin_url);
                      return profile ? (
                        <a
                          href={profile}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Open ${a.first_name} ${a.surname}'s LinkedIn profile`}
                          aria-label={`Open ${a.first_name} ${a.surname}'s LinkedIn profile`}
                          className="inline-flex align-middle hover:opacity-100"
                        >
                          <img
                            src={linkedinIcon}
                            alt=""
                            width={18}
                            height={18}
                            className="h-[1.15rem] w-[1.15rem] shrink-0 object-contain opacity-80"
                          />
                        </a>
                      ) : (
                        <span className="text-muted-foreground" aria-label="No LinkedIn profile">-</span>
                      );
                    })()}
                  </td>
                  {/* Evaluated for. A control where the role can move a
                      candidacy, plain text where it cannot, so a reviewer
                      without that power reads the same fact without being
                      offered a menu that would refuse them. */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {canChangeStatus && !isLockedStatus(a.status) ? (
                      <Select
                        value={evaluationDivision(a)}
                        onValueChange={(v) => { if (v !== evaluationDivision(a)) setPendingEval({ app: a, target: v as OrgDivision }); }}
                      >
                        {/* The trigger prints the division and nothing else.
                            The "(first choice)" hint belongs in the open
                            list, where it helps choose; in the closed
                            trigger it only pushed the division name out of
                            its own cell and left it clipped mid-word. */}
                        <SelectTrigger className="h-8 w-[13.5rem] font-body text-sm">
                          <SelectValue>{divisionLabels[evaluationDivision(a)]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {allowedEvaluationDivisions(a).map((d) => (
                            <SelectItem key={d} value={d}>
                              {divisionLabels[d]}
                              {d === a.first_choice ? ' (first choice)' : d === a.second_choice ? ' (second choice)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-foreground">{divisionLabels[evaluationDivision(a)]}</span>
                    )}
                    {isReEvaluated(a) && (
                      <div className="mt-0.5 text-[11px] text-amber-700">Re-evaluated, not a stated preference</div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{applyDivisionLabel(a.first_choice)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {a.second_choice ? applyDivisionLabel(a.second_choice) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{ACADEMIC_YEAR_LABELS[a.academic_year]}</td>
                  <td className="px-3 py-2 whitespace-nowrap max-w-[14rem] truncate" title={a.degree_course}>{a.degree_course}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 text-xs border ${statusBadgeClass(a.status)}`}>{STATUS_LABELS[a.status]}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" title="Preview CV" onClick={() => openDoc(a, 'cv')} className="text-muted-foreground hover:text-accent transition-colors">
                      <Eye className="h-4 w-4 inline" />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" title="Preview submitted work" onClick={() => openDoc(a, 'answer')} className="text-muted-foreground hover:text-accent transition-colors">
                      <Eye className="h-4 w-4 inline" />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">{a.note_count || ''}</td>
                  {/* `data-ro`: OPENING A CANDIDATE IS A READ. Without it the
                      read-only guard takes this button, since a plain word on
                      a button is all the guard has to go on, and a reviewer is
                      left with a table they cannot look inside. That silently
                      cost the two roles the recruiting backend exists to serve
                      - team leaders and portfolio managers, whose grant on this
                      page is 'view' - the whole of their reviewing work, on a
                      desktop, today. It is the same button everyone uses on a
                      phone now that the page opens there. */}
                  <td className="px-3 py-2 text-right"><Button data-ro variant="outline" size="sm" onClick={() => openDetail(a.id)}>Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="font-body text-xs text-muted-foreground mt-3">Showing {rows.length} of {apps.length} application{apps.length !== 1 ? 's' : ''}.</p>

      {/* Candidate detail.
          THE PROFILE IS SHARED WITH OFFERS. Everything that describes the
          candidate - identity, application, documents, notes - is one
          component now; what stays here is only what MOVES a candidacy: the
          status control and the division transfer. */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) closeCandidate(); }}>
        <DialogContent ref={detailPaneRef} className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            {/* The name, and the way to the candidate on either side of it.
                `pr-10` keeps the arrows clear of the window's own close
                button, which sits in the top right corner. */}
            <div className="flex items-center gap-3 pr-10">
              <DialogTitle className="font-serif text-2xl min-w-0 truncate">
                {detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}
              </DialogTitle>
              {rows.length > 1 && (
                <div className="ml-auto shrink-0 flex items-center gap-1">
                  <Button
                    type="button" variant="outline" size="icon" className="h-8 w-8"
                    disabled={!prevCandidate}
                    onClick={() => prevCandidate && openDetail(prevCandidate.id)}
                    title={prevCandidate ? `Previous candidate: ${prevCandidate.first_name} ${prevCandidate.surname}` : 'This is the first candidate'}
                    aria-label="Previous candidate"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-body text-xs text-muted-foreground tabular-nums px-1 whitespace-nowrap">
                    {openIndex >= 0 ? `${openIndex + 1} of ${rows.length}` : `${rows.length} shown`}
                  </span>
                  <Button
                    type="button" variant="outline" size="icon" className="h-8 w-8"
                    disabled={!nextCandidate}
                    onClick={() => nextCandidate && openDetail(nextCandidate.id)}
                    title={nextCandidate ? `Next candidate: ${nextCandidate.first_name} ${nextCandidate.surname}` : 'This is the last candidate'}
                    aria-label="Next candidate"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader inline /> : (
            <CandidateProfile
              session={session}
              detail={detail}
              cvUrl={cvUrl}
              answerUrl={answerUrl}
              docsLoading={docsLoading}
              canAddNotes={canAddNotes}
              notesAllowedInReadOnly={notesAllowedInReadOnly}

              addNote={addNote}
              onNoteAdded={afterNote}
              onError={(m) => toast({ title: 'Something went wrong', description: m, variant: 'destructive' })}
            >
              {/* Moving the candidacy. One component, shared with the
                  Interview Calendar, which can now open the candidate who
                  booked a slot and record the outcome there. */}
              <CandidateStatusControl
                session={session}
                app={detail.application}
                canChangeStatus={canChangeStatus}
                canProgress={canProgress(detail.application)}
                onChanged={onStatusChanged}
              />

              {/* Evaluated for: the same control as the table's column, in
                  the place a reviewer is most likely to reach for it, having
                  just read the CV. Offered for EVERY candidate a manager of
                  this page can see, including the ones another division is
                  assessing, which is the case reassignment exists for. */}
              {canChangeStatus && !isLockedStatus(detail.application.status) && (
                <div className="border border-separator p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                    Evaluated for <HelpDot page="applications-screening" topic="evaluation-division" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Which division is assessing this candidate. It starts as their first choice. If they
                    fit another division better, including one they did not name, change it here: they
                    return to <strong>{STATUS_LABELS.to_be_contacted}</strong> so the new division can invite them,
                    and any interview slot they were holding is released.
                  </p>
                  <Select
                    value={evaluationDivision(detail.application)}
                    onValueChange={(v) => {
                      const app = apps.find((x) => x.id === detail.application.id) ?? (detail.application as ApplicationRow);
                      if (v !== evaluationDivision(detail.application)) setPendingEval({ app, target: v as OrgDivision });
                    }}
                  >
                    <SelectTrigger className="font-body">
                      <SelectValue>{divisionLabels[evaluationDivision(detail.application)]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allowedEvaluationDivisions(detail.application).map((d) => (
                        <SelectItem key={d} value={d}>
                          {divisionLabels[d]}
                          {d === detail.application.first_choice ? ' (first choice)'
                            : d === detail.application.second_choice ? ' (second choice)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detail.application.evaluation_division_previous && (
                    <p className="text-xs text-amber-700">
                      This candidacy has already been moved once, so it is now fixed to these two divisions.
                      A candidate is never opened in a third.
                    </p>
                  )}
                </div>
              )}
            </CandidateProfile>
          )}
        </DialogContent>
      </Dialog>

      {/* Changing the evaluation division. Every consequence is named,
          because between them they undo work: a stage already reached, an
          interview slot already booked, and the freedom to move again. */}
      <AlertDialog open={!!pendingEval} onOpenChange={(o) => { if (!o && !movingEval) setPendingEval(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Evaluate {pendingEval ? pendingEval.app.first_name : 'this candidate'} for{' '}
              {pendingEval ? divisionLabels[pendingEval.target] : 'another division'}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              {pendingEval ? (
                <div className="space-y-2">
                  <p>
                    {pendingEval.app.first_name} {pendingEval.app.surname} moves from{' '}
                    <strong>{divisionLabels[evaluationDivision(pendingEval.app)]}</strong> to{' '}
                    <strong>{divisionLabels[pendingEval.target]}</strong>. From now on every communication they
                    receive names {divisionLabels[pendingEval.target]}.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Their status returns to <strong>{STATUS_LABELS.to_be_contacted}</strong>, because the new
                      division has not yet invited or interviewed them.
                    </li>
                    <li>
                      Any interview slot they were holding is released back to the division they are leaving,
                      and they can only book with {divisionLabels[pendingEval.target]}.
                    </li>
                    {!pendingEval.app.evaluation_division_previous && (
                      <li>
                        Afterwards this candidacy is fixed to{' '}
                        <strong>{divisionLabels[evaluationDivision(pendingEval.app)]}</strong> and{' '}
                        <strong>{divisionLabels[pendingEval.target]}</strong>: those two divisions and no third.
                        You can move them back at any time.
                      </li>
                    )}
                    {pendingEval.app.status === 'rejected' && (
                      <li className="text-amber-700">
                        This candidate has already been rejected and told so. Moving them reopens their
                        candidacy, and they will hear from {divisionLabels[pendingEval.target]} next.
                      </li>
                    )}
                  </ul>
                  <p>
                    No email is sent by this change on its own. The invitation you send next is what reaches
                    them, and it will name {divisionLabels[pendingEval.target]}. The move is recorded in the
                    activity log.
                  </p>
                </div>
              ) : <span />}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={movingEval}>No, cancel</AlertDialogCancel>
            <AlertDialogAction disabled={movingEval} onClick={(e) => { e.preventDefault(); doSetEvaluation(); }}>
              {movingEval ? 'Moving…' : 'Yes, change the division'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

