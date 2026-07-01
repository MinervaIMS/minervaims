import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Loader2, Plus, Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { getAutoEmails, saveAutoTemplate, createAutoTemplate, uploadAutoEmailFile, type AutoTemplate, type EmailLogRow } from '@/lib/ops-api';

export default function AutoEmails() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AutoTemplate[]>([]);
  const [log, setLog] = useState<EmailLogRow[]>([]);
  const [editing, setEditing] = useState<AutoTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [creating, setCreating] = useState(false);
  const [newT, setNewT] = useState({ name: '', description: '', file_url: '' });
  const newFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await getAutoEmails(session); setTemplates(r.templates); setLog(r.log); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try { await saveAutoTemplate(session, { id: editing.id, name: editing.name, subject: editing.subject, body: editing.body, description: editing.description, file_url: editing.file_url }); toast({ title: 'Template saved' }); setEditing(null); await load(); }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const uploadFor = async (file: File, target: 'edit' | 'new') => {
    setUploading(true);
    try {
      const url = await uploadAutoEmailFile(session, file);
      if (target === 'edit') setEditing((e) => (e ? { ...e, file_url: url } : e));
      else setNewT((n) => ({ ...n, file_url: url }));
      toast({ title: 'File uploaded' });
    } catch (e) { toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const create = async () => {
    if (!newT.name.trim()) { toast({ title: 'A title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try { await createAutoTemplate(session, { name: newT.name.trim(), description: newT.description || null, file_url: newT.file_url || null }); toast({ title: 'Template added' }); setCreating(false); setNewT({ name: '', description: '', file_url: '' }); await load(); }
    catch (e) { toast({ title: 'Could not add', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div><WorkspacePageHeader title="Auto emails" description="Templates and the register of automatic emails." /><WorkspaceLoader /></div>;

  return (
    <div className="space-y-10">
      <div>
        <WorkspacePageHeader title="Auto emails"
          description="The layouts used for automatic emails. A green dot means the template is connected to and used by the system; a red dot means it is not wired up yet. You can add new templates with a title, a description and a layout file."
          actions={<Button className="font-body" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-2" />Add template</Button>} />
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}><CardContent className="py-4">
              <div className="flex items-start justify-between gap-4 font-body">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${t.connected ? 'bg-green-600' : 'bg-red-500'}`} title={t.connected ? 'Connected and in use' : 'Not connected'} />
                    <span className="text-foreground">{t.name}</span>
                    <span className={`text-xs ${t.connected ? 'text-green-700' : 'text-red-600'}`}>{t.connected ? 'Connected' : 'Not connected'}</span>
                  </div>
                  {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                    {t.subject ? `Subject: ${t.subject}` : <span className="text-amber-700">No subject set</span>}
                    {t.file_url && <a href={t.file_url} target="_blank" rel="noopener noreferrer" className="text-accent underline inline-flex items-center gap-1">Layout file <FileText className="h-3 w-3" /></a>}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditing(t)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-serif text-xl text-accent mb-3">Sent register</h2>
        {log.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">No automatic emails recorded yet.</p>
        ) : (
          <div className="border border-separator overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr><th className="px-3 py-2 font-normal">Date</th><th className="px-3 py-2 font-normal">Template</th><th className="px-3 py-2 font-normal">Recipient</th><th className="px-3 py-2 font-normal">Status</th></tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-t border-separator">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{l.template_name}</td>
                    <td className="px-3 py-2">{l.recipient_email}</td>
                    <td className={`px-3 py-2 capitalize ${l.status === 'sent' ? 'text-green-700' : l.status === 'failed' || l.status === 'bounced' ? 'text-destructive' : 'text-muted-foreground'}`}>{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit template */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 font-body">
              <div className="space-y-1"><Label>Title</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Interview invitation" /></div>
              <div className="space-y-1"><Label>Description</Label><Input value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="When is this email sent?" /></div>
              <div className="space-y-1"><Label>Subject</Label><Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} placeholder="e.g. Your Minerva application" /></div>
              <div className="space-y-1"><Label>Body</Label><Textarea rows={6} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="You can use placeholders like {{name}}." /></div>
              <div className="space-y-1">
                <Label>Layout file</Label>
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFor(f, 'edit'); e.target.value = ''; }} />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Upload file</>}</Button>
                  {editing.file_url && <a href={editing.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline">Current file</a>}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save template'}</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add template */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-serif">Add template</DialogTitle></DialogHeader>
          <div className="space-y-3 font-body">
            <div className="space-y-1"><Label>Title *</Label><Input value={newT.name} onChange={(e) => setNewT({ ...newT, name: e.target.value })} placeholder="e.g. Interview invitation" /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={newT.description} onChange={(e) => setNewT({ ...newT, description: e.target.value })} placeholder="When is this email sent?" /></div>
            <div className="space-y-1">
              <Label>Layout file</Label>
              <input ref={newFileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFor(f, 'new'); e.target.value = ''; }} />
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => newFileRef.current?.click()}>{uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Upload file</>}</Button>
                {newT.file_url && <span className="text-xs text-green-700">File attached</span>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">New templates start as not connected (red) until they are wired into an automated flow.</p>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={create} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding</> : 'Add template'}</Button>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
