import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, BellOff, Copy, Eye, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listEvents, saveEvent, listReminderStatus, setRemindersPaused, sendReminderTest, AUDIENCE_LABELS,
  type EventRow, type RegistrationAudience, type EventReminderStatus, type ReminderStageStatus, type ReminderTestResult,
} from '@/lib/events-api';

// '2026-10-01' → '1 Oct'. The date is a calendar day, so it is read at noon
// UTC to stay the same day in every timezone.
const shortDay = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function stageText(s: ReminderStageStatus): string {
  if (s.state === 'sent') return `${s.label}: sent ${s.sent_at ? shortDay(s.sent_at.slice(0, 10)) : ''} to ${s.recipients ?? 0}`;
  if (s.state === 'scheduled') return s.catching_up ? `${s.label}: going out today` : `${s.label}: ${shortDay(s.due_on)}`;
  if (s.state === 'on_hold') return `${s.label}: ${shortDay(s.due_on)}, on hold`;
  return `${s.label}: not sent`;
}

const TEST_STATUS: Record<string, string> = {
  pending: 'queued', sent: 'sent', duplicate: 'held back, the same test was sent less than five minutes ago',
  suppressed: 'not sent, the address is on the suppression list', not_sent: 'not sent, the template is switched off in Auto emails',
};
const STAGE_LABEL: Record<string, string> = { '2w': '2 weeks before', '1w': '1 week before', '3d': '3 days before' };

