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
import { Download, FileText, Search, MessageSquare, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import {
  listApplications, getApplication, signDocumentUrl, bulkDocumentUrls,
  updateApplicationStatus, addApplicationNote,
  ACADEMIC_YEAR_LABELS, STATUS_FLOW, STATUS_LABELS, statusBadgeClass,
  MANUAL_STATUSES, isLockedStatus,
  type ApplicationRow, type ApplicationNote, type ApplicationStatus,
} from '@/lib/applications-api';
import { listSlots } from '@/lib/interviews-api';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

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
  const { canManage, hasSpecial } = useAccess();
  // Team leaders and portfolio managers may review candidates and add notes,
  // but only roles with full access may change a candidate's status.
  const canChangeStatus = canManage('applications-screening');
  const canAddNotes = canChangeStatus || hasSpecial('applications-screening', 'candidates_notes_only');
  const { toast } = useToast();

  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divFilter, setDivFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ application: ApplicationRow; notes: ApplicationNote[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [answerPreviewUrl, setAnswerPreviewUrl] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: ApplicationStatus } | null>(null);
  const [inviteDivision, setInviteDivision] = useState<OrgDivision | null>(null);

  const load = async () => {
    setLoading(true);
    try { setApps(await listApplications(session)); }
    catch (e) { toast({ title: 'Failed to load candidates', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps
      .filter((a) => divFilter.length === 0 || divFilter.includes(a.first_choice) || (a.second_choice ? divFilter.includes(a.second_choice) : false))
      .filter((a) => statusFilter.length === 0 || statusFilter.includes(a.status))
      .filter((a) => yearFilter.length === 0 || yearFilter.includes(a.academic_year))
      .filter((a) => !q || `${a.first_name} ${a.surname} ${a.email} ${a.bocconi_id}`.toLowerCase().includes(q));
  }, [apps, search, divFilter, statusFilter, yearFilter]);

  const divOptions = CORE.map((d) => ({ value: d, label: divisionLabels[d] }));
  const yearOptions = (Object.keys(ACADEMIC_YEAR_LABELS) as (keyof typeof ACADEMIC_YEAR_LABELS)[]).map((y) => ({ value: y, label: ACADEMIC_YEAR_LABELS[y] }));
  const statusOptions = STATUS_FLOW.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

  const openDetail = async (id: string) => {
    setOpenId(id); setDetail(null); setPreviewUrl(null); setAnswerPreviewUrl(null); setDetailLoading(true);
    try {
      const d = await getApplication(session, id);
      setDetail(d);
      // Preview both documents inline (opening the CV also advances the status
      // on first view). The answer preview is best-effort.
      const url = await signDocumentUrl(session, id, 'cv', 'preview');
      setPreviewUrl(url);
      try { setAnswerPreviewUrl(await signDocumentUrl(session, id, 'answer', 'preview')); } catch { /* no answer */ }
      load(); // refresh list (status may have changed to cv_opened)
    } catch (e) {
      toast({ title: 'Could not open candidate', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setDetailLoading(false); }
  };

  const download = async (id: string, kind: 'cv' | 'answer') => {
    try {
      const url = await signDocumentUrl(session, id, kind, 'download');
      triggerDownloads([{ name: `${kind}.pdf`, url }]);
    } catch (e) { toast({ title: 'Download failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const openDoc = async (id: string, kind: 'cv' | 'answer') => {
    try { window.open(await signDocumentUrl(session, id, kind, 'preview'), '_blank'); }
    catch (e) { toast({ title: 'Could not open', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const changeStatus = async (id: string, status: ApplicationStatus, division?: OrgDivision | null) => {
    try {
      await updateApplicationStatus(session, id, status, division);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status, interview_division: division ?? a.interview_division } : a)));
      if (detail?.application.id === id) setDetail({ ...detail, application: { ...detail.application, status, interview_division: division ?? detail.application.interview_division } });
      toast({ title: 'Status updated' });
    } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  // Status changes that send an email need explicit confirmation first.
  const requestStatusChange = (id: string, status: ApplicationStatus) => {
    if (EMAIL_ON_STATUS[status]) {
      if (status === 'interview_invitation_sent' && detail) setInviteDivision(detail.application.first_choice);
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
      const division = (inviteDivision ?? detail?.application.first_choice) as OrgDivision | undefined;
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

  const addNote = async () => {
    if (!openId || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await addApplicationNote(session, openId, noteText.trim());
      setNoteText('');
      setDetail(await getApplication(session, openId));
      load();
    } catch (e) { toast({ title: 'Could not add note', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSavingNote(false); }
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
        title="Candidates screening"
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

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by name, email or Bocconi ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <WorkspaceLoader /> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No applications match the current filters.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="1st / 2nd choice" options={divOptions} selected={divFilter} onChange={setDivFilter} /></th>
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
                  <td className="px-3 py-2 whitespace-nowrap">{divisionLabels[a.first_choice]}{a.second_choice ? ` / ${divisionLabels[a.second_choice]}` : ''}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{ACADEMIC_YEAR_LABELS[a.academic_year]}</td>
                  <td className="px-3 py-2 whitespace-nowrap max-w-[14rem] truncate" title={a.degree_course}>{a.degree_course}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 text-xs border ${statusBadgeClass(a.status)}`}>{STATUS_LABELS[a.status]}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" title="Preview CV" onClick={() => openDoc(a.id, 'cv')} className="text-muted-foreground hover:text-accent transition-colors">
                      <Eye className="h-4 w-4 inline" />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" title="Preview submitted work" onClick={() => openDoc(a.id, 'answer')} className="text-muted-foreground hover:text-accent transition-colors">
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

      {/* Candidate detail */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setDetail(null); setPreviewUrl(null); setAnswerPreviewUrl(null); } }}>
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}
            </DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader inline /> : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-body">
              {/* Left: details + prominent status + notes */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Email" value={detail.application.email} />
                  <Info label="Phone" value={detail.application.phone} />
                  <Info label="Bocconi ID" value={detail.application.bocconi_id} />
                  <Info label="Academic year" value={ACADEMIC_YEAR_LABELS[detail.application.academic_year]} />
                  <Info label="Programme" value={detail.application.degree_course} />
                  <Info label="LinkedIn" value={detail.application.linkedin_url || '-'} link={detail.application.linkedin_url || undefined} />
                  <Info label="First choice" value={divisionLabels[detail.application.first_choice]} />
                  <Info label="Second choice" value={detail.application.second_choice ? divisionLabels[detail.application.second_choice] : '-'} />
                  <Info label="Submitted" value={new Date(detail.application.created_at).toLocaleString()} />
                  {detail.application.interview_division && (
                    <Info label="Interview division" value={divisionLabels[detail.application.interview_division]} />
                  )}
                </div>

                {/* Prominent status control */}
                <div className="border border-accent/30 bg-accent/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-accent font-semibold">Candidate status</div>
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
                        value={MANUAL_STATUSES.some((o) => o.value === detail.application.status) ? detail.application.status : undefined}
                        onValueChange={(v) => requestStatusChange(detail.application.id, v as ApplicationStatus)}
                      >
                        <SelectTrigger className="font-body"><SelectValue placeholder="Change status…" /></SelectTrigger>
                        <SelectContent>
                          {MANUAL_STATUSES.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}{o.effect === 'action' ? '  ·  sends an email / action' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Statuses marked <strong>“sends an email / action”</strong> notify the applicant or unlock a step (e.g. “Invited to interview” emails them and opens booking); the others simply update what the applicant sees. Offer outcomes are handled in <strong>New Joiners</strong> and can’t be set here.
                      </p>
                    </>
                  )}
                  {detail.application.status === 'accepted' && (
                    <p className="text-xs text-amber-700 border-t border-amber-200 pt-2">
                      “Accepted” is <strong>not</strong> yet visible to the candidate. They still see their outcome as pending until a member gives final approval in <strong>New Joiners</strong>. Only then are they told they passed the selection.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => download(detail.application.id, 'cv')}><Download className="h-4 w-4 mr-2" />Download CV</Button>
                  <Button variant="outline" size="sm" onClick={() => download(detail.application.id, 'answer')}><Download className="h-4 w-4 mr-2" />Download work</Button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Notes (shared with reviewers)</div>
                  <p className="text-xs text-muted-foreground bg-muted/50 border border-separator p-2">
                    Please remember these notes are visible to <strong>all members with access to this area</strong>. Write only technical, formal and relevant comments for evaluating the candidate. Do not include unpleasant or inappropriate remarks.
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detail.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                    {detail.notes.map((n) => (
                      <div key={n.id} className="text-sm border border-separator p-2">
                        <div className="text-xs text-muted-foreground mb-1">{n.author_name} · {new Date(n.created_at).toLocaleDateString()}</div>
                        {n.body}
                      </div>
                    ))}
                  </div>
                  {canAddNotes && <>
                    <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a technical, formal note…" rows={2} />
                    <Button size="sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>
                      {savingNote ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Add note
                    </Button>
                  </>}
                </div>
              </div>

              {/* Centre: CV preview */}
              <div className="min-h-[400px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">CV preview</div>
                  <button type="button" onClick={() => openDoc(detail.application.id, 'cv')} className="text-xs text-accent hover:underline inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Open</button>
                </div>
                {previewUrl
                  ? <iframe title="CV" src={previewUrl} className="w-full h-[72vh] border border-separator" />
                  : <div className="h-[72vh] border border-separator flex items-center justify-center text-muted-foreground text-sm">No CV uploaded</div>}
              </div>

              {/* Right: submitted work preview */}
              <div className="min-h-[400px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Submitted work preview</div>
                  <button type="button" onClick={() => openDoc(detail.application.id, 'answer')} className="text-xs text-accent hover:underline inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Open</button>
                </div>
                {answerPreviewUrl
                  ? <iframe title="Submitted work" src={answerPreviewUrl} className="w-full h-[72vh] border border-separator" />
                  : <div className="h-[72vh] border border-separator flex items-center justify-center text-muted-foreground text-sm">No document uploaded</div>}
              </div>
            </div>
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
              {' '}Please check the details are correct — this cannot be undone. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingStatus?.status === 'interview_invitation_sent' && detail && (
            <div className="font-body">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Interview division</div>
              <Select value={inviteDivision ?? detail.application.first_choice} onValueChange={(v) => setInviteDivision(v as OrgDivision)}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={detail.application.first_choice}>{divisionLabels[detail.application.first_choice]} (first choice)</SelectItem>
                  {detail.application.second_choice && (
                    <SelectItem value={detail.application.second_choice}>{divisionLabels[detail.application.second_choice]} (second choice)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">The candidate will only be able to book an interview for this division.</p>
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
    </div>
  );
}

function Info({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all">{value}</a>
            : <div className="text-foreground break-words">{value}</div>}
    </div>
  );
}
