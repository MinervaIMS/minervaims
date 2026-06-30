import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Search, MessageSquare, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listApplications, getApplication, signDocumentUrl, bulkDocumentUrls,
  updateApplicationStatus, addApplicationNote,
  ACADEMIC_YEAR_LABELS, STATUS_FLOW, STATUS_LABELS,
  type ApplicationRow, type ApplicationNote, type ApplicationStatus,
} from '@/lib/applications-api';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

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
  const { toast } = useToast();

  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divFilter, setDivFilter] = useState<OrgDivision | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [bulkBusy, setBulkBusy] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ application: ApplicationRow; notes: ApplicationNote[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

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
      .filter((a) => divFilter === 'all' || a.first_choice === divFilter || a.second_choice === divFilter)
      .filter((a) => statusFilter === 'all' || a.status === statusFilter)
      .filter((a) => yearFilter === 'all' || a.academic_year === yearFilter)
      .filter((a) => !q || `${a.first_name} ${a.surname} ${a.email} ${a.bocconi_id}`.toLowerCase().includes(q));
  }, [apps, search, divFilter, statusFilter, yearFilter]);

  const openDetail = async (id: string) => {
    setOpenId(id); setDetail(null); setPreviewUrl(null); setDetailLoading(true);
    try {
      const d = await getApplication(session, id);
      setDetail(d);
      // Preview the CV inline (this also advances the status on first view).
      const url = await signDocumentUrl(session, id, 'cv', 'preview');
      setPreviewUrl(url);
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

  const changeStatus = async (id: string, status: ApplicationStatus) => {
    try {
      await updateApplicationStatus(session, id, status);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      if (detail?.application.id === id) setDetail({ ...detail, application: { ...detail.application, status } });
      toast({ title: 'Status updated' });
    } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
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
        title="Candidates"
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

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div>
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Division preference</label>
          <Select value={divFilter} onValueChange={(v) => setDivFilter(v as OrgDivision | 'all')}>
            <SelectTrigger className="min-w-[180px] font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All divisions</SelectItem>
              {CORE.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[170px] font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_FLOW.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Academic year</label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="min-w-[160px] font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {(Object.keys(ACADEMIC_YEAR_LABELS) as (keyof typeof ACADEMIC_YEAR_LABELS)[]).map((y) => <SelectItem key={y} value={y}>{ACADEMIC_YEAR_LABELS[y]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 font-body" placeholder="Name, email or Bocconi ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
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
                <th className="px-3 py-2 font-normal">1st / 2nd choice</th>
                <th className="px-3 py-2 font-normal">Year</th>
                <th className="px-3 py-2 font-normal">Status</th>
                <th className="px-3 py-2 font-normal text-center">CV</th>
                <th className="px-3 py-2 font-normal text-center"><MessageSquare className="h-3.5 w-3.5 inline" /></th>
                <th className="px-3 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-separator hover:bg-muted/30">
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">{a.first_name} {a.surname}<div className="text-xs text-muted-foreground">{a.email}</div></td>
                  <td className="px-3 py-2 whitespace-nowrap">{divisionLabels[a.first_choice]}{a.second_choice ? ` / ${divisionLabels[a.second_choice]}` : ''}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{ACADEMIC_YEAR_LABELS[a.academic_year]}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{STATUS_LABELS[a.status]}</td>
                  <td className="px-3 py-2 text-center">{a.cv_viewed_at ? <Eye className="h-4 w-4 inline text-muted-foreground" /> : <span className="text-amber-700 text-xs">new</span>}</td>
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
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setDetail(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}</DialogTitle></DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-body">
              {/* Left: details + status + notes */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Email" value={detail.application.email} />
                  <Info label="Phone" value={detail.application.phone} />
                  <Info label="Bocconi ID" value={detail.application.bocconi_id} />
                  <Info label="Academic year" value={ACADEMIC_YEAR_LABELS[detail.application.academic_year]} />
                  <Info label="Degree / course" value={detail.application.degree_course} />
                  <Info label="LinkedIn" value={detail.application.linkedin_url || '—'} link={detail.application.linkedin_url || undefined} />
                  <Info label="First choice" value={divisionLabels[detail.application.first_choice]} />
                  <Info label="Second choice" value={detail.application.second_choice ? divisionLabels[detail.application.second_choice] : '—'} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Status</div>
                  <Select value={detail.application.status} onValueChange={(v) => changeStatus(detail.application.id, v as ApplicationStatus)}>
                    <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_FLOW.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => openDoc(detail.application.id, 'answer')}><FileText className="h-4 w-4 mr-2" />Open answer</Button>
                  <Button variant="outline" size="sm" onClick={() => download(detail.application.id, 'cv')}><Download className="h-4 w-4 mr-2" />CV</Button>
                  <Button variant="outline" size="sm" onClick={() => download(detail.application.id, 'answer')}><Download className="h-4 w-4 mr-2" />Answer</Button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Notes (shared with reviewers)</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detail.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                    {detail.notes.map((n) => (
                      <div key={n.id} className="text-sm border border-separator p-2">
                        <div className="text-xs text-muted-foreground mb-1">{n.author_name} · {new Date(n.created_at).toLocaleDateString()}</div>
                        {n.body}
                      </div>
                    ))}
                  </div>
                  <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" rows={2} />
                  <Button size="sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>
                    {savingNote ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Add note
                  </Button>
                </div>
              </div>

              {/* Right: CV preview */}
              <div className="min-h-[400px]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">CV preview</div>
                {previewUrl
                  ? <iframe title="CV" src={previewUrl} className="w-full h-[60vh] border border-separator" />
                  : <div className="h-[60vh] border border-separator flex items-center justify-center text-muted-foreground text-sm">No CV uploaded</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
