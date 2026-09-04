import { useEffect, useMemo, useState } from 'react';
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
import { Download, FileText, Search, MessageSquare, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { ClearFilters } from '@/components/shared/ClearFilters';
import {
  listApplications, signDocumentUrl, bulkDocumentUrls,
  updateApplicationStatus, addApplicationNote, setEvaluationDivision,
  ACADEMIC_YEAR_LABELS, STATUS_FLOW, STATUS_LABELS, statusBadgeClass,
  isLockedStatus, allowedNextStatuses,
  APPLY_DIVISIONS, EVALUATION_DIVISIONS, applyDivisionLabel,
  evaluationDivision, allowedEvaluationDivisions, isReEvaluated,
  type ApplicationRow, type ApplicationStatus,
} from '@/lib/applications-api';
import { openReportInTab } from '@/lib/open-report';
import { useCandidateDetail } from '@/components/admin/recruiting/useCandidateDetail';
import { CandidateProfile } from '@/components/admin/recruiting/CandidateProfile';
import { documentTitle } from '@/components/admin/recruiting/document-title';
import { listSlots } from '@/lib/interviews-api';

/** Sentinel used by the second-choice filter for applicants who named none. */
const NO_SECOND_CHOICE = '__none__';

// Statuses whose selection sends an automatic email to the candidate — these
// require an explicit confirmation before they are applied (report item 12).
const EMAIL_ON_STATUS: Record<string, string> = {
  interview_invitation_sent: 'The candidate will be invited to interview, will gain access to the Interview Calendar, and will receive an interview-invitation email.',
  rejected: 'The candidate will be moved to “Rejected” and will receive a rejection email (before- or after-interview, chosen automatically).',
  offer_accepted: 'The candidate will receive a welcome email and be prompted to complete their member profile.',
};

function triggerDownloads(files: { name: string; url: string }[]) {
  files.forEach((f, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = f.url; a.download = f.name; a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
    }, i * 400);
  });
}

