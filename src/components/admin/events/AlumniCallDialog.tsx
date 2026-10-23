import { useEffect, useRef, useState } from 'react';
import { Globe, Info, Loader2, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { AlumniCallFields } from '@/components/admin/events/AlumniCallFields';
import { ALUMNI_CALL_ORGANISERS, ALUMNI_CALL_STATUS_LABELS } from '@/lib/alumni-call';
import { alumniDraftPayload, alumniDraftProblem, draftFromPlan, emptyAlumniDraft, type AlumniCallDraft } from '@/lib/alumni-call-draft';
import {
  AUDIENCE_LABELS, fetchJoinLinks, listAlumniCallPlans, saveEvent, uploadEventPoster,
  type EventRow, type RegistrationAudience,
} from '@/lib/events-api';
import { meetingLinkProblem } from '@/lib/event-place';
import { formatEventWhen, isoToRomeLocal, romeLocalToIso } from '@/lib/event-time';
import { divisionLabels, type OrgDivision } from '@/lib/roles';

// =====================================================================
// AN ALUMNI CALL'S OWN WINDOW, in Event Archive (Step 91).
// ---------------------------------------------------------------------
// What Events > Alumni Calls used to hold for a call now lives here,
// beside the event itself: where it stands (planned, invited, accepted,
// completed, declined), the alumni, the responsible person and the
// internal notes, together with everything any event has (title,
// organiser, time, online or in person, poster, registration, website).
//
// A call saved with its date to be confirmed is set here: switching the
// date on asks for the time (and, online, the link), and from then on it
// is an event like any other, in the Calendar and in Attendance.
//
// Opened by anybody who can see the archive; only those who may change
// alumni calls get a Save button. The page around it may be read-only for
// them (the Heads of Division read the archive), so the editable part is
// marked `data-ro-allow`, and the server checks it again.
// =====================================================================

const ORGANISERS = ALUMNI_CALL_ORGANISERS as readonly OrgDivision[];

export function AlumniCallDialog({ event, canEdit, onOpenChange, onSaved }: {
  event: EventRow | null;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const posterRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<AlumniCallDraft>(emptyAlumniDraft);
  const [addedBy, setAddedBy] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', division: '' as OrgDivision | '', dateTbc: false, start_local: '', end_local: '',
    online: true, place: '', description: '', poster_url: '',
    registration_enabled: false, registration_audience: 'members' as RegistrationAudience, places: '', placesTouched: false,
    show_on_website: false,
  });

  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title,
      division: (event.division as OrgDivision | null) ?? '',
      dateTbc: !!event.date_tbc,
      start_local: event.date_tbc ? '' : event.start_at ? isoToRomeLocal(event.start_at) : `${event.date}T18:00`,
      end_local: event.date_tbc || !event.end_at ? '' : isoToRomeLocal(event.end_at),
      online: event.online,
      place: event.online ? '' : event.place,
      description: event.description ?? '',
      poster_url: event.poster_url ?? '',
      registration_enabled: event.registration_enabled,
      registration_audience: event.registration_audience,
      places: event.capacity ? String(event.capacity) : '',
      placesTouched: false,
      show_on_website: event.show_on_website,
    });
    setLoading(true);
    listAlumniCallPlans([event.id])
      .then((plans) => { setDraft(draftFromPlan(plans[event.id])); setAddedBy(plans[event.id]?.added_by_name ?? null); })
      .catch((e) => toast({ title: 'Could not read the planning of this call', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }))
      .finally(() => setLoading(false));
    // The meeting link is kept apart from the public place.
    if (event.online && canEdit) {
      fetchJoinLinks(session, [event.id])
        .then((links) => { const link = links[event.id]; if (link) setForm((f) => (f.place ? f : { ...f, place: link })); })
        .catch(() => { /* the field stays empty, and saving keeps the link */ });
    }
  }, [event, canEdit, session, toast]);

  const tbc = form.dateTbc;

  const upload = async (file: File) => {
    setUploading(true);
    try { const url = await uploadEventPoster(file); setForm((f) => ({ ...f, poster_url: url })); toast({ title: 'Poster uploaded' }); }
    catch (e) { toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); if (posterRef.current) posterRef.current.value = ''; }
  };

  const save = async () => {
    if (!event) return;
    if (!form.title.trim()) { toast({ title: 'The title is required', variant: 'destructive' }); return; }
    if (!form.division) { toast({ title: 'Choose who organises the call', description: 'A research division or the Board.', variant: 'destructive' }); return; }
    if (!tbc && !form.start_local) { toast({ title: 'Set the start', description: 'Or switch on Date to be confirmed.', variant: 'destructive' }); return; }
    if (!form.online && !form.place.trim()) { toast({ title: 'Add a location (or mark the call online)', variant: 'destructive' }); return; }
    // Online, the link is needed once the date is set; a link already saved stays when the field is left empty.
    const linkProblem = form.online && !tbc && form.place.trim() ? meetingLinkProblem(form.place) : null;
    if (linkProblem) { toast({ title: 'Check the meeting link', description: linkProblem, variant: 'destructive' }); return; }
    const problem = alumniDraftProblem(draft);
    if (problem) { toast({ title: 'Check the alumni', description: problem, variant: 'destructive' }); return; }
    const startAt = tbc ? null : romeLocalToIso(form.start_local);
    const endAt = !tbc && form.end_local ? romeLocalToIso(form.end_local) : null;
    if (!tbc && (!startAt || (form.end_local && !endAt))) { toast({ title: 'Check the start and end times', variant: 'destructive' }); return; }
    const places = form.places.trim() ? Number(form.places) : null;
    if (form.placesTouched && places !== null && (!Number.isInteger(places) || places < 1)) {
      toast({ title: 'Check the number of places', description: 'Use a whole number, or leave it empty for no limit.', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      await saveEvent(session, {
        id: event.id,
        title: form.title.trim(),
        date: tbc ? event.date : form.start_local.slice(0, 10),
        // Online with the field left empty: "Online", and the saved link stays.
        place: form.online ? (form.place.trim() || 'Online') : form.place.trim(),
        moderator: event.moderator ?? null,
        guest: null,
        description: form.description.trim() || null,
        poster_url: form.poster_url || null,
        event_type: 'alumni_call',
        division: form.division,
        start_at: startAt,
        end_at: endAt,
        online: form.online,
        registration_enabled: form.registration_enabled && !tbc,
        registration_audience: form.registration_audience,
        show_on_website: form.show_on_website && !tbc,
        in_archive: event.in_archive ?? true,
        ...(form.placesTouched ? { capacity: places } : {}),
      }, alumniDraftPayload(draft, tbc));
      toast({ title: 'Alumni call saved' });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Could not save the call', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className="space-y-5 font-body">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="acd-title">Title *</Label>
          <Input id="acd-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Organised by *</Label>
          <Select value={form.division || undefined} onValueChange={(v) => setForm({ ...form, division: v as OrgDivision })}>
            <SelectTrigger><SelectValue placeholder="A division or the Board" /></SelectTrigger>
            <SelectContent>{ORGANISERS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5"><Label htmlFor="acd-tbc">Date to be confirmed</Label><HelpDot page="events-create" topic="alumni-date" /></span>
          <div className="flex h-10 items-center"><Switch id="acd-tbc" checked={tbc} onCheckedChange={(v) => setForm({ ...form, dateTbc: v })} /></div>
        </div>
        {!tbc && (
          <>
            <div className="space-y-1"><Label htmlFor="acd-start">Starts (Rome time) *</Label><Input id="acd-start" type="datetime-local" value={form.start_local} onChange={(e) => setForm({ ...form, start_local: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="acd-end">Ends (Rome time)</Label><Input id="acd-end" type="datetime-local" value={form.end_local} onChange={(e) => setForm({ ...form, end_local: e.target.value })} /></div>
          </>
        )}
      </div>

      <div className="border border-separator p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="acd-online">Online call</Label>
          <Switch id="acd-online" checked={form.online} onCheckedChange={(v) => setForm({ ...form, online: v })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="acd-place">{form.online ? (tbc ? 'Meeting link' : 'Meeting link *') : 'Location *'}</Label>
          <Input id="acd-place" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} inputMode={form.online ? 'url' : undefined}
            placeholder={form.online ? 'https://teams.microsoft.com/l/meetup-join/...' : 'e.g. Bocconi, Room AS01'} />
          {form.online && <p className="text-xs text-muted-foreground">Kept private: only people registered receive it. {tbc ? 'It can be added once the date is set.' : ''}</p>}
        </div>
      </div>

      <div className="border border-separator p-3">
        {loading ? <p className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Reading the alumni of this call</p>
          : <AlumniCallFields value={draft} onChange={setDraft} idPrefix="acd" />}
      </div>

      <div className="space-y-1">
        <Label htmlFor="acd-desc">Description</Label>
        <Textarea id="acd-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <p className="text-xs text-muted-foreground">Shown on the website. Keep the date and the time out of it: for an alumni call they stay internal.</p>
      </div>

      <div className="space-y-2">
        <Label>Poster</Label>
        <input ref={posterRef} type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => posterRef.current?.click()}>
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />{form.poster_url ? 'Replace poster' : 'Upload poster'}</>}
          </Button>
          {form.poster_url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, poster_url: '' })}><X className="h-4 w-4 mr-2" />Remove</Button>
          )}
        </div>
        {form.poster_url && !form.poster_url.toLowerCase().endsWith('.pdf') && (
          <img src={form.poster_url} alt="" className="block h-28 w-auto border border-separator object-contain bg-muted" />
        )}
      </div>

      <div className="border border-separator p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="acd-reg">Collect registrations</Label>
          <Switch id="acd-reg" checked={form.registration_enabled && !tbc} disabled={tbc} onCheckedChange={(v) => setForm({ ...form, registration_enabled: v })} />
        </div>
        {tbc && <p className="text-xs text-muted-foreground">Registrations open once the date is set.</p>}
        {form.registration_enabled && !tbc && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Who can register</Label>
              <Select value={form.registration_audience} onValueChange={(v) => setForm({ ...form, registration_audience: v as RegistrationAudience })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(AUDIENCE_LABELS) as RegistrationAudience[]).map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="acd-places">Places</Label>
              <Input id="acd-places" type="number" inputMode="numeric" min={1} step={1} value={form.places} placeholder="No limit"
                onChange={(e) => setForm({ ...form, places: e.target.value, placesTouched: true })} />
            </div>
          </div>
        )}
      </div>

      <div className="border border-separator p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2"><Globe className="h-4 w-4 text-accent" /><Label htmlFor="acd-web">Show on the public website</Label></span>
          <Switch id="acd-web" checked={form.show_on_website && !tbc} disabled={tbc} onCheckedChange={(v) => setForm({ ...form, show_on_website: v })} />
        </div>
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {tbc
              ? 'A call whose date is still to be confirmed stays off the website.'
              : 'Listed on the public Events page and, with a poster, on the Alumni page, without its date, its time or its link.'}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={!!event} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="w-[min(96vw,48rem)] max-w-[min(96vw,48rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="font-serif">{event?.title || 'Alumni call'}</DialogTitle>
          <DialogDescription className="font-body">
            {event?.date_tbc ? 'Date to be confirmed' : event ? formatEventWhen(event, { weekday: false }) : ''}
            {' · '}{ALUMNI_CALL_STATUS_LABELS[draft.status]}
            {addedBy ? ` · added by ${addedBy}` : ''}
          </DialogDescription>
        </DialogHeader>
        {canEdit ? (
          <div data-ro-allow>
            {body}
            <div className="flex gap-3 pt-5">
              <Button className="flex-1" onClick={save} disabled={saving || uploading || loading}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save alumni call'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        ) : (
          <fieldset disabled className="opacity-90">{body}</fieldset>
        )}
      </DialogContent>
    </Dialog>
  );
}
