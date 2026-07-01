import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listEvents, listRegistrations, markAttended, addExternalAttendee, removeRegistration,
  type EventRow, type EventRegistration,
} from '@/lib/events-api';

export default function EventAttendance() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [ext, setExt] = useState({ name: '', surname: '', email: '' });

  useEffect(() => {
    (async () => {
      try {
        const evs = await listEvents();
        setEvents(evs);
        if (evs.length) setEventId(evs[0].id);
      } catch (e) { toast({ title: 'Failed to load events', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  const loadRegs = async (id: string) => {
    if (!id) return;
    setLoadingRegs(true);
    try { setRegs(await listRegistrations(session, id)); }
    catch (e) { toast({ title: 'Failed to load attendees', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoadingRegs(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (eventId) loadRegs(eventId); }, [eventId]);

  const counts = useMemo(() => ({
    total: regs.length, attended: regs.filter((r) => r.attended).length,
    members: regs.filter((r) => r.is_member).length, external: regs.filter((r) => r.is_external).length,
  }), [regs]);

  const toggle = async (r: EventRegistration) => {
    try { await markAttended(session, r.id, !r.attended); setRegs((p) => p.map((x) => (x.id === r.id ? { ...x, attended: !x.attended } : x))); }
    catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const addExt = async () => {
    if (!ext.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    try { await addExternalAttendee(session, eventId, ext.name.trim(), ext.surname.trim(), ext.email.trim(), true); setExt({ name: '', surname: '', email: '' }); await loadRegs(eventId); }
    catch (e) { toast({ title: 'Could not add', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const remove = async (id: string) => {
    try { await removeRegistration(session, id); setRegs((p) => p.filter((x) => x.id !== id)); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const exportCsv = () => {
    downloadCSV(regs.map((r) => ({ name: r.name, email: r.email ?? '', type: r.is_member ? 'Member' : 'External', attended: r.attended ? 'Yes' : 'No' })),
      [{ key: 'name', header: 'Name' }, { key: 'email', header: 'Email' }, { key: 'type', header: 'Type' }, { key: 'attended', header: 'Attended' }], 'attendance.csv');
  };

  if (loading) return <div><WorkspacePageHeader title="Attendance" description="Track who registered and who attended." /><WorkspaceLoader /></div>;

  return (
    <div>
      <WorkspacePageHeader title="Attendance" description="See who registered, mark who attended, and add external participants. Members and external participants are distinguished." />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Event</label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="font-body"><SelectValue placeholder="Select an event…" /></SelectTrigger>
            <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} - {new Date(e.start_at || e.date).toLocaleDateString()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="font-body" disabled={regs.length === 0} onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
      </div>

      <p className="font-body text-sm text-muted-foreground mb-4">{counts.attended}/{counts.total} attended · {counts.members} members · {counts.external} external</p>

      {/* Add external attendee: name, surname and email (email is added to the newsletter). */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6 font-body">
        <Input placeholder="Name" value={ext.name} onChange={(e) => setExt({ ...ext, name: e.target.value })} />
        <Input placeholder="Surname" value={ext.surname} onChange={(e) => setExt({ ...ext, surname: e.target.value })} />
        <Input placeholder="Email (added to newsletter)" value={ext.email} onChange={(e) => setExt({ ...ext, email: e.target.value })} />
        <Button variant="outline" onClick={addExt} disabled={!eventId}><Plus className="h-4 w-4 mr-2" />Add</Button>
      </div>

      {loadingRegs ? <WorkspaceLoader /> : regs.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No registrations yet.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal text-center">Attended</th>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal">Type</th>
                <th className="px-3 py-2 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id} className="border-t border-separator">
                  <td className="px-3 py-2 text-center"><Checkbox checked={r.attended} onCheckedChange={() => toggle(r)} /></td>
                  <td className="px-3 py-2 text-foreground">{r.name}</td>
                  <td className="px-3 py-2">{r.email || '-'}</td>
                  <td className="px-3 py-2">{r.is_member ? 'Member' : 'External'}</td>
                  <td className="px-3 py-2 text-right"><Button variant="destructive" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
