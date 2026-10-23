import { useRef, useState } from 'react';
import { isMeetingLink, meetingLinkProblem, meetingPlatform } from '@/lib/event-place';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Loader2, Upload, Globe, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import {
  saveEvent, uploadEventPoster, EVENT_TYPE_LABELS, AUDIENCE_LABELS,
  DIVISION_REQUIRED_TYPES, CREATABLE_TYPES, listedOnWebsiteByDefault,
  type EventType, type RegistrationAudience,
} from '@/lib/events-api';
import { listExamSessions, examSessionOn, type ExamSession } from '@/lib/calendar-api';
import { useEffect } from 'react';
import { romeLocalToIso } from '@/lib/event-time';
import { useAccess } from '@/hooks/useAccess';
import { ALUMNI_CALL_ORGANISERS, alumniCallTitle } from '@/lib/alumni-call';
import { AlumniCallFields } from '@/components/admin/events/AlumniCallFields';
import { emptyAlumniDraft, alumniDraftProblem, alumniDraftPayload, type AlumniCallDraft } from '@/lib/alumni-call-draft';

// Only the five core research divisions organise events (Media and Operations
// do not; Operations events are association-wide, not divisional). An alumni
// call can also be organised by the Board.
const DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const ALUMNI_ORGANISERS = ALUMNI_CALL_ORGANISERS as readonly OrgDivision[];

