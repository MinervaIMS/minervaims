import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload as UploadIcon, FileText, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { supabase } from '@/integrations/supabase/client';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { activeFunds, fundLabels, type Fund } from '@/lib/types';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { logActivity } from '@/lib/activity-log';
import { PdfThumbnail, countPdfPages } from '@/components/shared/PdfThumbnail';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

export default function ReportUpload() {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const canPublishDirectly = access.canManage('reports-upload') || access.primaryRole === 'head_of_division';
  const allowedDivisions = useMemo<OrgDivision[]>(() => {
    // Full access and division-less leadership (VP, Head of AM) may upload for
    // any division; division-scoped roles only for their own.
    if (access.isFullAccess || !access.allowedDivisions?.length) return CORE;
    return access.allowedDivisions.filter((d) => (CORE as string[]).includes(d)) as OrgDivision[];
  }, [access]);

  const [form, setForm] = useState({
    title: '', description: '',
    date: new Date().toISOString().slice(0, 10),
    division: (allowedDivisions[0] ?? '') as OrgDivision | '',
    fund: '' as Fund | '',
  });
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [publishNow, setPublishNow] = useState(canPublishDirectly);
  const [submitting, setSubmitting] = useState(false);

  const isFundReport = form.division === 'portfolio' && !!form.fund;

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') { toast({ title: 'Only PDF files are allowed', variant: 'destructive' }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'File must be under 10 MB', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (form.division) fd.append('division', form.division);
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: fd, headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFileUrl(data.file_url); setFileName(file.name);
      // Page count is detected automatically from the PDF. No user input.
      countPdfPages(file).then((pages) => setPageCount(pages ? String(pages) : '')).catch(() => setPageCount(''));
      toast({ title: 'File uploaded' });
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.date || !form.division) { toast({ title: 'Title, date and division are required', variant: 'destructive' }); return; }
    if (!fileUrl) { toast({ title: 'Please attach the report PDF first', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: {
          action: 'create',
          file: {
            title: form.title, description: form.description || null, file_url: fileUrl,
            date: form.date, division: form.division, fund: form.division === 'portfolio' ? (form.fund || null) : null,
            status: publishNow ? 'published' : 'draft',
            page_count: pageCount && Number(pageCount) > 0 ? Number(pageCount) : null,
          },
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: publishNow ? 'Report published' : 'Report saved as draft',
        description: isFundReport
          ? 'Reminder: add the updated performance data in Funds\' Performances so it appears on the public fund table.'
          : 'You can find it in Reports > Archive.',
      });
      logActivity(session, access.primaryRole, { action: 'upload', section: 'Reports', subsection: 'Upload report', entityType: 'file', entityName: form.title, details: { division: form.division, published: publishNow, pages: pageCount || null } });
      setForm((f) => ({ ...f, title: '', description: '', fund: '' }));
      setFileUrl(''); setFileName(''); setPageCount('');
    } catch (e) {
      toast({ title: 'Could not save report', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Upload"
        description="Add a new report: complete the details, attach the PDF, then publish it to the Archive or save it as a draft for review."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),360px] gap-10 font-body">
        {/* Details */}
        <div className="space-y-5 min-w-0">
          <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Equity Research - Q1 2026 sector outlook" /></div>
          <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short summary of what this report covers and its main conclusions." /></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Division *</Label>
              <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v as OrgDivision, fund: '' })}>
                <SelectTrigger><SelectValue placeholder="Select a division" /></SelectTrigger>
                <SelectContent>{allowedDivisions.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.division === 'portfolio' && (
              <div className="space-y-1">
                <Label>Fund</Label>
                <Select value={form.fund} onValueChange={(v) => setForm({ ...form, fund: v as Fund })}>
                  <SelectTrigger><SelectValue placeholder="Optional - select a fund" /></SelectTrigger>
                  <SelectContent>{activeFunds.map((f) => <SelectItem key={f} value={f}>{fundLabels[f]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isFundReport && (
            <Card className="border-accent/30 bg-accent/5"><CardContent className="py-3 flex gap-2 items-start">
              <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">Remember to add the updated performance data in the Funds' Performances section, so it appears correctly on the public fund performance table.</p>
            </CardContent></Card>
          )}

          {/* Publish control - clarified */}
          <div className="border border-separator p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="publish">Publish now</Label>
              <Switch id="publish" checked={publishNow} disabled={!canPublishDirectly} onCheckedChange={setPublishNow} />
            </div>
            <p className="text-sm text-muted-foreground">
              {publishNow
                ? 'On: the report is published straight away and listed in Reports > Archive.'
                : 'Off: the report is saved as a draft and held for a Head to review; it is not listed in the Archive until it is published.'}
            </p>
            {!canPublishDirectly && <p className="text-xs text-muted-foreground">You can save drafts; a Head of Division publishes them.</p>}
          </div>

          {/* PDF picker - moved to the end */}
          <div className="space-y-2">
            <Label>Report file (PDF) *</Label>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
            {fileUrl ? (
              <div className="flex items-center gap-3 border border-separator p-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{fileName}</span>
                <Button variant="outline" size="sm" onClick={() => { setFileUrl(''); setFileName(''); }}>Replace</Button>
              </div>
            ) : (
              <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><UploadIcon className="h-4 w-4 mr-2" />Attach PDF</>}
              </Button>
            )}
          </div>

          <Button onClick={submit} disabled={submitting || uploading}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : publishNow ? 'Publish report' : 'Save draft'}
          </Button>
        </div>

        {/* Cover preview */}
        <div className="lg:pt-7">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cover preview</Label>
          <div className="mt-2 border border-separator bg-muted/30">
            {fileUrl ? (
              <PdfThumbnail url={fileUrl} renderWidth={300} className="w-full" />
            ) : (
              <div className="aspect-[1/1.4142] flex flex-col items-center justify-center text-center gap-2 text-muted-foreground p-4">
                <FileText className="h-8 w-8" />
                <span className="text-xs">Attach a PDF to preview its cover here.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
