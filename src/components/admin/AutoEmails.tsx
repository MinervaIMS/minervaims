import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { getAutoEmails, saveAutoTemplate, type AutoTemplate, type EmailLogRow } from '@/lib/ops-api';

export default function AutoEmails() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AutoTemplate[]>([]);
  const [log, setLog] = useState<EmailLogRow[]>([]);
  const [editing, setEditing] = useState<AutoTemplate | null>(null);
  const [saving, setSaving] = useState(false);

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
    try { await saveAutoTemplate(session, { id: editing.id, subject: editing.subject, body: editing.body, description: editing.description }); toast({ title: 'Template saved' }); setEditing(null); await load(); }
    catch (e) { toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div><WorkspacePageHeader title="Auto emails" description="Templates and the register of automatic emails." /><WorkspaceLoader /></div>;

  return (
    <div className="space-y-10">
      <div>
        <WorkspacePageHeader title="Auto emails" description="The templates used for automatic emails (applications, events, candidate updates, membership, fee reminders, newsletter) and the register of emails the system has sent." />
        <h2 className="font-serif text-xl text-accent mb-3">Templates</h2>
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}><CardContent className="py-4">
              <div className="flex items-start justify-between gap-4 font-body">
                <div className="min-w-0">
                  <div className="text-foreground font-medium">{t.name}</div>
                  {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                  <div className="text-sm text-muted-foreground mt-1 truncate">{t.subject ? `Subject: ${t.subject}` : <span className="text-amber-700">No subject set</span>}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditing(t)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 font-body">
              <div className="space-y-1"><Label>Subject</Label><Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></div>
              <div className="space-y-1"><Label>Body</Label><Textarea rows={8} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="You can use placeholders like {{name}}." /></div>
              <div className="flex gap-3 pt-1">
                <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save template'}</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