export default function EventCreate() {
  const { session } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { canManage } = useAccess();

  // ===================================================================
  // WHO CREATES WHAT (Step 91).
  // -------------------------------------------------------------------
  // Whoever has Create Event creates every type, alumni calls included.
  // The Heads of Division and the Head of Asset Management plan alumni
  // calls and create no other kind of event: the page opens for them on
  // that one type. The server applies the same rule.
  // ===================================================================
  const alumniOnly = !canManage('events-create') && canManage('events-alumni-calls');
  const types: EventType[] = alumniOnly ? ['alumni_call'] : CREATABLE_TYPES;
  const firstType: EventType = alumniOnly ? 'alumni_call' : 'other';

  const [form, setForm] = useState({
    title: '', event_type: firstType as EventType, division: '' as OrgDivision | '',
    start_local: '', end_local: '', place: '', online: firstType === 'alumni_call',
    moderator: '', description: '', poster_url: '',
    registration_enabled: false, registration_audience: 'members' as RegistrationAudience, places: '',
    show_on_website: listedOnWebsiteByDefault(firstType),
  });
  const [guests, setGuests] = useState<string[]>(['']);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // An alumni call: its alumni and planning, and whether its date is known yet.
  const [alumni, setAlumni] = useState<AlumniCallDraft>(emptyAlumniDraft);
  const [dateTbc, setDateTbc] = useState(false);

  const isAlumniCall = form.event_type === 'alumni_call';
  const divisionRequired = DIVISION_REQUIRED_TYPES.includes(form.event_type);
  const organisers = isAlumniCall ? ALUMNI_ORGANISERS : DIVISIONS;
  // A call still to be confirmed has no time, no link yet, no website and no registrations.
  const tbc = isAlumniCall && dateTbc;
  const blankForm = (type: EventType) => ({
    title: '', event_type: type, division: '' as OrgDivision | '', start_local: '', end_local: '', place: '',
    online: type === 'alumni_call', moderator: '', description: '', poster_url: '', registration_enabled: false,
    registration_audience: 'members' as RegistrationAudience, places: '', show_on_website: listedOnWebsiteByDefault(type),
  });
  // The title follows the organiser until somebody types their own.
  const pickOrganiser = (division: OrgDivision) => setForm((f) => ({
    ...f,
    division,
    title: f.event_type === 'alumni_call' && (!f.title.trim() || f.title === alumniCallTitle(f.division || null)) ? alumniCallTitle(division) : f.title,
  }));

  // Exam session breaks: no event can be scheduled inside one (the database
  // enforces this too; the pre-check keeps the message friendly).
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  useEffect(() => { listExamSessions().then(setExamSessions).catch(() => {}); }, []);
  const examBreak = form.start_local ? examSessionOn(examSessions, form.start_local.slice(0, 10)) : undefined;

  const upload = async (file: File) => {
    setUploading(true);
    try { const url = await uploadEventPoster(file); setForm((f) => ({ ...f, poster_url: url })); toast({ title: 'Poster uploaded' }); }
    catch (e) { toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title.trim() || (!form.start_local && !tbc)) { toast({ title: tbc ? 'The title is required' : 'Title and start time are required', variant: 'destructive' }); return; }
    if (!form.online && !form.place.trim()) { toast({ title: 'Add a location (or mark the event online)', variant: 'destructive' }); return; }
    // An online event's link reaches registrants in their confirmation email,
    // so it is required; a call whose date is not fixed yet may add it later.
    const linkProblem = form.online && !(tbc && !form.place.trim()) ? meetingLinkProblem(form.place) : null;
    if (linkProblem) { toast({ title: 'Add the meeting link', description: linkProblem, variant: 'destructive' }); return; }
    if (divisionRequired && !form.division) {
      toast({ title: isAlumniCall ? 'Choose who organises the call' : 'Choose the organising division', description: isAlumniCall ? 'A research division or the Board.' : 'This event type requires a division.', variant: 'destructive' });
      return;
    }
    const alumniProblem = isAlumniCall ? alumniDraftProblem(alumni) : null;
    if (alumniProblem) { toast({ title: 'Check the alumni', description: alumniProblem, variant: 'destructive' }); return; }
    if (examBreak && !tbc) { toast({ title: 'Exam session break', description: `${examBreak.label}: the calendar does not accept events between ${examBreak.start_date} and ${examBreak.end_date}. Pick a date when the community can attend.`, variant: 'destructive' }); return; }
    const placesNumber = form.places.trim() ? Number(form.places) : null;
    if (form.registration_enabled && form.places.trim() && (!Number.isInteger(placesNumber) || (placesNumber ?? 0) < 1)) {
      toast({ title: 'Check the number of places', description: 'Use a whole number, or leave it empty for no limit.', variant: 'destructive' }); return;
    }
    // Typed on Rome's clock, whoever types it and wherever they are.
    const startAt = tbc ? null : romeLocalToIso(form.start_local);
    const endAt = !tbc && form.end_local ? romeLocalToIso(form.end_local) : null;
    if (!tbc && (!startAt || (form.end_local && !endAt))) { toast({ title: 'Check the start and end times', description: 'One of them could not be read. Pick the date and time again.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await saveEvent(session, {
        // A call still to be confirmed gets its provisional date from the server.
        title: form.title, date: tbc ? new Date().toISOString().slice(0, 10) : form.start_local.slice(0, 10),
        place: form.place.trim() || (form.online ? 'Online' : ''),
        moderator: form.moderator || null, guest: isAlumniCall ? null : guests.filter((g) => g.trim()), description: form.description || null,
        poster_url: form.poster_url || null, event_type: form.event_type, division: form.division || null,
        start_at: startAt, end_at: endAt,
        online: form.online, registration_enabled: form.registration_enabled && !tbc, registration_audience: form.registration_audience,
        // Empty is no limit, the default: the field is sent only when filled in.
        ...(form.registration_enabled && !tbc && placesNumber ? { capacity: placesNumber } : {}),
        // Every event is in the archive; whether it is PUBLIC is the one
        // choice, made here and changeable later from the archive. It used
        // not to be sent at all, so the server's default published every
        // new event, internal meetings included.
        in_archive: true,
        show_on_website: form.show_on_website && !tbc,
      }, isAlumniCall ? alumniDraftPayload(alumni, tbc) : undefined);
      toast(isAlumniCall
        ? { title: 'Alumni call created', description: tbc ? 'Find it in Event Archive, filtered by Alumni call, until its date is set.' : 'Find it in the Calendar and in Event Archive.' }
        : { title: 'Event created', description: 'Find it in the Calendar.' });
      setForm(blankForm(firstType));
      setGuests(['']);
      setAlumni(emptyAlumniDraft());
      setDateTbc(false);
    } catch (e) { toast({ title: 'Could not create event', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Create" description="Set up a new event and open its registration." />

      <div className="max-w-5xl space-y-5 font-body">
        <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guest talk: Markets outlook 2026" /></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5"><Label>Type</Label><HelpDot page="events-create" topic="types" /></span>
            {/* Every type is created here, alumni calls included (Step 91);
                a role that plans alumni calls only sees that one. */}
            <Select value={form.event_type} onValueChange={(v) => {
              const type = v as EventType;
              const keeps = (type === 'alumni_call' ? ALUMNI_ORGANISERS : DIVISIONS).includes(form.division as OrgDivision);
              setForm({
                ...form,
                event_type: type,
                division: DIVISION_REQUIRED_TYPES.includes(type) && keeps ? form.division : '',
                // The website choice follows the type's default until changed.
                show_on_website: listedOnWebsiteByDefault(type),
                // Alumni calls are usually online calls.
                online: type === 'alumni_call' ? true : form.online,
              });
              if (type !== 'alumni_call') setDateTbc(false);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {divisionRequired && (
            <div className="space-y-1">
              <Label>{isAlumniCall ? 'Organised by *' : 'Organising division *'}</Label>
              <Select value={form.division || undefined} onValueChange={(v) => pickOrganiser(v as OrgDivision)}>
                <SelectTrigger><SelectValue placeholder={isAlumniCall ? 'A division or the Board' : 'Select a division'} /></SelectTrigger>
                <SelectContent>{organisers.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {!tbc && <div className="space-y-1"><Label>Starts (Rome time) *</Label><Input type="datetime-local" value={form.start_local} onChange={(e) => setForm({ ...form, start_local: e.target.value })} /></div>}
          {!tbc && <div className="space-y-1"><Label>Ends (Rome time)</Label><Input type="datetime-local" value={form.end_local} onChange={(e) => setForm({ ...form, end_local: e.target.value })} /></div>}
        </div>

        {isAlumniCall && (
          <div className="border border-separator p-3 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Label htmlFor="date-tbc">Date to be confirmed</Label>
                <HelpDot page="events-create" topic="alumni-date" />
              </span>
              <Switch id="date-tbc" checked={dateTbc} onCheckedChange={setDateTbc} />
            </div>
            <p className="text-xs text-muted-foreground">
              {dateTbc
                ? 'Saved as a plan: it stays off the website, out of the Calendar, the Dashboard and Attendance, and takes no registrations until its date is set in Event Archive.'
                : 'The date, the time and the meeting link of an alumni call stay internal: the website lists the call without them.'}
            </p>
          </div>
        )}

        {examBreak && !tbc && (
          <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
            This date falls inside the exam session break "{examBreak.label}" ({examBreak.start_date} to {examBreak.end_date}).
            The calendar does not accept events during exam breaks; choose a date when the community can attend.
          </p>
        )}

        <div className="flex items-center justify-between border border-separator p-3">
          <Label htmlFor="online">Online event</Label>
          <Switch id="online" checked={form.online} onCheckedChange={(v) => setForm({ ...form, online: v })} />
        </div>
        <div className="space-y-1">
          <Label>{form.online ? 'Meeting link *' : 'Location *'}</Label>
          <Input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} inputMode={form.online ? 'url' : undefined}
            placeholder={form.online ? 'e.g. https://teams.microsoft.com/l/meetup-join/...' : 'e.g. Bocconi, Room AS01'} />
          {form.online && (
            <p className={`text-xs ${form.place.trim() && !isMeetingLink(form.place) ? 'text-destructive' : 'text-muted-foreground'}`}>
              {form.place.trim() && !isMeetingLink(form.place)
                ? 'Paste the full link, starting with https://.'
                : `Kept private${meetingPlatform(form.place) ? ` (${meetingPlatform(form.place)})` : ''}: only people registered get it, in their confirmation and in the day-before email, and on their Dashboard and My events. Everyone else sees "Online".`}
            </p>
          )}
        </div>

        <div className="space-y-1"><Label>Moderator (optional)</Label><Input value={form.moderator} onChange={(e) => setForm({ ...form, moderator: e.target.value })} placeholder="e.g. Jane Smith" /></div>

        {isAlumniCall ? (
          <div className="border border-separator p-3">
            <AlumniCallFields value={alumni} onChange={setAlumni} idPrefix="create-ac" />
          </div>
        ) : (
        <div className="space-y-2">
          <Label>Guests (optional)</Label>
          {guests.map((g, i) => (
            <div key={i} className="flex gap-2">
              <Input value={g} onChange={(e) => { const n = [...guests]; n[i] = e.target.value; setGuests(n); }} placeholder="e.g. John Doe, Portfolio Manager at BlackRock" />
              {guests.length > 1 && <Button type="button" variant="outline" size="icon" onClick={() => setGuests(guests.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setGuests([...guests, ''])}><Plus className="h-4 w-4 mr-2" />Add guest</Button>
        </div>
        )}

        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this event about? Who is it for? What will happen?" />
          {isAlumniCall && <p className="text-xs text-muted-foreground">Shown on the website. Keep the date and the time out of it: for an alumni call they stay internal.</p>}
        </div>

        <div className="space-y-2">
          <Label>Poster (optional)</Label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Upload poster</>}</Button>
            {form.poster_url && <span className="text-xs text-green-700">Poster attached</span>}
          </div>
        </div>

        <div className="border border-separator p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="reg">Collect registrations</Label>
            <Switch id="reg" checked={form.registration_enabled && !tbc} disabled={tbc} onCheckedChange={(v) => setForm({ ...form, registration_enabled: v })} />
          </div>
          {tbc && <p className="text-xs text-muted-foreground">Registrations open once the date is set.</p>}
          {form.registration_enabled && !tbc && (
            <div className="space-y-1">
              <Label>Who can register</Label>
              <Select value={form.registration_audience} onValueChange={(v) => setForm({ ...form, registration_audience: v as RegistrationAudience })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(AUDIENCE_LABELS) as RegistrationAudience[]).map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {form.registration_enabled && !tbc && (
            <div className="space-y-1">
              <Label htmlFor="places" className="inline-flex items-center gap-1.5">Places <HelpDot page="events-forms" topic="places" /></Label>
              <Input id="places" type="number" inputMode="numeric" min={1} step={1} className="w-40" value={form.places}
                onChange={(e) => setForm({ ...form, places: e.target.value })} placeholder="No limit" />
              <p className="text-xs text-muted-foreground">Leave empty for no limit. With a number, people who register once it is full join a waiting list, and take a place as soon as one frees up.</p>
            </div>
          )}
        </div>

        {/* Website choice. Every event is recorded in Events > Event Archive;
            this decides only whether it is also listed on the public Events
            page. Meetings and online calls start unlisted, everything else
            listed, and either can be changed now or later in the archive. */}
        <div className="border border-separator p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent" />
              <Label htmlFor="on-website">Show on the public website</Label>
            </span>
            <Switch id="on-website" checked={form.show_on_website && !tbc} disabled={tbc} onCheckedChange={(v) => setForm({ ...form, show_on_website: v })} />
          </div>
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {tbc
                ? 'A call whose date is still to be confirmed stays off the website. Set its date in Event Archive, then list it.'
                : isAlumniCall
                  ? form.show_on_website
                    ? 'This call will be listed on the public Events page and, with a poster, on the Alumni page, without its date, its time or its link. It is also recorded in Events > Event Archive, where this can be changed at any time.'
                    : 'This call will not be listed on the public website. It is still recorded in Events > Event Archive, appears in the Calendar and can collect registrations.'
                  : form.show_on_website
                    ? 'This event will be listed on the public Events page of minervaims.org. It is also recorded in Events > Event Archive, where this can be changed at any time.'
                    : 'This event will not be listed on the public website. It is still recorded in Events > Event Archive, appears in the Calendar and can collect registrations.'}
            </span>
          </p>
        </div>

        <Button onClick={submit} disabled={saving || uploading}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating</> : isAlumniCall ? 'Create alumni call' : 'Create event'}</Button>
      </div>
    </div>
  );
}