export default function CandidatesManagement() {
  const { session } = useAuth();
  const { canManage, hasSpecial, primaryRole } = useAccess();
  // Team leaders and portfolio managers may review candidates and add notes,
  // but only roles with full access may change a candidate's status.
  const { toast } = useToast();

  const [apps, setApps] = useState<ApplicationRow[]>([]);
  // Semester scope: the active workflow only shows THIS semester's
  // applications; older semesters stay archived and read-only.
  const [semKey, setSemKey] = useState(currentSemester().key);
  const viewingArchived = semKey !== currentSemester().key;
  const canChangeStatus = canManage('applications-screening') && !viewingArchived;
  const canAddNotes = (canManage('applications-screening') || hasSpecial('applications-screening', 'candidates_notes_only')) && !viewingArchived;
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
  const [bulkBusy, setBulkBusy] = useState(false);

  // Opening a candidate is the workspace's most repeated interaction, so it
  // has its own hook: one round trip to readable, the two documents signed in
  // parallel behind it, and every candidate opened in this session remembered.
  const {
    openId, detail, cvUrl, answerUrl, loading: detailLoading, docsLoading,
    open: openCandidate, close: closeCandidate, refresh: refreshCandidate, patch: patchCandidate,
  } = useCandidateDetail(session);
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: ApplicationStatus } | null>(null);
  const [inviteDivision, setInviteDivision] = useState<OrgDivision | null>(null);

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

  // Documents open in a tab that says whose they are, through the same wrapper
  // the site already uses for reports.
  const openDoc = async (a: { id: string; first_name: string; surname: string }, kind: 'cv' | 'answer') => {
    try {
      const url = await signDocumentUrl(session, a.id, kind, 'preview');
      openReportInTab(documentTitle(a, kind), url);
    } catch (e) { toast({ title: 'Could not open', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const changeStatus = async (id: string, status: ApplicationStatus, division?: OrgDivision | null) => {
    try {
      await updateApplicationStatus(session, id, status, division);
      const who = apps.find((x) => x.id === id);
      logActivity(session, primaryRole, { action: 'status_change', section: 'Recruiting', subsection: 'Candidates screening', entityType: 'application', entityId: id, entityName: who ? `${who.first_name} ${who.surname}` : id, details: { status } });
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status, interview_division: division ?? a.interview_division } : a)));
      patchCandidate(id, { status, ...(division ? { interview_division: division } : {}) });
      toast({ title: 'Status updated' });
    } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  // Status changes that send an email need explicit confirmation first.
  const requestStatusChange = (id: string, status: ApplicationStatus) => {
    if (EMAIL_ON_STATUS[status]) {
      // The invitation goes out for the division that is evaluating the
      // candidate. It used to default to the first choice and offer a
      // second control to change it, which meant two places could set the
      // same fact and disagree; the column above is now the one place.
      if (status === 'interview_invitation_sent' && detail) setInviteDivision(evaluationDivision(detail.application));
      setPendingStatus({ id, status });
    } else changeStatus(id, status);
  };

  // Confirm the pending status change. For "Invited to interview" this enforces
  // that the chosen division has at least one OPEN interview slot before the
  // invitation (and its email) can be sent.
  const [confirming, setConfirming] = useState(false);
  const confirmPendingStatus = async () => {
    if (!pendingStatus) return;
    if (pendingStatus.status === 'interview_invitation_sent') {
      const division = (inviteDivision ?? (detail ? evaluationDivision(detail.application) : undefined)) as OrgDivision | undefined;
      if (!division) { toast({ title: 'Choose an interview division first', variant: 'destructive' }); return; }
      setConfirming(true);
      try {
        const res = await listSlots(session, division);
        const open = res.slots.filter((s) => s.is_active && !s.is_booked).length;
        if (open === 0) {
          toast({
            title: 'No open interview slots',
            description: `Open at least one slot for ${divisionLabels[division]} in Applications → Interview Calendar before inviting this candidate.`,
            variant: 'destructive',
          });
          return;
        }
      } catch (e) {
        toast({ title: 'Could not verify interview slots', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
        return;
      } finally { setConfirming(false); }
      changeStatus(pendingStatus.id, pendingStatus.status, division);
    } else {
      changeStatus(pendingStatus.id, pendingStatus.status);
    }
    setPendingStatus(null);
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
      logActivity(session, primaryRole, {
        action: 'status_change', section: 'Recruiting', subsection: 'Candidates screening',
        entityType: 'application', entityId: app.id, entityName: `${app.first_name} ${app.surname}`,
        details: { evaluation_division_from: evaluationDivision(app), evaluation_division_to: target },
      });
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
    logActivity(session, primaryRole, { action: 'create', section: 'Recruiting', subsection: 'Candidates screening', entityType: 'application_note', entityId: openId, entityName: detail ? `${detail.application.first_name} ${detail.application.surname}` : openId });
  };

  const afterNote = async () => {
    if (!openId) return;
    const fresh = await refreshCandidate(openId);
    setApps((prev) => prev.map((a) => (a.id === openId ? { ...a, note_count: fresh.notes.length } : a)));
  };

  const bulkDownload = async (kind: 'cv' | 'answer') => {
    setBulkBusy(true);
    try {
      const files = await bulkDocumentUrls(session, rows.map((r) => r.id), kind);
      if (!files.length) { toast({ title: 'Nothing to download' }); return; }
      triggerDownloads(files);
      toast({ title: `Downloading ${files.length} file${files.length !== 1 ? 's' : ''}` });
    } catch (e) { toast({ title: 'Bulk download failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBulkBusy(false); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Candidates Screening"
        description="Review applications: open profiles, preview and download CVs and written answers, track status and share notes. Downloads follow the active filters."
        actions={
          <>
            <Button variant="outline" className="font-body" disabled={rows.length === 0 || bulkBusy} onClick={() => bulkDownload('cv')}>
              {bulkBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Download CVs
            </Button>
            <Button variant="outline" className="font-body" disabled={rows.length === 0 || bulkBusy} onClick={() => bulkDownload('answer')}>
              <Download className="h-4 w-4 mr-2" />Download answers
            </Button>
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
                  <td className="px-3 py-2 text-right"><Button variant="outline" size="sm" onClick={() => openDetail(a.id)}>Open</Button></td>
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
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}
            </DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader inline /> : (
            <CandidateProfile
              session={session}
              detail={detail}
              cvUrl={cvUrl}
              answerUrl={answerUrl}
              docsLoading={docsLoading}
              canAddNotes={canAddNotes}
              addNote={addNote}
              onNoteAdded={afterNote}
              onError={(m) => toast({ title: 'Something went wrong', description: m, variant: 'destructive' })}
            >
              {/* Prominent status control */}
              <div className="border border-accent/30 bg-accent/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-accent font-semibold inline-flex items-center gap-1.5">Candidate status <HelpDot page="applications-screening" topic="status" /></div>
                  <span className={`inline-block px-2 py-0.5 text-xs border ${statusBadgeClass(detail.application.status)}`}>{STATUS_LABELS[detail.application.status]}</span>
                </div>
                {!canChangeStatus ? (
                  <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
                    You can review this candidate and add notes below, but changing the status is reserved for the President, Vice President and the Heads. Your notes are visible to them.
                  </p>
                ) : isLockedStatus(detail.application.status) ? (
                  <p className="text-xs text-muted-foreground border border-separator bg-muted/40 p-2">
                    This is an offer outcome, managed automatically by the offer process (New Joiners) and the applicant’s response. It cannot be changed here.
                  </p>
                ) : (
                  <>
                    <Select
                      key={detail.application.status}
                      value={undefined}
                      onValueChange={(v) => requestStatusChange(detail.application.id, v as ApplicationStatus)}
                    >
                      <SelectTrigger className="font-body"><SelectValue placeholder="Advance to…" /></SelectTrigger>
                      <SelectContent>
                        {allowedNextStatuses(detail.application.status).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}{o.effect === 'action' ? '  ·  sends an email / action' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      A candidacy only moves <strong>forward</strong>: once a stage is reached it cannot be taken back, so only later stages are offered here. Statuses marked <strong>“sends an email / action”</strong> notify the applicant or unlock a step (e.g. “Invited to interview” emails them and opens booking). Offer outcomes are handled in <strong>New Joiners</strong> and can’t be set here.
                    </p>
                  </>
                )}
                {detail.application.status === 'accepted' && (
                  <p className="text-xs text-amber-700 border-t border-amber-200 pt-2">
                    “Accepted” is <strong>not</strong> yet visible to the candidate. They still see their outcome as pending until the president sends the final offers to <strong>New Joiners</strong>. Only then are they told they passed the selection.
                  </p>
                )}
              </div>

              {/* Evaluated for: the same control as the table's column, in
                  the place a reviewer is most likely to reach for it, having
                  just read the CV. */}
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

      {/* Confirmation before an email-triggering status change (report item 12). */}
      <AlertDialog open={!!pendingStatus} onOpenChange={(o) => { if (!o) setPendingStatus(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this update to the candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              By changing this status to “{pendingStatus ? STATUS_LABELS[pendingStatus.status] : ''}”, the candidate moves to the next step and <strong>receives an automatic email</strong>.
              {pendingStatus && EMAIL_ON_STATUS[pendingStatus.status] ? ` ${EMAIL_ON_STATUS[pendingStatus.status]}` : ''}
              {' '}Please check the details are correct; this cannot be undone. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingStatus?.status === 'interview_invitation_sent' && detail && (
            <div className="font-body">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Interview division</div>
              <div className="border border-separator bg-muted/30 px-3 py-2 text-sm text-foreground">
                {divisionLabels[evaluationDivision(detail.application)]}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The division this candidate is being evaluated for, and the only one they will be able to book
                an interview with. To invite them for a different division, change <strong>Evaluated for</strong> first.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>No, cancel</AlertDialogCancel>
            <AlertDialogAction disabled={confirming} onClick={(e) => { e.preventDefault(); confirmPendingStatus(); }}>
              {confirming ? 'Checking…' : 'Yes, proceed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