export default function EventForms() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const access = useAccess();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Map<string, EventReminderStatus>>(new Map());
  const [canManageReminders, setCanManageReminders] = useState(false);
  const [busyReminder, setBusyReminder] = useState<string | null>(null);
  const [testFor, setTestFor] = useState<EventRow | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<ReminderTestResult[] | null>(null);

  // The reminders are read on their own: if that fails, the forms are
  // still listed and work exactly as before, only without the reminder line.
  const loadReminders = async () => {
    try {
      const res = await listReminderStatus(session);
      setReminders(new Map(res.reminders.map((r) => [r.event_id, r])));
      setCanManageReminders(res.can_manage);
    } catch (e) { console.error('Could not read the registration reminders', e); }
  };

  const load = async () => {
    setLoading(true);
    try { setEvents(await listEvents()); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
    loadReminders();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // Upcoming first. Association on Display days are left out: members sign
  // up for them per slot on their own page, and their event exists only so
  // attendance can be taken.
  const ordered = useMemo(
    () => events.filter((e) => !e.aod_day_id).sort((a, b) => (b.start_at || b.date).localeCompare(a.start_at || a.date)),
    [events],
  );

  const update = async (ev: EventRow, patch: Partial<EventRow>) => {
    try {
      await saveEvent(session, {
        id: ev.id, title: ev.title, date: ev.date, place: ev.place, moderator: ev.moderator, guest: ev.guest,
        description: ev.description, poster_url: ev.poster_url, event_type: ev.event_type, division: ev.division,
        start_at: ev.start_at, end_at: ev.end_at, online: ev.online,
        registration_enabled: patch.registration_enabled ?? ev.registration_enabled,
        registration_audience: patch.registration_audience ?? ev.registration_audience,
        // Preserve settings this page does not expose, so an update here can
        // never silently reset them.
        show_on_website: ev.show_on_website,
        in_archive: ev.in_archive,
      });
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, ...patch } : e)));
      // Closing or opening the form holds or releases the reminders.
      if (patch.registration_enabled !== undefined) loadReminders();
    } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/events/${id}/register`;
    navigator.clipboard?.writeText(url);
    toast({ title: 'Registration link copied', description: url });
  };

  const preview = (id: string) => window.open(`/events/${id}/register`, '_blank', 'noopener');

  const togglePaused = async (ev: EventRow, paused: boolean) => {
    setBusyReminder(ev.id);
    try {
      await setRemindersPaused(session, ev.id, paused);
      toast({
        title: paused ? 'Reminders stopped' : 'Reminders resumed',
        description: paused
          ? `No more registration reminders will be sent for ${ev.title}.`
          : `The reminders still ahead for ${ev.title} will be sent on schedule.`,
      });
      await loadReminders();
    } catch (e) {
      toast({ title: 'Could not change the reminders', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusyReminder(null); }
  };

  const openTest = (ev: EventRow) => {
    setTestFor(ev);
    setTestTo(user?.email || '');
    setTestResults(null);
  };

  const runTest = async () => {
    if (!testFor) return;
    setTesting(true);
    try {
      const res = await sendReminderTest(session, testFor.id, testTo.trim());
      setTestResults(res.results || []);
    } catch (e) {
      toast({ title: 'Could not send the test', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setTesting(false); }
  };

  const canChangeReminders = canManageReminders && access.canManage('events-forms');

  return (
    <div>
      <WorkspacePageHeader title="Registration Forms" description="Registration forms, the links that point at them, and the reminders members receive to register." />

      {loading ? <WorkspaceLoader /> : ordered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No events yet. Create one in Events → Create.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ordered.map((ev) => {
            const rem = reminders.get(ev.id);
            const ahead = (rem?.stages || []).filter((s) => s.state === 'scheduled' || s.state === 'on_hold');
            const sent = (rem?.stages || []).filter((s) => s.state === 'sent');
            const showReminders = ev.registration_enabled && !!rem && (ahead.length > 0 || sent.length > 0);
            return (
              <Card key={ev.id}><CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 font-body">
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-medium truncate">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(ev.start_at || ev.date).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">Registration <HelpDot page="events-forms" topic="audience" /></span>
                    <Switch checked={ev.registration_enabled} onCheckedChange={(v) => update(ev, { registration_enabled: v })} />
                  </div>
                  {ev.registration_enabled && (
                    <>
                      <Select value={ev.registration_audience} onValueChange={(v) => update(ev, { registration_audience: v as RegistrationAudience })}>
                        <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(AUDIENCE_LABELS) as RegistrationAudience[]).map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}</SelectContent>
                      </Select>
                      {canChangeReminders && rem && ahead.length > 0 && (
                        rem.paused ? (
                          <Button variant="outline" size="sm" disabled={busyReminder === ev.id} onClick={() => togglePaused(ev, false)}
                            title="Send the registration reminders still ahead for this event">
                            <Bell className="h-4 w-4 mr-2" />Resume reminders
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled={busyReminder === ev.id} onClick={() => togglePaused(ev, true)}
                            title="Stop the registration reminders of this event, for example when capacity is reached">
                            <BellOff className="h-4 w-4 mr-2" />Stop reminders
                          </Button>
                        )
                      )}
                      <Button variant="outline" size="sm" onClick={() => preview(ev.id)}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                      <Button variant="outline" size="sm" onClick={() => copyLink(ev.id)}><Copy className="h-4 w-4 mr-2" />Link</Button>
                    </>
                  )}
                </div>
                {showReminders && rem && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      {rem.paused ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                      Reminders to members not yet registered
                      <HelpDot page="events-forms" topic="reminders" />
                    </span>
                    {rem.paused && (
                      <span className="text-destructive">
                        Stopped{rem.paused_by ? ` by ${rem.paused_by}` : ''}{rem.paused_at ? ` on ${shortDay(rem.paused_at.slice(0, 10))}` : ''}
                      </span>
                    )}
                    {rem.stages.filter((s) => s.state !== 'skipped').map((s) => (
                      <span key={s.stage}>{stageText(s)}</span>
                    ))}
                    {canChangeReminders && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openTest(ev)}>
                        <Send className="h-3 w-3 mr-1" />Send a test
                      </Button>
                    )}
                  </div>
                )}
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!testFor} onOpenChange={(o) => { if (!o) setTestFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Test the reminders</DialogTitle>
            <DialogDescription>
              Sends the three reminders of {testFor?.title || 'this event'} (2 weeks, 1 week and 3 days before) to one address, exactly as members receive them. A test does not count as sent and changes nothing for members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reminder-test-to">Send to</Label>
            <Input id="reminder-test-to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="name@studbocconi.it" />
          </div>
          {testResults && (
            <ul className="font-body text-sm space-y-1" role="status">
              {testResults.map((r) => (
                <li key={r.stage}><span className="text-foreground">{STAGE_LABEL[r.stage] || r.stage}:</span> <span className="text-muted-foreground">{TEST_STATUS[r.status] || r.status}</span></li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestFor(null)}>Close</Button>
            <Button onClick={runTest} disabled={testing || !testTo.trim()}><Send className="h-4 w-4 mr-2" />{testing ? 'Sending…' : 'Send test'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
