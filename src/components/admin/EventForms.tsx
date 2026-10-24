import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, BellOff, Copy, Eye, Mail, Search, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { formatClock, formatEventWhen, isoToRomeLocal, romeLocalToIso } from '@/lib/event-time';
import { isSelectionVisit, interestOpen, suggestedClosingLocal } from '@/lib/company-visits-api';
import {
  listEvents, saveEvent, listReminderStatus, setRemindersPaused, sendReminderTest, AUDIENCE_LABELS, type EventRow, type RegistrationAudience, type EventReminderStatus, type ReminderStageStatus, type ReminderTestResult, type ThankYouStatus, eventTypeLabel
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
const STAGE_LABEL: Record<string, string> = {
  '2w': '2 weeks before', '1w': '1 week before', '3d': '3 days before', '24h_attending': '24 hours before (registered members)', thank_you: 'Thank-you to guests',
  confirmation: 'Registration confirmed', waitlist_joined: 'On the waiting list', waitlist_promoted: 'A place has opened up', cancelled: 'Registration cancelled',
  received: 'Interest received', invited: 'Invitation', not_selected: 'Not this time', spot_opened: 'A place has opened up',
};

// The thank-you the morning after, to the guests who attended.
function thankYouText(t: ThankYouStatus): string {
  if (t.state === 'sent') return `sent ${t.sent_at ? shortDay(t.sent_at.slice(0, 10)) : ''} to ${t.recipients ?? 0}`;
  if (t.state === 'waiting') return 'due, it goes out the morning after attendance is taken';
  return `${shortDay(t.due_on)} at ${formatClock('09:00', t.due_on)}`;
}

// ── Places: a number, or empty for no limit ─────────────────────────
function PlacesEditor({ ev, disabled, onSave }: { ev: EventRow; disabled: boolean; onSave: (capacity: number | null) => Promise<void> | void }) {
  const current = ev.capacity ?? null;
  const [value, setValue] = useState(current ? String(current) : '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(current ? String(current) : ''); }, [current]);
  const parsed = value.trim() ? Number(value) : null;
  const valid = parsed === null || (Number.isInteger(parsed) && parsed >= 1 && parsed <= 10000);
  const changed = parsed !== current;
  const save = async () => {
    if (!valid || !changed) return;
    setSaving(true);
    try { await onSave(parsed); } finally { setSaving(false); }
  };
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={`places-${ev.id}`} className="text-sm text-muted-foreground font-normal inline-flex items-center gap-1.5">Places <HelpDot page="events-forms" topic="places" /></Label>
      <Input id={`places-${ev.id}`} type="number" inputMode="numeric" min={1} step={1} className="h-9 w-24" placeholder="No limit"
        value={value} disabled={disabled || saving} aria-invalid={!valid}
        onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
      {changed && valid && !disabled && (
        <Button size="sm" variant="solid" className="h-9" onClick={save} disabled={saving}>Save</Button>
      )}
    </div>
  );
}

// ── A company visit's closing date (Step 93B) ───────────────────────
function ClosingEditor({ ev, disabled, onSave }: { ev: EventRow; disabled: boolean; onSave: (iso: string) => Promise<void> | void }) {
  const current = isoToRomeLocal(ev.interest_closes_at);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(current); }, [current]);
  const changed = !!value && value !== current;
  const save = async () => {
    const iso = romeLocalToIso(value);
    if (!changed || !iso) return;
    setSaving(true);
    try { await onSave(iso); } finally { setSaving(false); }
  };
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={`closes-${ev.id}`} className="text-sm text-muted-foreground font-normal whitespace-nowrap">Interest closes</Label>
      <Input id={`closes-${ev.id}`} type="datetime-local" className="h-9 w-[205px]" value={value} disabled={disabled || saving}
        onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
      {changed && !disabled && <Button size="sm" variant="solid" className="h-9" onClick={save} disabled={saving}>Save</Button>}
    </div>
  );
}

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
  // Which emails the test sends: the reminders, the thank-you, or the
  // registration emails (confirmation, waiting list, place opened, cancelled).
  const [testKind, setTestKind] = useState<'reminders' | 'thank_you' | 'notices'>('reminders');
  const testThankYou = testKind === 'thank_you';
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<ReminderTestResult[] | null>(null);
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  // A company visit's form being opened: its closing date is asked first.
  const [closingFor, setClosingFor] = useState<EventRow | null>(null);
  const [closingValue, setClosingValue] = useState('');

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
    // An alumni call still to be confirmed cannot open registration yet (Step 91).
    try { setEvents((await listEvents()).filter((e) => !e.date_tbc)); }
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
        // Places are sent only when changed here: absent keeps the limit.
        ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
        // So is a company visit's closing date (Step 93B).
        ...(patch.interest_closes_at !== undefined ? { interest_closes_at: patch.interest_closes_at } : {}),
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

  const openTest = (ev: EventRow, kind: 'reminders' | 'thank_you' | 'notices' = 'reminders') => {
    setTestFor(ev);
    setTestKind(kind);
    setTestTo(user?.email || '');
    setTestResults(null);
  };

  const runTest = async () => {
    if (!testFor) return;
    setTesting(true);
    try {
      const res = await sendReminderTest(session, testFor.id, testTo.trim(), testKind === 'reminders' ? undefined : testKind);
      setTestResults(res.results || []);
    } catch (e) {
      toast({ title: 'Could not send the test', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setTesting(false); }
  };

  const canChangeReminders = canManageReminders && access.canManage('events-forms');
  const canEdit = access.canManage('events-forms');

  // Upcoming soonest first, then the past, most recent first and folded.
  const now = Date.now();
  const isPast = (e: EventRow) => Date.parse(e.end_at || e.start_at || `${e.date}T23:59:59`) < now;
  const q = query.trim().toLowerCase();
  const matches = (e: EventRow) => (!q || e.title.toLowerCase().includes(q)) && (!openOnly || e.registration_enabled);
  const upcoming = ordered.filter((e) => !isPast(e) && matches(e)).reverse();
  const past = ordered.filter((e) => isPast(e) && matches(e));
  const pastShown = showAllPast ? past : past.slice(0, 8);

  /** Turning the form on: a company visit asks for its closing date first. */
  const switchForm = (ev: EventRow, on: boolean) => {
    if (on && ev.event_type === 'company_visit' && !ev.interest_closes_at) {
      setClosingFor(ev);
      setClosingValue(suggestedClosingLocal(isoToRomeLocal(ev.start_at) || `${ev.date}T09:00`, isoToRomeLocal(new Date().toISOString())));
      return;
    }
    update(ev, { registration_enabled: on });
  };
  const saveClosing = async () => {
    if (!closingFor) return;
    const iso = romeLocalToIso(closingValue);
    if (!iso) { toast({ title: 'Pick when the interest form closes', variant: 'destructive' }); return; }
    const ev = closingFor;
    setClosingFor(null);
    await update(ev, { registration_enabled: true, interest_closes_at: iso });
  };

  const renderRow = (ev: EventRow) => {
    const rem = reminders.get(ev.id);
    const ahead = (rem?.stages || []).filter((s) => s.state === 'scheduled' || s.state === 'on_hold');
    const sent = (rem?.stages || []).filter((s) => s.state === 'sent');
    const showReminders = ev.registration_enabled && !!rem && (ahead.length > 0 || sent.length > 0);
    const thanks = rem?.thank_you && rem.thank_you.state !== 'not_sent' ? rem.thank_you : null;
    const selection = isSelectionVisit(ev);
    const formOpen = selection ? interestOpen(ev) : ev.registration_enabled;
    return (
      <Card key={ev.id}><CardContent className="py-4 font-body">
        {/* Line 1: what the event is, and whether its form is on. */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-foreground font-medium break-words">{ev.title}</div>
            <div className="text-xs text-muted-foreground">
              {[formatEventWhen(ev, { month: 'short' }), eventTypeLabel(ev.event_type)].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-1.5 py-0.5 border whitespace-nowrap ${formOpen ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800' : 'border-separator text-muted-foreground'}`}>
              {selection ? (formOpen ? 'Interest form open' : ev.registration_enabled ? 'Interest form closed' : 'Off') : ev.registration_enabled ? 'Open' : 'Off'}
            </span>
            <Switch checked={ev.registration_enabled} disabled={!canEdit} onCheckedChange={(v) => switchForm(ev, v)}
              aria-label={`${ev.registration_enabled ? 'Close' : 'Open'} the registration form of ${ev.title}`} />
          </div>
        </div>

        {/* Line 2: how the form works, when it is on. */}
        {ev.registration_enabled && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-2">
            {selection ? (
              <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                Members and alumni register their interest <HelpDot page="events-forms" topic="company-visits" />
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">Who <HelpDot page="events-forms" topic="audience" /></span>
                <Select value={ev.registration_audience} disabled={!canEdit} onValueChange={(v) => update(ev, { registration_audience: v as RegistrationAudience })}>
                  <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(AUDIENCE_LABELS) as RegistrationAudience[]).map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <PlacesEditor ev={ev} disabled={!canEdit} onSave={(capacity) => update(ev, { capacity })} />
            {ev.event_type === 'company_visit' && (
              <ClosingEditor ev={ev} disabled={!canEdit} onSave={(iso) => update(ev, { interest_closes_at: iso })} />
            )}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" onClick={() => preview(ev.id)}><Eye className="h-4 w-4 mr-2" />Preview</Button>
              <Button variant="outline" size="sm" onClick={() => copyLink(ev.id)}><Copy className="h-4 w-4 mr-2" />Copy link</Button>
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
              {canChangeReminders && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openTest(ev, 'notices')}>
                  <Send className="h-3 w-3 mr-1" />{selection ? 'Test the company visit emails' : 'Test the registration emails'}
                </Button>
              )}
            </div>
          </div>
        )}
        {showReminders && rem && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              {rem.paused ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
              {selection ? 'Reminder to the members invited' : 'Reminders to members not yet registered'}
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
        {thanks && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Mail className="h-3.5 w-3.5" />
              Thank-you to guests who attended
              <HelpDot page="events-forms" topic="thank-you" />
            </span>
            <span>{thankYouText(thanks)}</span>
            {canChangeReminders && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openTest(ev, 'thank_you')}>
                <Send className="h-3 w-3 mr-1" />Send a test
              </Button>
            )}
          </div>
        )}
      </CardContent></Card>
    );
  };

  return (
    <div>
      <WorkspacePageHeader title="Registration Forms" description="Open or close each event's form, choose who can register and how many places there are, and follow the reminders members receive and the thank-you guests receive after attending." />

      {loading ? <WorkspaceLoader /> : ordered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No events yet. Create one in Events → Create Event.</p></CardContent></Card>
      ) : (
        <div className="space-y-6 font-body">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events by title" className="pl-9" aria-label="Search events" />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <Switch checked={openOnly} onCheckedChange={setOpenOnly} aria-label="Only events with an open form" />Only open forms
            </label>
          </div>

          <section className="space-y-3" aria-labelledby="forms-upcoming">
            <h2 id="forms-upcoming" className="font-serif text-lg text-accent">Coming up <span className="font-body text-sm text-muted-foreground">({upcoming.length})</span></h2>
            {upcoming.length === 0
              ? <p className="text-sm text-muted-foreground border border-separator px-4 py-6 text-center">{q || openOnly ? 'No upcoming event matches.' : 'No upcoming events. Create one in Events → Create Event.'}</p>
              : upcoming.map(renderRow)}
          </section>

          {past.length > 0 && (
            <section className="space-y-3" aria-labelledby="forms-past">
              <h2 id="forms-past" className="font-serif text-lg text-accent">Past <span className="font-body text-sm text-muted-foreground">({past.length})</span></h2>
              {pastShown.map(renderRow)}
              {past.length > pastShown.length && (
                <Button variant="outline" size="sm" onClick={() => setShowAllPast(true)}>Show all {past.length} past events</Button>
              )}
            </section>
          )}
        </div>
      )}

      <Dialog open={!!closingFor} onOpenChange={(o) => { if (!o) setClosingFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">When does the interest form close?</DialogTitle>
            <DialogDescription>
              A company visit selects its participants: members and alumni register their interest with their CV until then, and the President and the Vice President choose who goes. A week before the visit at the latest leaves time to choose and to tell everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="closing-new">Closes (Rome time)</Label>
            <Input id="closing-new" type="datetime-local" value={closingValue} onChange={(e) => setClosingValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingFor(null)}>Cancel</Button>
            <Button variant="solid" onClick={saveClosing} disabled={!closingValue}>Open the interest form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!testFor} onOpenChange={(o) => { if (!o) setTestFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{testKind === 'notices' ? (isSelectionVisit(testFor) ? 'Test the company visit emails' : 'Test the registration emails') : testThankYou ? 'Test the thank-you' : 'Test the reminders'}</DialogTitle>
            <DialogDescription>
              {testKind === 'notices' && isSelectionVisit(testFor)
                ? `Sends the four company visit emails of ${testFor?.title || 'this visit'} to one address: interest received, the invitation (with a sample entry code and Add to calendar), not this time, and a place has opened up. Nothing is changed for anybody.`
                : testKind === 'notices'
                ? `Sends the four registration emails of ${testFor?.title || 'this event'} to one address: the confirmation (with a sample entry code, Add to calendar and the Can't make it link), on the waiting list, a place has opened up, and registration cancelled. Their links are samples, so nothing is registered or cancelled.`
                : testThankYou
                ? `Sends the thank-you of ${testFor?.title || 'this event'} to one address, exactly as guests who attended receive it, signed by the President. A test does not count as sent and changes nothing for guests.`
                : `Sends the reminders of ${testFor?.title || 'this event'} (2 weeks, 1 week and 3 days before, and the 24-hour note to registered members) to one address, exactly as members receive them. A test does not count as sent and changes nothing for members.`}
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
