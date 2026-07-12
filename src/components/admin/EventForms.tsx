import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { listEvents, saveEvent, AUDIENCE_LABELS, type EventRow, type RegistrationAudience } from '@/lib/events-api';

export default function EventForms() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setEvents(await listEvents()); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // Upcoming first.
  const ordered = useMemo(() => [...events].sort((a, b) => (b.start_at || b.date).localeCompare(a.start_at || a.date)), [events]);

  const update = async (ev: EventRow, patch: Partial<EventRow>) => {
    try {
      await saveEvent(session, {
        id: ev.id, title: ev.title, date: ev.date, place: ev.place, moderator: ev.moderator, guest: ev.guest,
        description: ev.description, poster_url: ev.poster_url, event_type: ev.event_type, division: ev.division,
        start_at: ev.start_at, end_at: ev.end_at, online: ev.online,
        registration_enabled: patch.registration_enabled ?? ev.registration_enabled,
        registration_audience: patch.registration_audience ?? ev.registration_audience,
      });
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, ...patch } : e)));
    } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/events/${id}/register`;
    navigator.clipboard?.writeText(url);
    toast({ title: 'Registration link copied', description: url });
  };

  const preview = (id: string) => window.open(`/events/${id}/register`, '_blank', 'noopener');

  return (
    <div>
      <WorkspacePageHeader title="Registration forms" description="Any event of any type can have a registration form. Turn registration on, choose who can register, preview the public form, and share the link. Registrations feed straight into Attendance." />

      {loading ? <WorkspaceLoader /> : ordered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No events yet. Create one in Events → Create.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ordered.map((ev) => (
            <Card key={ev.id}><CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 font-body">
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium truncate">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(ev.start_at || ev.date).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Registration</span>
                  <Switch checked={ev.registration_enabled} onCheckedChange={(v) => update(ev, { registration_enabled: v })} />
                </div>
                {ev.registration_enabled && (
                  <>
                    <Select value={ev.registration_audience} onValueChange={(v) => update(ev, { registration_audience: v as RegistrationAudience })}>
                      <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(AUDIENCE_LABELS) as RegistrationAudience[]).map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => preview(ev.id)}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                    <Button variant="outline" size="sm" onClick={() => copyLink(ev.id)}><Copy className="h-4 w-4 mr-2" />Link</Button>
                  </>
                )}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
