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

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

export default function ReportUpload() {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const canPublishDirectly = access.isFullAccess || access.primaryRole === 'head_of_division';
  const allowedDivisions = useMemo<OrgDivision[]>(() => {
    if (access.isFullAccess) return CORE;
    return (access.allowedDivisions || []).filter((d) => (CORE as string[]).includes(d)) as OrgDivision[];
  }, [access]);

  const [form, setForm] = useState({
    title: '', description: '', project: '',
    date: new Date().toISOString().slice(0, 10),
    division: (allowedDivisions[0] ?? '') as OrgDivision | '',
    fund: '' as Fund | '',
  });
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
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
      toast({ title: 'File uploaded' });
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.date || !form.division) { toast({ title: 'Title, date and division are required', variant: 'destructive' }); return; }
    if (!fileUrl) { toast({ title: 'Please upload the report PDF first', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: {
          action: 'create',
          file: {
            title: form.title, description: form.description || null, file_url: fileUrl,
            date: form.date, division: form.division, fund: form.division === 'portfolio' ? (form.fund || null) : null,
            project: form.project || null, status: publishNow ? 'published' : 'draft',
          },
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: publishNow ? 'Report published' : 'Report saved as draft',
        description: isFundReport
          ? 'Reminder: add the updated performance data in Funds’ Performances so it appears on the public fund table.'
          : 'You can find it in Reports → Archive.',
      });
      setForm((f) => ({ ...f, title: '', description: '', project: '', fund: '' }));
      setFileUrl(''); setFileName('');
    } catch (e) {
      toast({ title: 'Could not save report', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Upload"
        description="Upload a new report: attach the file, complete the details, and publish it to the Archive (or save it as a draft for review)."
      />

      <div className="max-w-2xl space-y-5 font-body">
        {/* File */}
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
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><UploadIcon className="h-4 w-4 mr-2" />Choose PDF</>}
            </Button>
          )}
        </div>

        <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Report title" /></div>
        <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short summary of the report" /></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Division *</Label>
            <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v as OrgDivision, fund: '' })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{allowedDivisions.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.division === 'portfolio' && (
            <div className="space-y-1">
              <Label>Fund</Label>
              <Select value={form.fund} onValueChange={(v) => setForm({ ...form, fund: v as Fund })}>
                <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
                <SelectContent>{activeFunds.map((f) => <SelectItem key={f} value={f}>{fundLabels[f]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label>Project (optional)</Label><Input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Q1 sector review" /></div>
        </div>

        {isFundReport && (
          <Card className="border-accent/30 bg-accent/5"><CardContent className="py-3 flex gap-2 items-start">
            <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">Please remember to add the updated performance data in the <strong>Funds’ Performances</strong> section, so it appears correctly on the public fund performance table.</p>
          </CardContent></Card>
        )}

        <div className="flex items-center justify-between border border-separator p-3">
          <div>
            <Label htmlFor="publish">Publish now</Label>
            <p className="text-xs text-muted-foreground">{canPublishDirectly ? 'Publish straight to the Archive, or save as a draft for review.' : 'You can save a draft; a Head publishes it.'}</p>
          </div>
          <Switch id="publish" checked={publishNow} disabled={!canPublishDirectly} onCheckedChange={setPublishNow} />
        </div>

        <Button onClick={submit} disabled={submitting || uploading} className="font-body">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save report'}
        </Button>
      </div>
    </div>
  );
}
